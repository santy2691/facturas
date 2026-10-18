package com.factura.backend.auth.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.factura.backend.auth.config.SecurityConfig;
import com.factura.backend.auth.dto.AuthResponse;
import com.factura.backend.auth.dto.UserResponse;
import com.factura.backend.auth.service.AuthService;
import com.factura.backend.auth.service.AuthService.AuthResult;
import com.factura.backend.common.config.AuthProperties;
import com.factura.backend.common.error.EmailAlreadyExistsException;
import com.factura.backend.common.error.GlobalExceptionHandler;
import com.factura.backend.common.error.InvalidCredentialsException;
import com.factura.backend.common.error.InvalidRefreshTokenException;
import com.factura.backend.common.error.ProblemDetailAuthenticationEntryPoint;
import com.factura.backend.user.entity.Role;

import jakarta.servlet.http.Cookie;

@WebMvcTest(AuthController.class)
@Import({ SecurityConfig.class, GlobalExceptionHandler.class, ProblemDetailAuthenticationEntryPoint.class,
		RefreshTokenCookie.class, AuthControllerTest.Props.class })
class AuthControllerTest {

	@TestConfiguration
	@EnableConfigurationProperties(AuthProperties.class)
	static class Props {
	}

	private static final String REGISTER_BODY = """
			{"firstName":"Ana","lastName":"Pérez","email":"ana@x.com","password":"abcdefg1","confirmPassword":"abcdefg1"}""";

	@Autowired
	MockMvc mvc;
	@MockitoBean
	AuthService authService;

	private static AuthResult result() {
		return new AuthResult(new AuthResponse("access-jwt", 900,
				new UserResponse(1L, "Ana", "Pérez", "ana@x.com", Role.USER)), "raw-refresh");
	}

	private static void assertSetCookie(MvcResult r, String value, String maxAge) {
		String cookie = r.getResponse().getHeader(HttpHeaders.SET_COOKIE);
		assertThat(cookie).startsWith("refresh_token=" + value)
				.contains("HttpOnly", "Secure", "SameSite=Strict", "Path=/api/auth", "Max-Age=" + maxAge);
	}

	@Test
	void registerReturns201WithCookieAndBody() throws Exception {
		when(authService.register(any())).thenReturn(result());

		MvcResult r = mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(REGISTER_BODY))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.accessToken").value("access-jwt"))
				.andExpect(jsonPath("$.expiresIn").value(900))
				.andExpect(jsonPath("$.user.id").value(1))
				.andExpect(jsonPath("$.user.firstName").value("Ana"))
				.andExpect(jsonPath("$.user.lastName").value("Pérez"))
				.andExpect(jsonPath("$.user.email").value("ana@x.com"))
				.andExpect(jsonPath("$.user.role").value("USER"))
				.andReturn();
		assertSetCookie(r, "raw-refresh", "604800");
	}

	@Test
	void registerValidationReturns400WithErrors() throws Exception {
		String body = """
				{"firstName":" ","lastName":"P","email":"ana@x.com","password":"abcdefg1","confirmPassword":"other"}""";
		mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(body))
				.andExpect(status().isBadRequest())
				.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
				.andExpect(jsonPath("$.detail").value("Hay errores en el formulario"))
				.andExpect(jsonPath("$.errors[?(@.field=='firstName')].message").value("El nombre es obligatorio"))
				.andExpect(jsonPath("$.errors[?(@.field=='confirmPassword')].message")
						.value("Las contraseñas no coinciden"));
	}

	@Test
	void registerDuplicateReturns409() throws Exception {
		when(authService.register(any())).thenThrow(new EmailAlreadyExistsException());

		mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(REGISTER_BODY))
				.andExpect(status().isConflict())
				.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
				.andExpect(jsonPath("$.detail").value("Ya existe una cuenta con este email"));
	}

	@Test
	void loginReturns200WithCookie() throws Exception {
		when(authService.login(any())).thenReturn(result());

		MvcResult r = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
				.content("{\"email\":\"ana@x.com\",\"password\":\"abcdefg1\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.accessToken").value("access-jwt"))
				.andReturn();
		assertSetCookie(r, "raw-refresh", "604800");
	}

	@Test
	void loginMissingFieldsReturns400() throws Exception {
		mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content("{}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors[?(@.field=='email')].message").value("El email es obligatorio"))
				.andExpect(jsonPath("$.errors[?(@.field=='password')].message").value("La contraseña es obligatoria"));
	}

	@Test
	void loginInvalidCredentialsReturns401() throws Exception {
		when(authService.login(any())).thenThrow(new InvalidCredentialsException());

		mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
				.content("{\"email\":\"ana@x.com\",\"password\":\"bad\"}"))
				.andExpect(status().isUnauthorized())
				.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
				.andExpect(jsonPath("$.detail").value("Email o contraseña incorrectos"));
	}

	@Test
	void refreshWithCookieReturns200AndNewCookie() throws Exception {
		when(authService.refresh("old")).thenReturn(result());

		MvcResult r = mvc.perform(post("/api/auth/refresh").cookie(new Cookie("refresh_token", "old")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.user.firstName").value("Ana"))
				.andReturn();
		assertSetCookie(r, "raw-refresh", "604800");
	}

	@Test
	void refreshWithoutCookieReturns401AndClearsCookie() throws Exception {
		when(authService.refresh(null)).thenThrow(new InvalidRefreshTokenException());

		MvcResult r = mvc.perform(post("/api/auth/refresh"))
				.andExpect(status().isUnauthorized())
				.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
				.andExpect(jsonPath("$.detail").value("La sesión ha caducado. Inicia sesión de nuevo"))
				.andReturn();
		assertSetCookie(r, "", "0");
	}

	@Test
	void logoutReturns204AndClearsCookie() throws Exception {
		MvcResult r = mvc.perform(post("/api/auth/logout").cookie(new Cookie("refresh_token", "raw")))
				.andExpect(status().isNoContent())
				.andReturn();
		assertSetCookie(r, "", "0");
		verify(authService).logout("raw");
	}

	@Test
	void logoutWithoutCookieIsStill204() throws Exception {
		mvc.perform(post("/api/auth/logout")).andExpect(status().isNoContent());
		verify(authService).logout(null);
	}
}
