package com.factura.backend.auth.service;

import java.time.Clock;
import java.time.Duration;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.factura.backend.auth.repository.RefreshTokenRepository;

@Component
public class RefreshTokenCleanupTask {

	static final Duration RETENTION = Duration.ofDays(7);

	private final RefreshTokenRepository repository;
	private final Clock clock;

	public RefreshTokenCleanupTask(RefreshTokenRepository repository, Clock clock) {
		this.repository = repository;
		this.clock = clock;
	}

	@Scheduled(cron = "${app.auth.cleanup-cron:0 0 3 * * *}")
	@Transactional
	public void cleanup() {
		repository.deleteExpiredOrRevokedBefore(clock.instant().minus(RETENTION));
	}
}
