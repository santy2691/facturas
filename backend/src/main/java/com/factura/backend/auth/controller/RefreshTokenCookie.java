package com.factura.backend.auth.controller;

import java.time.Duration;

import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import com.factura.backend.common.config.AuthProperties;

@Component
public class RefreshTokenCookie {

	public static final String NAME = "refresh_token";
	private static final String PATH = "/api/auth";

	private final AuthProperties properties;

	public RefreshTokenCookie(AuthProperties properties) {
		this.properties = properties;
	}

	public String create(String rawToken) {
		return build(rawToken, properties.refreshTokenTtl());
	}

	public String clear() {
		return build("", Duration.ZERO);
	}

	private String build(String value, Duration maxAge) {
		return ResponseCookie.from(NAME, value)
				.httpOnly(true)
				.secure(properties.cookieSecure())
				.sameSite("Strict")
				.path(PATH)
				.maxAge(maxAge)
				.build()
				.toString();
	}
}
