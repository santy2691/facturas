package com.factura.backend.common.config;

import java.time.Duration;
import java.util.Base64;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@Validated
@ConfigurationProperties("app.auth")
public record AuthProperties(
		@NotBlank String jwtSecret,
		@NotNull @DefaultValue("PT15M") Duration accessTokenTtl,
		@NotNull @DefaultValue("P7D") Duration refreshTokenTtl,
		@DefaultValue("true") boolean cookieSecure,
		@NotBlank @DefaultValue("facturas-backend") String issuer) {

	private static final int MIN_SECRET_BYTES = 32;

	@AssertTrue(message = "app.auth.jwt-secret (JWT_SECRET) debe ser Base64 válido y de al menos 32 bytes")
	boolean isJwtSecretValid() {
		if (jwtSecret == null || jwtSecret.isBlank()) {
			return true; // lo reporta @NotBlank
		}
		try {
			return Base64.getDecoder().decode(jwtSecret).length >= MIN_SECRET_BYTES;
		} catch (IllegalArgumentException e) {
			return false;
		}
	}

	public byte[] jwtSecretBytes() {
		return Base64.getDecoder().decode(jwtSecret);
	}
}
