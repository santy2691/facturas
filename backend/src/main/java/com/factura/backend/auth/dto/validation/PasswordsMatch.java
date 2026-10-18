package com.factura.backend.auth.dto.validation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import com.factura.backend.auth.dto.RegisterRequest;

import jakarta.validation.Constraint;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import jakarta.validation.Payload;

/** password and confirmPassword match; the violation is reported on confirmPassword. */
@Documented
@Constraint(validatedBy = PasswordsMatch.Validator.class)
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
public @interface PasswordsMatch {

	String message() default "Las contraseñas no coinciden";

	Class<?>[] groups() default {};

	Class<? extends Payload>[] payload() default {};

	class Validator implements ConstraintValidator<PasswordsMatch, RegisterRequest> {

		@Override
		public boolean isValid(RegisterRequest value, ConstraintValidatorContext context) {
			if (value == null || value.password() == null || value.confirmPassword() == null
					|| value.confirmPassword().isBlank()
					|| value.password().equals(value.confirmPassword())) {
				return true;
			}
			context.disableDefaultConstraintViolation();
			context.buildConstraintViolationWithTemplate(context.getDefaultConstraintMessageTemplate())
					.addPropertyNode("confirmPassword").addConstraintViolation();
			return false;
		}
	}
}
