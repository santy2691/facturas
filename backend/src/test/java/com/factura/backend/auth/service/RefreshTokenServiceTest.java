package com.factura.backend.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.factura.backend.auth.entity.RefreshToken;
import com.factura.backend.auth.repository.RefreshTokenRepository;
import com.factura.backend.common.config.AuthProperties;
import com.factura.backend.common.error.InvalidRefreshTokenException;
import com.factura.backend.user.entity.User;

@ExtendWith(MockitoExtension.class)
class RefreshTokenServiceTest {

	private static final Instant NOW = Instant.parse("2026-10-18T10:00:00Z");

	@Mock
	RefreshTokenRepository repository;

	RefreshTokenService service;

	@BeforeEach
	void setUp() {
		AuthProperties props = new AuthProperties(Base64.getEncoder().encodeToString(new byte[48]),
				Duration.ofMinutes(15), Duration.ofDays(7), true, "facturas-backend");
		service = new RefreshTokenService(repository, props, Clock.fixed(NOW, ZoneOffset.UTC));
	}

	private RefreshToken stored(String raw, Instant expiresAt, Instant revokedAt) {
		RefreshToken t = new RefreshToken();
		t.setUserId(5L);
		t.setTokenHash(RefreshTokenService.hash(raw));
		t.setFamilyId(UUID.randomUUID());
		t.setSessionStart(NOW.minusSeconds(3600));
		t.setExpiresAt(expiresAt);
		t.setRevokedAt(revokedAt);
		return t;
	}

	@Test
	void issueStoresOnlyTheHash() {
		User user = new User();
		user.setId(5L);
		UUID family = UUID.randomUUID();

		String raw = service.issue(user, family, NOW);

		ArgumentCaptor<RefreshToken> captor = ArgumentCaptor.forClass(RefreshToken.class);
		verify(repository).save(captor.capture());
		RefreshToken saved = captor.getValue();
		assertThat(saved.getTokenHash()).isNotEqualTo(raw).hasSize(64).isEqualTo(RefreshTokenService.hash(raw));
		assertThat(raw).hasSize(43).doesNotContain("=", "+", "/");
		assertThat(saved.getFamilyId()).isEqualTo(family);
		assertThat(saved.getSessionStart()).isEqualTo(NOW);
		assertThat(saved.getExpiresAt()).isEqualTo(NOW.plus(Duration.ofDays(7)));
	}

	@Test
	void rotateUnknownTokenFails() {
		when(repository.findByTokenHash(any())).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.rotate("unknown")).isInstanceOf(InvalidRefreshTokenException.class);
	}

	@Test
	void rotateExpiredTokenFails() {
		RefreshToken t = stored("raw", NOW.minusSeconds(1), null);
		when(repository.findByTokenHash(t.getTokenHash())).thenReturn(Optional.of(t));

		assertThatThrownBy(() -> service.rotate("raw")).isInstanceOf(InvalidRefreshTokenException.class);
		verify(repository, never()).revokeFamily(any(), any());
	}

	@Test
	void rotateRevokedTokenRevokesFamilyAndFails() {
		RefreshToken t = stored("raw", NOW.plusSeconds(100), NOW.minusSeconds(10));
		when(repository.findByTokenHash(t.getTokenHash())).thenReturn(Optional.of(t));

		assertThatThrownBy(() -> service.rotate("raw")).isInstanceOf(InvalidRefreshTokenException.class);
		verify(repository).revokeFamily(t.getFamilyId(), NOW);
	}

	@Test
	void rotateValidTokenRevokesAndIssuesNewInSameFamily() {
		RefreshToken t = stored("raw", NOW.plusSeconds(100), null);
		when(repository.findByTokenHash(t.getTokenHash())).thenReturn(Optional.of(t));

		RefreshTokenService.Rotation rotation = service.rotate("raw");

		assertThat(t.getRevokedAt()).isEqualTo(NOW);
		ArgumentCaptor<RefreshToken> captor = ArgumentCaptor.forClass(RefreshToken.class);
		verify(repository).save(captor.capture());
		RefreshToken fresh = captor.getValue();
		assertThat(fresh.getFamilyId()).isEqualTo(t.getFamilyId());
		assertThat(fresh.getSessionStart()).isEqualTo(t.getSessionStart());
		assertThat(fresh.getExpiresAt()).isEqualTo(NOW.plus(Duration.ofDays(7)));
		assertThat(fresh.getTokenHash()).isNotEqualTo(t.getTokenHash()).isEqualTo(RefreshTokenService.hash(rotation.rawToken()));
		assertThat(rotation.userId()).isEqualTo(5L);
	}

	@Test
	void revokeFamilyOfExistingToken() {
		RefreshToken t = stored("raw", NOW.plusSeconds(100), null);
		when(repository.findByTokenHash(t.getTokenHash())).thenReturn(Optional.of(t));

		service.revokeFamilyOf("raw");

		verify(repository).revokeFamily(t.getFamilyId(), NOW);
	}

	@Test
	void revokeFamilyOfUnknownOrMissingDoesNotThrow() {
		when(repository.findByTokenHash(any())).thenReturn(Optional.empty());

		service.revokeFamilyOf("unknown");
		service.revokeFamilyOf(null);
		service.revokeFamilyOf(" ");

		verify(repository, never()).revokeFamily(any(), any());
	}
}
