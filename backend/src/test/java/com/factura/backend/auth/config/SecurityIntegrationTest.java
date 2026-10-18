package com.factura.backend.auth.config;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import com.factura.backend.TestcontainersConfiguration;
import com.factura.backend.auth.service.JwtService;
import com.factura.backend.common.config.AuthProperties;
import com.factura.backend.user.entity.Role;
import com.factura.backend.user.entity.User;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class SecurityIntegrationTest {

	@Autowired
	MockMvc mvc;
	@Autowired
	JwtService jwtService;
	@Autowired
	AuthProperties properties;

	private static User user() {
		User u = new User();
		u.setId(1L);
		u.setRole(Role.USER);
		return u;
	}

	@Test
	void protectedRouteWithoutTokenIs401ProblemDetail() throws Exception {
		mvc.perform(get("/api/anything"))
				.andExpect(status().isUnauthorized())
				.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
				.andExpect(jsonPath("$.detail").value("No autenticado"))
				.andExpect(jsonPath("$.status").value(401))
				.andExpect(jsonPath("$.instance").value("/api/anything"));
	}

	@Test
	void protectedRouteWithGarbageTokenIs401() throws Exception {
		mvc.perform(get("/api/anything").header(HttpHeaders.AUTHORIZATION, "Bearer not-a-jwt"))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.detail").value("No autenticado"));
	}

	@Test
	void validTokenPassesSecurity() throws Exception {
		String token = jwtService.generateAccessToken(user());

		mvc.perform(get("/api/anything").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isNotFound());
	}

	@Test
	void expiredTokenIs401() throws Exception {
		Clock past = Clock.fixed(Instant.now().minus(Duration.ofHours(1)), ZoneOffset.UTC);
		String token = new JwtService(properties, past).generateAccessToken(user());

		mvc.perform(get("/api/anything").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.detail").value("No autenticado"));
	}

	@Test
	void apiDocsArePublic() throws Exception {
		mvc.perform(get("/v3/api-docs")).andExpect(status().isOk());
	}

	@Test
	void healthIsPublic() throws Exception {
		mvc.perform(get("/actuator/health")).andExpect(status().isOk());
	}
}
