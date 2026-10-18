package com.factura.backend.auth.dto;

public record AuthResponse(String accessToken, long expiresIn, UserResponse user) {
}
