package com.factura.backend.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.factura.backend.auth.dto.LoginRequest;
import com.factura.backend.auth.dto.RegisterRequest;
import com.factura.backend.auth.service.AuthService.AuthResult;
import com.factura.backend.common.error.EmailAlreadyExistsException;
import com.factura.backend.common.error.InvalidCredentialsException;
import com.factura.backend.common.error.InvalidRefreshTokenException;
import com.factura.backend.user.entity.Role;
import com.factura.backend.user.entity.User;
import com.factura.backend.user.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

	private static final Instant NOW = Instant.parse("2026-10-18T10:00:00Z");

	@Mock
	UserRepository userRepository;
	@Mock
	AuthenticationManager authenticationManager;
	@Mock
	RefreshTokenService refreshTokenService;
	@Mock
	JwtService jwtService;

	PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
	AuthService service;

	@BeforeEach
	void setUp() {
		service = new AuthService(userRepository, passwordEncoder, authenticationManager, refreshTokenService,
				jwtService, Clock.fixed(NOW, ZoneOffset.UTC));
	}

	private User savedUser(boolean enabled) {
		User u = new User();
		u.setId(7L);
		u.setEmail("ana@x.com");
		u.setFirstName("Ana");
		u.setLastName("Pérez");
		u.setPasswordHash("hash");
		u.setRole(Role.USER);
		u.setEnabled(enabled);
		return u;
	}

	private void stubTokens() {
		when(jwtService.generateAccessToken(any())).thenReturn("access");
		when(jwtService.expiresInSeconds()).thenReturn(900L);
	}

	@Test
	void registerHappyPath() {
		when(userRepository.existsByEmail("Ana@Ejemplo.com")).thenReturn(false);
		when(userRepository.saveAndFlush(any(User.class))).thenAnswer(i -> {
			User u = i.getArgument(0);
			u.setId(7L);
			return u;
		});
		when(refreshTokenService.issue(any(), any(), eq(NOW))).thenReturn("refresh-raw");
		stubTokens();

		AuthResult result = service.register(
				new RegisterRequest("  Ana ", " Pérez  ", "Ana@Ejemplo.com", "abcdefg1", "abcdefg1"));

		ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
		verify(userRepository).saveAndFlush(captor.capture());
		User saved = captor.getValue();
		assertThat(saved.getEmail()).isEqualTo("Ana@Ejemplo.com");
		assertThat(saved.getFirstName()).isEqualTo("Ana");
		assertThat(saved.getLastName()).isEqualTo("Pérez");
		assertThat(saved.getRole()).isEqualTo(Role.USER);
		assertThat(saved.getPasswordHash()).startsWith("$2").isNotEqualTo("abcdefg1");
		assertThat(passwordEncoder.matches("abcdefg1", saved.getPasswordHash())).isTrue();
		assertThat(result.refreshToken()).isEqualTo("refresh-raw");
		assertThat(result.response().accessToken()).isEqualTo("access");
		assertThat(result.response().expiresIn()).isEqualTo(900);
		assertThat(result.response().user().role()).isEqualTo(Role.USER);
	}

	@Test
	void registerDuplicateEmailByExists() {
		when(userRepository.existsByEmail("ana@x.com")).thenReturn(true);

		assertThatThrownBy(() -> service.register(new RegisterRequest("Ana", "P", "ana@x.com", "abcdefg1", "abcdefg1")))
				.isInstanceOf(EmailAlreadyExistsException.class);
		verify(userRepository, never()).saveAndFlush(any());
	}

	@Test
	void registerDuplicateEmailByRace() {
		when(userRepository.existsByEmail("ana@x.com")).thenReturn(false);
		when(userRepository.saveAndFlush(any())).thenThrow(new DataIntegrityViolationException("uq_users_email"));

		assertThatThrownBy(() -> service.register(new RegisterRequest("Ana", "P", "ana@x.com", "abcdefg1", "abcdefg1")))
				.isInstanceOf(EmailAlreadyExistsException.class);
	}

	@Test
	void loginHappyPath() {
		when(userRepository.findByEmail("ana@x.com")).thenReturn(Optional.of(savedUser(true)));
		when(refreshTokenService.issue(any(), any(), eq(NOW))).thenReturn("refresh-raw");
		stubTokens();

		AuthResult result = service.login(new LoginRequest("ana@x.com", "abcdefg1"));

		assertThat(result.refreshToken()).isEqualTo("refresh-raw");
		assertThat(result.response().user().email()).isEqualTo("ana@x.com");
	}

	@Test
	void loginBadCredentials() {
		when(authenticationManager.authenticate(any())).thenThrow(new BadCredentialsException("bad"));

		assertThatThrownBy(() -> service.login(new LoginRequest("ana@x.com", "wrong")))
				.isInstanceOf(InvalidCredentialsException.class);
		verify(refreshTokenService, never()).issue(any(), any(), any());
	}

	@Test
	void loginDisabledUser() {
		when(authenticationManager.authenticate(any())).thenThrow(new DisabledException("disabled"));

		assertThatThrownBy(() -> service.login(new LoginRequest("ana@x.com", "abcdefg1")))
				.isInstanceOf(InvalidCredentialsException.class);
	}

	@Test
	void refreshHappyPath() {
		when(refreshTokenService.rotate("old")).thenReturn(new RefreshTokenService.Rotation("new", 7L));
		when(userRepository.findById(7L)).thenReturn(Optional.of(savedUser(true)));
		stubTokens();

		AuthResult result = service.refresh("old");

		assertThat(result.refreshToken()).isEqualTo("new");
		assertThat(result.response().user().id()).isEqualTo(7L);
	}

	@Test
	void refreshWithoutCookieFails() {
		assertThatThrownBy(() -> service.refresh(null)).isInstanceOf(InvalidRefreshTokenException.class);
		verify(refreshTokenService, never()).rotate(any());
	}

	@Test
	void refreshInvalidTokenFails() {
		when(refreshTokenService.rotate("bad")).thenThrow(new InvalidRefreshTokenException());

		assertThatThrownBy(() -> service.refresh("bad")).isInstanceOf(InvalidRefreshTokenException.class);
	}

	@Test
	void refreshDisabledUserRevokesFamilyAndFails() {
		when(refreshTokenService.rotate("old")).thenReturn(new RefreshTokenService.Rotation("new", 7L));
		when(userRepository.findById(7L)).thenReturn(Optional.of(savedUser(false)));

		assertThatThrownBy(() -> service.refresh("old")).isInstanceOf(InvalidRefreshTokenException.class);
		verify(refreshTokenService).revokeFamilyOf("new");
	}

	@Test
	void logoutRevokesFamily() {
		service.logout("raw");

		verify(refreshTokenService).revokeFamilyOf("raw");
	}
}
