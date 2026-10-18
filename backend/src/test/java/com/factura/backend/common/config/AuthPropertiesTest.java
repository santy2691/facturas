package com.factura.backend.common.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.util.Base64;

import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Configuration;

class AuthPropertiesTest {

	private final ApplicationContextRunner runner = new ApplicationContextRunner()
			.withUserConfiguration(Config.class);

	@Configuration
	@EnableConfigurationProperties(AuthProperties.class)
	static class Config {
	}

	private static String secret(int bytes) {
		return Base64.getEncoder().encodeToString(new byte[bytes]);
	}

	@Test
	void bindsWithDefaults() {
		runner.withPropertyValues("app.auth.jwt-secret=" + secret(48)).run(ctx -> {
			assertThat(ctx).hasNotFailed();
			AuthProperties p = ctx.getBean(AuthProperties.class);
			assertThat(p.accessTokenTtl()).isEqualTo(Duration.ofMinutes(15));
			assertThat(p.refreshTokenTtl()).isEqualTo(Duration.ofDays(7));
			assertThat(p.cookieSecure()).isTrue();
			assertThat(p.issuer()).isEqualTo("facturas-backend");
			assertThat(p.jwtSecretBytes()).hasSize(48);
		});
	}

	@Test
	void failsWithoutSecret() {
		runner.run(ctx -> assertThat(ctx).hasFailed());
	}

	@Test
	void failsWithShortSecret() {
		runner.withPropertyValues("app.auth.jwt-secret=" + secret(31)).run(ctx -> assertThat(ctx).hasFailed());
	}

	@Test
	void failsWithNonBase64Secret() {
		runner.withPropertyValues("app.auth.jwt-secret=%%%not-base64%%%").run(ctx -> assertThat(ctx).hasFailed());
	}

	@Test
	void acceptsMinimumSecret() {
		runner.withPropertyValues("app.auth.jwt-secret=" + secret(32)).run(ctx -> assertThat(ctx).hasNotFailed());
	}
}
