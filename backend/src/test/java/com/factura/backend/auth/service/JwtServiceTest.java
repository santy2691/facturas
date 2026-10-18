package com.factura.backend.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;

import com.factura.backend.auth.config.SecurityConfig;
import com.factura.backend.common.config.AuthProperties;
import com.factura.backend.user.entity.Role;
import com.factura.backend.user.entity.User;

class JwtServiceTest {

	private static AuthProperties props(byte fill) {
		byte[] key = new byte[48];
		java.util.Arrays.fill(key, fill);
		return new AuthProperties(Base64.getEncoder().encodeToString(key), Duration.ofMinutes(15),
				Duration.ofDays(7), true, "facturas-backend");
	}

	private static User user() {
		User u = new User();
		u.setId(42L);
		u.setRole(Role.USER);
		return u;
	}

	@Test
	void generatedTokenIsDecodable() {
		AuthProperties props = props((byte) 1);
		JwtService service = new JwtService(props, Clock.systemUTC());
		JwtDecoder decoder = new SecurityConfig().jwtDecoder(props);

		Jwt jwt = decoder.decode(service.generateAccessToken(user()));

		assertThat(jwt.getSubject()).isEqualTo("42");
		assertThat(jwt.getClaimAsStringList("roles")).containsExactly("USER");
		assertThat(jwt.getClaimAsString("iss")).isEqualTo("facturas-backend");
		assertThat(Duration.between(jwt.getIssuedAt(), jwt.getExpiresAt()).toSeconds()).isEqualTo(900);
		assertThat(service.expiresInSeconds()).isEqualTo(900);
		assertThat(jwt.getClaims().keySet()).containsExactlyInAnyOrder("sub", "roles", "iss", "iat", "exp");
	}

	@Test
	void expiredTokenIsRejected() {
		AuthProperties props = props((byte) 1);
		Clock past = Clock.fixed(Instant.now().minus(Duration.ofHours(2)), ZoneOffset.UTC);
		String token = new JwtService(props, past).generateAccessToken(user());

		assertThatThrownBy(() -> new SecurityConfig().jwtDecoder(props).decode(token))
				.isInstanceOf(JwtException.class);
	}

	@Test
	void tokenSignedWithAnotherKeyIsRejected() {
		String token = new JwtService(props((byte) 2), Clock.systemUTC()).generateAccessToken(user());

		assertThatThrownBy(() -> new SecurityConfig().jwtDecoder(props((byte) 1)).decode(token))
				.isInstanceOf(JwtException.class);
	}

	@Test
	void rolesIsAList() {
		AuthProperties props = props((byte) 1);
		Jwt jwt = new SecurityConfig().jwtDecoder(props)
				.decode(new JwtService(props, Clock.systemUTC()).generateAccessToken(user()));
		assertThat(jwt.<Object>getClaim("roles")).isEqualTo(List.of("USER"));
	}
}
