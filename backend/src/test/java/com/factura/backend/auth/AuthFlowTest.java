package com.factura.backend.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

import com.factura.backend.TestcontainersConfiguration;

import jakarta.servlet.http.Cookie;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@ExtendWith(OutputCaptureExtension.class)
class AuthFlowTest {

	private static final String PASSWORD = "S3cretPassw0rd";

	@Autowired
	MockMvc mvc;
	@Autowired
	JdbcTemplate jdbc;
	@Autowired
	JsonMapper jsonMapper;

	private static String email() {
		return "user-" + UUID.randomUUID() + "@x.com";
	}

	private MvcResult register(String email) throws Exception {
		String body = jsonMapper.writeValueAsString(java.util.Map.of("firstName", "Ana", "lastName", "Pérez",
				"email", email, "password", PASSWORD, "confirmPassword", PASSWORD));
		return mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(body))
				.andReturn();
	}

	private ResultActions login(String email, String password) throws Exception {
		String body = jsonMapper.writeValueAsString(java.util.Map.of("email", email, "password", password));
		return mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(body));
	}

	private ResultActions refresh(String token) throws Exception {
		return mvc.perform(post("/api/auth/refresh").cookie(new Cookie("refresh_token", token)));
	}

	private static String cookieValue(MvcResult r) {
		String header = r.getResponse().getHeader(HttpHeaders.SET_COOKIE);
		assertThat(header).isNotNull().startsWith("refresh_token=");
		return header.substring("refresh_token=".length(), header.indexOf(';'));
	}

	private JsonNode body(MvcResult r) throws Exception {
		return jsonMapper.readTree(r.getResponse().getContentAsString());
	}

	private int activeTokens(String email) {
		return jdbc.queryForObject("""
				select count(*) from refresh_tokens t join users u on u.id = t.user_id
				where u.email = ? and t.revoked_at is null""", Integer.class, email);
	}

	@Test
	void registerRefreshReuseFlow() throws Exception {
		String email = email();
		MvcResult reg = register(email);
		assertThat(reg.getResponse().getStatus()).isEqualTo(201);
		String t1 = cookieValue(reg);
		assertThat(reg.getResponse().getHeader(HttpHeaders.SET_COOKIE))
				.contains("HttpOnly", "Secure", "SameSite=Strict", "Path=/api/auth", "Max-Age=604800");

		MvcResult r2 = refresh(t1).andExpect(status().isOk()).andExpect(jsonPath("$.user.email").value(email))
				.andReturn();
		String t2 = cookieValue(r2);
		assertThat(t2).isNotEqualTo(t1);

		// same family and session_start, old one revoked
		List<String> families = jdbc.queryForList(
				"select distinct family_id::text from refresh_tokens t join users u on u.id = t.user_id where u.email = ?",
				String.class, email);
		assertThat(families).hasSize(1);
		Integer sessionStarts = jdbc.queryForObject("""
				select count(distinct session_start) from refresh_tokens t join users u on u.id = t.user_id
				where u.email = ?""", Integer.class, email);
		assertThat(sessionStarts).isEqualTo(1);
		assertThat(activeTokens(email)).isEqualTo(1);

		// reuse of the old token: 401, cookie cleared, family revoked
		MvcResult reuse = refresh(t1).andExpect(status().isUnauthorized()).andReturn();
		assertThat(reuse.getResponse().getHeader(HttpHeaders.SET_COOKIE)).contains("Max-Age=0");
		assertThat(activeTokens(email)).isZero();

		// the legitimate new token no longer works
		refresh(t2).andExpect(status().isUnauthorized());
	}

	@Test
	void loginLogoutAndFamilies() throws Exception {
		String email = email();
		register(email);

		String a = cookieValue(login(email, PASSWORD).andExpect(status().isOk()).andReturn());
		String b = cookieValue(login(email, PASSWORD).andExpect(status().isOk()).andReturn());

		mvc.perform(post("/api/auth/logout").cookie(new Cookie("refresh_token", a))).andExpect(status().isNoContent());

		refresh(a).andExpect(status().isUnauthorized());
		refresh(b).andExpect(status().isOk());
	}

	@Test
	void logoutIsIdempotent() throws Exception {
		mvc.perform(post("/api/auth/logout")).andExpect(status().isNoContent());
		mvc.perform(post("/api/auth/logout").cookie(new Cookie("refresh_token", "unknown")))
				.andExpect(status().isNoContent());
	}

	@Test
	void refreshWithoutOrUnknownCookieIs401() throws Exception {
		mvc.perform(post("/api/auth/refresh")).andExpect(status().isUnauthorized());
		refresh("unknown-token").andExpect(status().isUnauthorized());
	}

	@Test
	void emailIsCaseSensitive() throws Exception {
		String lower = "case-" + UUID.randomUUID() + "@x.com";
		assertThat(register(lower).getResponse().getStatus()).isEqualTo(201);

		login(lower.replaceFirst("case", "CASE"), PASSWORD).andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.detail").value("Email o contraseña incorrectos"));
		// "a@x.com" and "A@x.com" are different accounts
		String upper = lower.toUpperCase();
		assertThat(register(upper).getResponse().getStatus()).isEqualTo(201);
		assertThat(register(upper).getResponse().getStatus()).isEqualTo(409);
	}

	@Test
	void wrongPasswordAndUnknownEmailGiveSameError() throws Exception {
		String email = email();
		register(email);

		login(email, "wrong-password1").andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.detail").value("Email o contraseña incorrectos"));
		login(email(), PASSWORD).andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.detail").value("Email o contraseña incorrectos"));
	}

	@Test
	void disabledUserCannotLoginNorRefresh() throws Exception {
		String email = email();
		String token = cookieValue(register(email));
		jdbc.update("update users set enabled = false where email = ?", email);

		login(email, PASSWORD).andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.detail").value("Email o contraseña incorrectos"));
		refresh(token).andExpect(status().isUnauthorized());
	}

	@Test
	void longMultibytePasswordLoginDoesNotBlowUp() throws Exception {
		String email = email();
		register(email);
		String huge = "😀".repeat(60);

		login(email, huge).andExpect(status().isUnauthorized());
	}

	@Test
	void multibytePasswordOverBcryptLimitIs400OnRegister() throws Exception {
		String p = "😀".repeat(20) + "a1";
		String body = jsonMapper.writeValueAsString(java.util.Map.of("firstName", "Ana", "lastName", "P",
				"email", email(), "password", p, "confirmPassword", p));
		mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(body))
				.andExpect(status().isBadRequest());
	}

	@Test
	void concurrentRefreshWithSameTokenOnlyOneWins() throws Exception {
		String email = email();
		String token = cookieValue(register(email));

		ExecutorService pool = Executors.newFixedThreadPool(2);
		try {
			Callable<Integer> call = () -> refresh(token).andReturn().getResponse().getStatus();
			Future<Integer> f1 = pool.submit(call);
			Future<Integer> f2 = pool.submit(call);
			List<Integer> statuses = List.of(f1.get(), f2.get());
			assertThat(statuses).containsExactlyInAnyOrder(200, 401);
		} finally {
			pool.shutdownNow();
		}
	}

	@Test
	void storesHashesOnly(CapturedOutput output) throws Exception {
		String email = email();
		MvcResult reg = register(email);
		String registerRefresh = cookieValue(reg);
		String registerAccess = body(reg).get("accessToken").asString();
		MvcResult lg = login(email, PASSWORD).andReturn();
		String loginRefresh = cookieValue(lg);
		String loginAccess = body(lg).get("accessToken").asString();
		MvcResult rf = refresh(loginRefresh).andReturn();
		String refreshed = cookieValue(rf);
		String refreshedAccess = body(rf).get("accessToken").asString();

		String hash = jdbc.queryForObject("select password_hash from users where email = ?", String.class, email);
		assertThat(hash).startsWith("$2").isNotEqualTo(PASSWORD);
		List<String> stored = jdbc.queryForList("""
				select token_hash from refresh_tokens t join users u on u.id = t.user_id where u.email = ?""",
				String.class, email);
		assertThat(stored).hasSize(3).doesNotContain(registerRefresh, loginRefresh, refreshed);
		assertThat(stored).allSatisfy(h -> assertThat(h).hasSize(64).matches("[0-9a-f]{64}"));

		String logs = output.getAll();
		for (String secret : new String[] { PASSWORD, registerRefresh, loginRefresh, refreshed, registerAccess,
				loginAccess, refreshedAccess }) {
			assertThat(logs).doesNotContain(secret);
		}
	}
}
