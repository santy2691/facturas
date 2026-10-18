package com.factura.backend.auth.controller;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.factura.backend.auth.dto.AuthResponse;
import com.factura.backend.auth.dto.LoginRequest;
import com.factura.backend.auth.dto.RegisterRequest;
import com.factura.backend.auth.service.AuthService;
import com.factura.backend.auth.service.AuthService.AuthResult;
import com.factura.backend.common.error.GlobalExceptionHandler;
import com.factura.backend.common.error.InvalidRefreshTokenException;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

	private final AuthService authService;
	private final RefreshTokenCookie refreshCookie;

	public AuthController(AuthService authService, RefreshTokenCookie refreshCookie) {
		this.authService = authService;
		this.refreshCookie = refreshCookie;
	}

	@PostMapping("/register")
	ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
		return withCookie(HttpStatus.CREATED, authService.register(request));
	}

	@PostMapping("/login")
	ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
		return withCookie(HttpStatus.OK, authService.login(request));
	}

	@PostMapping("/refresh")
	ResponseEntity<AuthResponse> refresh(
			@CookieValue(name = RefreshTokenCookie.NAME, required = false) String refreshToken) {
		return withCookie(HttpStatus.OK, authService.refresh(refreshToken));
	}

	@PostMapping("/logout")
	ResponseEntity<Void> logout(
			@CookieValue(name = RefreshTokenCookie.NAME, required = false) String refreshToken) {
		authService.logout(refreshToken);
		return ResponseEntity.noContent().header(HttpHeaders.SET_COOKIE, refreshCookie.clear()).build();
	}

	/** An invalid refresh token also clears the cookie in the browser. */
	@ExceptionHandler(InvalidRefreshTokenException.class)
	ResponseEntity<ProblemDetail> handleInvalidRefreshToken(InvalidRefreshTokenException ex) {
		return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
				.header(HttpHeaders.SET_COOKIE, refreshCookie.clear())
				.body(GlobalExceptionHandler.problem(HttpStatus.UNAUTHORIZED, ex.getMessage()));
	}

	private ResponseEntity<AuthResponse> withCookie(HttpStatus status, AuthResult result) {
		return ResponseEntity.status(status)
				.header(HttpHeaders.SET_COOKIE, refreshCookie.create(result.refreshToken()))
				.body(result.response());
	}
}
