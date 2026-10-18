package com.factura.backend.auth.service;

import java.time.Clock;
import java.time.Instant;
import java.util.UUID;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.factura.backend.auth.dto.AuthResponse;
import com.factura.backend.auth.dto.LoginRequest;
import com.factura.backend.auth.dto.RegisterRequest;
import com.factura.backend.auth.dto.UserResponse;
import com.factura.backend.common.error.EmailAlreadyExistsException;
import com.factura.backend.common.error.InvalidCredentialsException;
import com.factura.backend.common.error.InvalidRefreshTokenException;
import com.factura.backend.user.entity.Role;
import com.factura.backend.user.entity.User;
import com.factura.backend.user.repository.UserRepository;

@Service
public class AuthService {

	/** Internal result: the body for the client plus the raw refresh token for the cookie. */
	public record AuthResult(AuthResponse response, String refreshToken) {
	}

	private final UserRepository userRepository;
	private final PasswordEncoder passwordEncoder;
	private final AuthenticationManager authenticationManager;
	private final RefreshTokenService refreshTokenService;
	private final JwtService jwtService;
	private final Clock clock;

	public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder,
			AuthenticationManager authenticationManager, RefreshTokenService refreshTokenService,
			JwtService jwtService, Clock clock) {
		this.userRepository = userRepository;
		this.passwordEncoder = passwordEncoder;
		this.authenticationManager = authenticationManager;
		this.refreshTokenService = refreshTokenService;
		this.jwtService = jwtService;
		this.clock = clock;
	}

	@Transactional
	public AuthResult register(RegisterRequest request) {
		if (userRepository.existsByEmail(request.email())) {
			throw new EmailAlreadyExistsException();
		}
		User user = new User();
		user.setFirstName(request.firstName().strip());
		user.setLastName(request.lastName().strip());
		user.setEmail(request.email());
		user.setPasswordHash(passwordEncoder.encode(request.password()));
		user.setRole(Role.USER);
		try {
			user = userRepository.saveAndFlush(user);
		} catch (DataIntegrityViolationException e) {
			throw new EmailAlreadyExistsException();
		}
		return newSession(user);
	}

	@Transactional
	public AuthResult login(LoginRequest request) {
		try {
			authenticationManager.authenticate(
					UsernamePasswordAuthenticationToken.unauthenticated(request.email(), request.password()));
		} catch (AuthenticationException | IllegalArgumentException e) {
			throw new InvalidCredentialsException();
		}
		User user = userRepository.findByEmail(request.email()).orElseThrow(InvalidCredentialsException::new);
		return newSession(user);
	}

	@Transactional(noRollbackFor = InvalidRefreshTokenException.class)
	public AuthResult refresh(String rawToken) {
		if (rawToken == null || rawToken.isBlank()) {
			throw new InvalidRefreshTokenException();
		}
		RefreshTokenService.Rotation rotation = refreshTokenService.rotate(rawToken);
		User user = userRepository.findById(rotation.userId()).orElse(null);
		if (user == null || !user.isEnabled()) {
			refreshTokenService.revokeFamilyOf(rotation.rawToken());
			throw new InvalidRefreshTokenException();
		}
		return new AuthResult(buildResponse(user), rotation.rawToken());
	}

	@Transactional
	public void logout(String rawToken) {
		refreshTokenService.revokeFamilyOf(rawToken);
	}

	private AuthResult newSession(User user) {
		Instant now = clock.instant();
		String refreshToken = refreshTokenService.issue(user, UUID.randomUUID(), now);
		return new AuthResult(buildResponse(user), refreshToken);
	}

	private AuthResponse buildResponse(User user) {
		return new AuthResponse(jwtService.generateAccessToken(user), jwtService.expiresInSeconds(),
				UserResponse.from(user));
	}
}
