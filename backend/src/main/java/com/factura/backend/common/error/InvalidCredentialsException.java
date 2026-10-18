package com.factura.backend.common.error;

public class InvalidCredentialsException extends RuntimeException {

	public InvalidCredentialsException() {
		super("Email o contraseña incorrectos");
	}
}
