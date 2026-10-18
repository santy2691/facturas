package com.factura.backend.auth.dto;

import com.factura.backend.user.entity.Role;
import com.factura.backend.user.entity.User;

public record UserResponse(Long id, String firstName, String lastName, String email, Role role) {

	public static UserResponse from(User user) {
		return new UserResponse(user.getId(), user.getFirstName(), user.getLastName(), user.getEmail(),
				user.getRole());
	}
}
