package com.factura.backend.auth.dto.validation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import jakarta.validation.Constraint;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import jakarta.validation.Payload;

/** The value, once trimmed, has at most {@code max} characters. */
@Documented
@Constraint(validatedBy = TrimmedSize.Validator.class)
@Target(ElementType.FIELD)
@Retention(RetentionPolicy.RUNTIME)
public @interface TrimmedSize {

	String message() default "Valor demasiado largo";

	int max();

	Class<?>[] groups() default {};

	Class<? extends Payload>[] payload() default {};

	class Validator implements ConstraintValidator<TrimmedSize, String> {

		private int max;

		@Override
		public void initialize(TrimmedSize annotation) {
			this.max = annotation.max();
		}

		@Override
		public boolean isValid(String value, ConstraintValidatorContext context) {
			return value == null || value.strip().length() <= max;
		}
	}
}
