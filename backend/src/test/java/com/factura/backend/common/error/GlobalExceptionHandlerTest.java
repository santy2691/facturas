package com.factura.backend.common.error;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

@WebMvcTest(controllers = GlobalExceptionHandlerTest.ThrowingController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import({ GlobalExceptionHandler.class, GlobalExceptionHandlerTest.ThrowingController.class })
class GlobalExceptionHandlerTest {

	record Body(@NotBlank(message = "El campo es obligatorio") String name) {
	}

	@RestController
	static class ThrowingController {
		@GetMapping("/test/conflict")
		void conflict() {
			throw new EmailAlreadyExistsException();
		}

		@GetMapping("/test/credentials")
		void credentials() {
			throw new InvalidCredentialsException();
		}

		@GetMapping("/test/refresh")
		void refresh() {
			throw new InvalidRefreshTokenException();
		}

		@GetMapping("/test/boom")
		void boom() {
			throw new IllegalStateException("secret internal detail");
		}

		@PostMapping("/test/validate")
		void validate(@Valid @RequestBody Body body) {
		}
	}

	@Autowired
	MockMvc mvc;

	@Test
	void conflictIs409() throws Exception {
		mvc.perform(get("/test/conflict"))
				.andExpect(status().isConflict())
				.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
				.andExpect(jsonPath("$.detail").value("Ya existe una cuenta con este email"))
				.andExpect(jsonPath("$.status").value(409))
				.andExpect(jsonPath("$.instance").value("/test/conflict"));
	}

	@Test
	void invalidCredentialsIs401() throws Exception {
		mvc.perform(get("/test/credentials"))
				.andExpect(status().isUnauthorized())
				.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
				.andExpect(jsonPath("$.detail").value("Email o contraseña incorrectos"));
	}

	@Test
	void invalidRefreshTokenIs401() throws Exception {
		mvc.perform(get("/test/refresh"))
				.andExpect(status().isUnauthorized())
				.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
				.andExpect(jsonPath("$.detail").value("La sesión ha caducado. Inicia sesión de nuevo"));
	}

	@Test
	void validationIs400WithErrors() throws Exception {
		mvc.perform(post("/test/validate").contentType(MediaType.APPLICATION_JSON).content("{\"name\":\" \"}"))
				.andExpect(status().isBadRequest())
				.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
				.andExpect(jsonPath("$.detail").value("Hay errores en el formulario"))
				.andExpect(jsonPath("$.errors[0].field").value("name"))
				.andExpect(jsonPath("$.errors[0].message").value("El campo es obligatorio"));
	}

	@Test
	void unreadableBodyIs400() throws Exception {
		mvc.perform(post("/test/validate").contentType(MediaType.APPLICATION_JSON).content("{not json"))
				.andExpect(status().isBadRequest())
				.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
				.andExpect(jsonPath("$.detail").value("Petición mal formada"));
	}

	@Test
	void unexpectedIs500WithoutLeakingDetails() throws Exception {
		mvc.perform(get("/test/boom"))
				.andExpect(status().isInternalServerError())
				.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
				.andExpect(jsonPath("$.detail").value("Error interno"));
	}

	@Test
	void unknownRouteIs404NotFiveHundred() throws Exception {
		mvc.perform(get("/test/nope")).andExpect(status().isNotFound());
	}
}
