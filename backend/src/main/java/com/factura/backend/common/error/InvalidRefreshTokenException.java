package com.factura.backend.common.error;

public class InvalidRefreshTokenException extends RuntimeException {

	public InvalidRefreshTokenException() {
		super("La sesión ha caducado. Inicia sesión de nuevo");
	}
}
