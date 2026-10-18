package com.factura.backend.auth.service;

import static org.mockito.Mockito.verify;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.factura.backend.auth.repository.RefreshTokenRepository;

@ExtendWith(MockitoExtension.class)
class RefreshTokenCleanupTaskTest {

	@Mock
	RefreshTokenRepository repository;

	@Test
	void deletesTokensOlderThanSevenDays() {
		Instant now = Instant.parse("2026-10-18T03:00:00Z");
		new RefreshTokenCleanupTask(repository, Clock.fixed(now, ZoneOffset.UTC)).cleanup();

		verify(repository).deleteExpiredOrRevokedBefore(Instant.parse("2026-10-11T03:00:00Z"));
	}
}
