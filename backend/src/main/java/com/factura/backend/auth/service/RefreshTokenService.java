package com.factura.backend.auth.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.factura.backend.auth.entity.RefreshToken;
import com.factura.backend.auth.repository.RefreshTokenRepository;
import com.factura.backend.common.config.AuthProperties;
import com.factura.backend.common.error.InvalidRefreshTokenException;
import com.factura.backend.user.entity.User;

@Service
public class RefreshTokenService {

	private static final int TOKEN_BYTES = 32;

	/** Result of a rotation: the new raw token and the owner. */
	public record Rotation(String rawToken, Long userId) {
	}

	private final RefreshTokenRepository repository;
	private final AuthProperties properties;
	private final Clock clock;
	private final SecureRandom secureRandom = new SecureRandom();

	public RefreshTokenService(RefreshTokenRepository repository, AuthProperties properties, Clock clock) {
		this.repository = repository;
		this.properties = properties;
		this.clock = clock;
	}

	@Transactional
	public String issue(User user, UUID familyId, Instant sessionStart) {
		return issue(user.getId(), familyId, sessionStart);
	}

	/**
	 * Rotates a token. On reuse of a revoked token the whole family is revoked; the
	 * revocation is committed together with the exception (noRollbackFor) so it is
	 * not undone and does not deadlock with the row lock taken on read.
	 */
	@Transactional(noRollbackFor = InvalidRefreshTokenException.class)
	public Rotation rotate(String rawToken) {
		Instant now = clock.instant();
		RefreshToken current = repository.findByTokenHash(hash(rawToken))
				.orElseThrow(InvalidRefreshTokenException::new);
		if (current.getRevokedAt() != null) {
			repository.revokeFamily(current.getFamilyId(), now);
			throw new InvalidRefreshTokenException();
		}
		if (!current.getExpiresAt().isAfter(now)) {
			throw new InvalidRefreshTokenException();
		}
		current.setRevokedAt(now);
		repository.saveAndFlush(current);
		String newRaw = issue(current.getUserId(), current.getFamilyId(), current.getSessionStart());
		return new Rotation(newRaw, current.getUserId());
	}

	@Transactional
	public void revokeFamilyOf(String rawToken) {
		if (rawToken == null || rawToken.isBlank()) {
			return;
		}
		repository.findByTokenHash(hash(rawToken))
				.ifPresent(t -> repository.revokeFamily(t.getFamilyId(), clock.instant()));
	}

	private String issue(Long userId, UUID familyId, Instant sessionStart) {
		byte[] bytes = new byte[TOKEN_BYTES];
		secureRandom.nextBytes(bytes);
		String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
		RefreshToken token = new RefreshToken();
		token.setUserId(userId);
		token.setTokenHash(hash(raw));
		token.setFamilyId(familyId);
		token.setSessionStart(sessionStart);
		token.setExpiresAt(clock.instant().plus(properties.refreshTokenTtl()));
		repository.save(token);
		return raw;
	}

	static String hash(String raw) {
		try {
			byte[] digest = MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.UTF_8));
			return HexFormat.of().formatHex(digest);
		} catch (NoSuchAlgorithmException e) {
			throw new IllegalStateException(e);
		}
	}
}
