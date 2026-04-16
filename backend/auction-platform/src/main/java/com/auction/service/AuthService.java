package com.auction.service;

import com.auction.dto.AuthResponse;
import com.auction.dto.LoginRequest;
import com.auction.dto.RegisterRequest;
import com.auction.entity.User;
import com.auction.exception.DuplicateResourceException;
import com.auction.repository.UserRepository;
import com.auction.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;

    // ── Register ─────────────────────────────────────────────────────────────

    @Transactional
    public AuthResponse register(RegisterRequest request) {

        // Check duplicates
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException(
                    "An account with this email already exists"
            );
        }
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new DuplicateResourceException(
                    "This username is already taken"
            );
        }

        // Build and save user
        User user = User.builder()
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .emailVerified(true) // Phase 1: auto-verify; real email OTP in later phase
                .build();

        userRepository.save(user);

        // Generate token and return response
        String token = jwtUtil.generateToken(user);
        return buildAuthResponse(token, user);
    }

    // ── Login ─────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {

        // Spring Security handles credential validation + throws on failure
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail(),
                        request.getPassword()
                )
        );

        // Credentials valid — load user and issue token
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow();

        String token = jwtUtil.generateToken(user);
        return buildAuthResponse(token, user);
    }

    // ── Helper ───────────────────────────────────────────────────────────────

    private AuthResponse buildAuthResponse(String token, User user) {
        return AuthResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .userId(user.getId())
                .username(user.getDisplayUsername())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .profileImage(user.getProfileImage())
                .role(user.getRole())
                .sellerStatus(user.getSellerStatus())
                .build();
    }
}