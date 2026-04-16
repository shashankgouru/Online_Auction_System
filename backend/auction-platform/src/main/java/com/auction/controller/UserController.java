package com.auction.controller;

import com.auction.dto.AuthResponse;
import com.auction.dto.UpdateProfileRequest;
import com.auction.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    /**
     * GET /api/user/profile
     * Requires: valid JWT token
     * Returns the currently logged-in user's profile
     */
    @GetMapping("/profile")
    public ResponseEntity<AuthResponse> getProfile(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        AuthResponse response = userService.getProfile(userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    /**
     * PUT /api/user/profile
     * Requires: valid JWT token
     * Updates firstName, lastName, username, phone, profileImage
     * Only fields provided in the body are updated (partial update)
     */
    @PutMapping("/profile")
    public ResponseEntity<AuthResponse> updateProfile(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody UpdateProfileRequest request
    ) {
        AuthResponse response = userService.updateProfile(userDetails.getUsername(), request);
        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/user/apply-seller
     * Requires: valid JWT token
     * Submits a seller verification application (sets status to PENDING)
     * Admin will approve/reject via /api/admin endpoints (future step)
     */
    @PostMapping("/apply-seller")
    public ResponseEntity<AuthResponse> applyForSeller(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        AuthResponse response = userService.applyForSeller(userDetails.getUsername());
        return ResponseEntity.ok(response);
    }
}