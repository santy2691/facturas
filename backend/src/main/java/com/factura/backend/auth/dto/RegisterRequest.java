package com.factura.backend.auth.dto;

import com.factura.backend.auth.dto.validation.MaxBytes;
import com.factura.backend.auth.dto.validation.PasswordsMatch;
import com.factura.backend.auth.dto.validation.TrimmedSize;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@PasswordsMatch
public record RegisterRequest(
		@NotBlank(message = "El nombre es obligatorio")
		@TrimmedSize(max = 75, message = "El nombre no puede superar 75 caracteres")
		String firstName,

		@NotBlank(message = "Los apellidos son obligatorios")
		@TrimmedSize(max = 75, message = "Los apellidos no pueden superar 75 caracteres")
		String lastName,

		@NotBlank(message = "El email es obligatorio")
		@Email(message = "Introduce un email válido")
		@Size(max = 254, message = "El email no puede superar 254 caracteres")
		String email,

		@NotBlank(message = "La contraseña es obligatoria")
		@Pattern(regexp = "^$|^(?=.*\\p{L})(?=.*\\p{Nd}).{8,}$",
				message = "La contraseña debe tener al menos 8 caracteres, una letra y un número")
		@Size(max = 64, message = "La contraseña no puede superar 64 caracteres")
		@MaxBytes(value = 72, message = "La contraseña es demasiado larga")
		String password,

		@NotBlank(message = "Confirma la contraseña")
		String confirmPassword) {
}
