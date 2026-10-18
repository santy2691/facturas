package com.factura.backend.auth.dto;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;

class RegisterRequestValidationTest {

	private static final String PASSWORD_RULE = "La contraseña debe tener al menos 8 caracteres, una letra y un número";

	private static ValidatorFactory factory;
	private static Validator validator;

	@BeforeAll
	static void init() {
		factory = Validation.buildDefaultValidatorFactory();
		validator = factory.getValidator();
	}

	@AfterAll
	static void close() {
		factory.close();
	}

	private static RegisterRequest valid() {
		return new RegisterRequest("Ana", "Pérez", "ana@x.com", "abcdefg1", "abcdefg1");
	}

	private static List<String> messages(RegisterRequest r, String field) {
		Set<ConstraintViolation<RegisterRequest>> v = validator.validate(r);
		return v.stream().filter(c -> c.getPropertyPath().toString().equals(field))
				.map(ConstraintViolation::getMessage).toList();
	}

	private static RegisterRequest withPassword(String p) {
		return new RegisterRequest("Ana", "Pérez", "ana@x.com", p, p);
	}

	@Test
	void validRequestHasNoViolations() {
		assertThat(validator.validate(valid())).isEmpty();
	}

	@Test
	void passwordLengthBoundaries() {
		assertThat(messages(withPassword("abcde1x".substring(0, 6) + "1"), "password")).containsExactly(PASSWORD_RULE); // 7
		assertThat(messages(withPassword("abcdefg1"), "password")).isEmpty(); // 8
		assertThat(messages(withPassword("a".repeat(63) + "1"), "password")).isEmpty(); // 64
		assertThat(messages(withPassword("a".repeat(64) + "1"), "password"))
				.containsExactly("La contraseña no puede superar 64 caracteres"); // 65
	}

	@Test
	void passwordNeedsLetterAndNumber() {
		assertThat(messages(withPassword("abcdefgh"), "password")).containsExactly(PASSWORD_RULE);
		assertThat(messages(withPassword("12345678"), "password")).containsExactly(PASSWORD_RULE);
		assertThat(messages(withPassword("abc123"), "password")).containsExactly(PASSWORD_RULE);
	}

	@Test
	void passwordAcceptsNonAsciiLetterAndSpaces() {
		assertThat(messages(withPassword("contraseña1"), "password")).isEmpty();
		assertThat(messages(withPassword("pass word 1"), "password")).isEmpty();
	}

	@Test
	void passwordTooManyBytesIsRejected() {
		// 20 four-byte characters + 2: 42 chars but > 72 bytes
		String p = "😀".repeat(20) + "a1";
		assertThat(messages(withPassword(p), "password")).containsExactly("La contraseña es demasiado larga");
	}

	@Test
	void emptyPasswordOnlyReportsRequired() {
		assertThat(messages(withPassword(""), "password")).containsExactly("La contraseña es obligatoria");
		assertThat(messages(withPassword(null), "password")).containsExactly("La contraseña es obligatoria");
	}

	@Test
	void confirmPasswordMismatchIsReportedOnConfirmPassword() {
		RegisterRequest r = new RegisterRequest("Ana", "Pérez", "ana@x.com", "abcdefg1", "abcdefg2");
		assertThat(messages(r, "confirmPassword")).containsExactly("Las contraseñas no coinciden");
		RegisterRequest blank = new RegisterRequest("Ana", "Pérez", "ana@x.com", "abcdefg1", "");
		assertThat(messages(blank, "confirmPassword")).containsExactly("Confirma la contraseña");
	}

	@Test
	void firstNameRules() {
		for (String name : new String[] { "", "   ", null }) {
			RegisterRequest r = new RegisterRequest(name, "Pérez", "ana@x.com", "abcdefg1", "abcdefg1");
			assertThat(messages(r, "firstName")).containsExactly("El nombre es obligatorio");
		}
		RegisterRequest ok = new RegisterRequest("a".repeat(75), "Pérez", "ana@x.com", "abcdefg1", "abcdefg1");
		assertThat(messages(ok, "firstName")).isEmpty();
		RegisterRequest padded = new RegisterRequest(" " + "a".repeat(75) + " ", "Pérez", "ana@x.com", "abcdefg1", "abcdefg1");
		assertThat(messages(padded, "firstName")).isEmpty();
		RegisterRequest tooLong = new RegisterRequest("a".repeat(76), "Pérez", "ana@x.com", "abcdefg1", "abcdefg1");
		assertThat(messages(tooLong, "firstName")).containsExactly("El nombre no puede superar 75 caracteres");
	}

	@Test
	void lastNameRules() {
		for (String name : new String[] { "", "   ", null }) {
			RegisterRequest r = new RegisterRequest("Ana", name, "ana@x.com", "abcdefg1", "abcdefg1");
			assertThat(messages(r, "lastName")).containsExactly("Los apellidos son obligatorios");
		}
		RegisterRequest ok = new RegisterRequest("Ana", "a".repeat(75), "ana@x.com", "abcdefg1", "abcdefg1");
		assertThat(messages(ok, "lastName")).isEmpty();
		RegisterRequest tooLong = new RegisterRequest("Ana", "a".repeat(76), "ana@x.com", "abcdefg1", "abcdefg1");
		assertThat(messages(tooLong, "lastName")).containsExactly("Los apellidos no pueden superar 75 caracteres");
	}

	@Test
	void emailRules() {
		assertThat(messages(new RegisterRequest("Ana", "P", "", "abcdefg1", "abcdefg1"), "email"))
				.containsExactly("El email es obligatorio");
		assertThat(messages(new RegisterRequest("Ana", "P", "no-email", "abcdefg1", "abcdefg1"), "email"))
				.containsExactly("Introduce un email válido");
		assertThat(messages(new RegisterRequest("Ana", "P", " ana@x.com", "abcdefg1", "abcdefg1"), "email"))
				.containsExactly("Introduce un email válido");
		String longEmail = "a".repeat(250) + "@x.com"; // 256
		assertThat(messages(new RegisterRequest("Ana", "P", longEmail, "abcdefg1", "abcdefg1"), "email"))
				.contains("El email no puede superar 254 caracteres");
		assertThat(messages(new RegisterRequest("Ana", "P", "Ana@Ejemplo.com", "abcdefg1", "abcdefg1"), "email"))
				.isEmpty();
	}
}
