package com.factura.backend.auth.service;

import java.time.Clock;
import java.time.Instant;
import java.util.List;

import javax.crypto.spec.SecretKeySpec;

import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.stereotype.Service;

import com.factura.backend.common.config.AuthProperties;
import com.factura.backend.user.entity.User;
import com.nimbusds.jose.jwk.source.ImmutableSecret;

@Service
public class JwtService {

	private final JwtEncoder encoder;
	private final AuthProperties properties;
	private final Clock clock;

	public JwtService(AuthProperties properties, Clock clock) {
		this.properties = properties;
		this.clock = clock;
		this.encoder = new NimbusJwtEncoder(
				new ImmutableSecret<>(new SecretKeySpec(properties.jwtSecretBytes(), "HmacSHA256")));
	}

	public String generateAccessToken(User user) {
		Instant now = clock.instant();
		JwtClaimsSet claims = JwtClaimsSet.builder()
				.issuer(properties.issuer())
				.subject(String.valueOf(user.getId()))
				.issuedAt(now)
				.expiresAt(now.plus(properties.accessTokenTtl()))
				.claim("roles", List.of(user.getRole().name()))
				.build();
		JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
		return encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
	}

	public long expiresInSeconds() {
		return properties.accessTokenTtl().toSeconds();
	}
}
