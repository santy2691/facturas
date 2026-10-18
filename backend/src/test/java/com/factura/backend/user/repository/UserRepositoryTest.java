package com.factura.backend.user.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;

import com.factura.backend.TestcontainersConfiguration;
import com.factura.backend.user.entity.Role;
import com.factura.backend.user.entity.User;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(TestcontainersConfiguration.class)
class UserRepositoryTest {

	@Autowired
	UserRepository repository;

	private User user(String email) {
		User u = new User();
		u.setEmail(email);
		u.setPasswordHash("$2a$10$hash");
		u.setFirstName("Ana");
		u.setLastName("Pérez");
		return u;
	}

	@Test
	void savesAndReads() {
		User saved = repository.saveAndFlush(user("ana@x.com"));

		User found = repository.findByEmail("ana@x.com").orElseThrow();
		assertThat(found.getId()).isEqualTo(saved.getId());
		assertThat(found.getRole()).isEqualTo(Role.USER);
		assertThat(found.isEnabled()).isTrue();
		assertThat(found.getCreatedAt()).isNotNull();
		assertThat(repository.existsByEmail("ana@x.com")).isTrue();
		assertThat(repository.existsByEmail("other@x.com")).isFalse();
	}

	@Test
	void uniqueEmailIndexRejectsSameText() {
		repository.saveAndFlush(user("dup@x.com"));

		assertThatThrownBy(() -> repository.saveAndFlush(user("dup@x.com")))
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void differentCapitalizationIsAnotherAccount() {
		repository.saveAndFlush(user("a@x.com"));
		repository.saveAndFlush(user("A@x.com"));

		assertThat(repository.findByEmail("a@x.com")).isPresent();
		assertThat(repository.findByEmail("A@x.com")).isPresent();
		assertThat(repository.count()).isEqualTo(2);
	}
}
