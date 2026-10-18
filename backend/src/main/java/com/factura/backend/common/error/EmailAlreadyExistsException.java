package com.factura.backend.common.error;

public class EmailAlreadyExistsException extends RuntimeException {

	public EmailAlreadyExistsException() {
		super("Ya existe una cuenta con este email");
	}
}
