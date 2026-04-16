package com.auction.config;

import com.auction.security.JwtAuthFilter;
import com.auction.security.UserDetailsServiceImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final UserDetailsServiceImpl userDetailsService;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .authorizeHttpRequests(auth -> auth

                        // ── Auth endpoints — always public ────────────────────────────
                        .requestMatchers("/api/auth/**").permitAll()

                        // ── Auction READ endpoints — public, no token required ────────
                        // Must specify GET method so POST /api/auctions still requires auth
                        .requestMatchers(HttpMethod.GET, "/api/auctions").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/auctions/**").permitAll()

                        // ── Bid READ endpoints — public ───────────────────────────────
                        .requestMatchers(HttpMethod.GET, "/api/auctions/*/bids").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/auctions/*/bids/top").permitAll()

                        // ── WebSocket — public ────────────────────────────────────────
                        .requestMatchers("/ws/**").permitAll()

                        // ── Swagger (future) — public ─────────────────────────────────
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**").permitAll()

                        // ── Admin endpoints — ADMIN role only ─────────────────────────
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")

                        // ── Seller endpoints — SELLER or ADMIN ────────────────────────
                        .requestMatchers("/api/seller/**").hasAnyRole("SELLER", "ADMIN")

                        // ── Everything else — must be authenticated ───────────────────
                        .anyRequest().authenticated()
                )
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )
                .authenticationProvider(authenticationProvider())
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config)
            throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(
                "http://localhost:3000",   // React (CRA / Vite default)
                "http://localhost:5173"    // React (Vite alternate)
        ));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}