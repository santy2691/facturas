package com.factura.backend.auth.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;

import com.factura.backend.TestcontainersConfiguration;
import com.factura.backend.auth.entity.RefreshToken;
import com.factura.backend.user.entity.User;
import com.factura.backend.user.repository.UserRepository;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(TestcontainersConfiguration.class)
class RefreshTokenRepositoryTest {

	@Autowired
	RefreshTokenRepository repository;
	@Autowired
	UserRepository userRepository;

	private final Instant now = Instant.parse("2026-10-18T10:00:00Z");

	private Long userId() {
		User u = new User();
		u.setEmail(UUID.randomUUID() + "@x.com");
		u.setPasswordHash("$2a$10$hash");
		u.setFirstName("Ana");
		u.setLastName("Pérez");
		return userRepository.saveAndFlush(u).getId();
	}

	private RefreshToken token(Long userId, UUID family, Instant expiresAt, Instant revokedAt) {
		RefreshToken t = new RefreshToken();
		t.setUserId(userId);
		t.setTokenHash(UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", ""));
		t.setFamilyId(family);
		t.setSessionStart(now);
		t.setExpiresAt(expiresAt);
		t.setRevokedAt(revokedAt);
		return repository.saveAndFlush(t);
	}

	@Test
	void findsByHash() {
		RefreshToken saved = token(userId(), UUID.randomUUID(), now.plus(7, ChronoUnit.DAYS), null);

		assertThat(repository.findByTokenHash(saved.getTokenHash())).isPresent();
		assertThat(repository.findByTokenHash("x".repeat(64))).isEmpty();
	}

	@Test
	void revokeFamilyOnlyAffectsThatFamily() {
		Long uid = userId();
		UUID familyA = UUID.randomUUID();
		UUID familyB = UUID.randomUUID();
		RefreshToken a1 = token(uid, familyA, now.plus(7, ChronoUnit.DAYS), null);
		RefreshToken a2 = token(uid, familyA, now.plus(7, ChronoUnit.DAYS), null);
		RefreshToken b1 = token(uid, familyB, now.plus(7, ChronoUnit.DAYS), null);

		int updated = repository.revokeFamily(familyA, now);

		assertThat(updated).isEqualTo(2);
		assertThat(repository.findById(a1.getId()).orElseThrow().getRevokedAt()).isEqualTo(now);
		assertThat(repository.findById(a2.getId()).orElseThrow().getRevokedAt()).isEqualTo(now);
		assertThat(repository.findById(b1.getId()).orElseThrow().getRevokedAt()).isNull();
	}

	@Test
	void deletesExpiredOrRevokedBeforeThreshold() {
		Long uid = userId();
		Instant threshold = now.minus(7, ChronoUnit.DAYS);
		RefreshToken oldExpired = token(uid, UUID.randomUUID(), threshold.minusSeconds(1), null);
		RefreshToken oldRevoked = token(uid, UUID.randomUUID(), now.plus(1, ChronoUnit.DAYS), threshold.minusSeconds(1));
		RefreshToken recentRevoked = token(uid, UUID.randomUUID(), now.plus(1, ChronoUnit.DAYS), threshold.plusSeconds(1));
		RefreshToken recentExpired = token(uid, UUID.randomUUID(), threshold.plusSeconds(1), null);
		RefreshToken active = token(uid, UUID.randomUUID(), now.plus(1, ChronoUnit.DAYS), null);

		int deleted = repository.deleteExpiredOrRevokedBefore(threshold);

		assertThat(deleted).isEqualTo(2);
		assertThat(repository.findById(oldExpired.getId())).isEmpty();
		assertThat(repository.findById(oldRevoked.getId())).isEmpty();
		assertThat(repository.findById(recentRevoked.getId())).isPresent();
		assertThat(repository.findById(recentExpired.getId())).isPresent();
		assertThat(repository.findById(active.getId())).isPresent();
	}
}
