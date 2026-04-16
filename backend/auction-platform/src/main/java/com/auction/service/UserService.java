package com.auction.service;

import com.auction.dto.AuthResponse;
import com.auction.dto.UpdateProfileRequest;
import com.auction.entity.User;
import com.auction.enums.Role;
import com.auction.enums.SellerStatus;
import com.auction.exception.BusinessException;
import com.auction.exception.DuplicateResourceException;
import com.auction.exception.ResourceNotFoundException;
import com.auction.repository.UserRepository;
import com.auction.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;

    // ── Get profile ───────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public AuthResponse getProfile(String email) {
        User user = findByEmail(email);
        return buildAuthResponse(user);
    }

    // ── Update profile ────────────────────────────────────────────────────────

    @Transactional
    public AuthResponse updateProfile(String email, UpdateProfileRequest request) {
        User user = findByEmail(email);

        // If username is being changed, check it's not taken by another user
        if (request.getUsername() != null
                && !request.getUsername().equals(user.getDisplayUsername())) {
            if (userRepository.existsByUsernameAndIdNot(request.getUsername(), user.getId())) {
                throw new DuplicateResourceException("This username is already taken");
            }
            user.setUsername(request.getUsername());
        }

        // Apply only non-null fields from the request
        if (request.getFirstName()    != null) user.setFirstName(request.getFirstName());
        if (request.getLastName()     != null) user.setLastName(request.getLastName());
        if (request.getPhone()        != null) user.setPhone(request.getPhone());
        if (request.getProfileImage() != null) user.setProfileImage(request.getProfileImage());

        userRepository.save(user);
        return buildAuthResponse(user);
    }

    // ── Apply for seller ──────────────────────────────────────────────────────

    @Transactional
    public AuthResponse applyForSeller(String email) {
        User user = findByEmail(email);

        // Cannot apply if already a seller or if application is already pending/verified
        if (user.getRole() == Role.SELLER) {
            throw new BusinessException("You are already a verified seller");
        }
        if (user.getSellerStatus() == SellerStatus.PENDING) {
            throw new BusinessException("Your seller application is already pending review");
        }
        if (user.getSellerStatus() == SellerStatus.VERIFIED) {
            throw new BusinessException("Your seller account is already verified");
        }

        user.setSellerStatus(SellerStatus.PENDING);
        userRepository.save(user);

        return buildAuthResponse(user);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private User findByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private AuthResponse buildAuthResponse(User user) {
        return AuthResponse.builder()
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