package com.auction.controller;

import com.auction.entity.User;
import com.auction.enums.Role;
import com.auction.enums.SellerStatus;
import com.auction.exception.BusinessException;
import com.auction.exception.ResourceNotFoundException;
import com.auction.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final UserRepository userRepository;

    /**
     * GET /api/admin/sellers/pending
     * Returns all users with PENDING seller status
     */
    @GetMapping("/sellers/pending")
    public ResponseEntity<List<Map<String, Object>>> getPendingSellers() {
        List<User> pending = userRepository.findByRoleAndSellerStatus(
                Role.USER, SellerStatus.PENDING
        );
        List<Map<String, Object>> result = pending.stream().map(u -> {
            Map<String, Object> seller = new LinkedHashMap<>();
            seller.put("id", u.getId());
            seller.put("username", u.getDisplayUsername());
            seller.put("email", u.getEmail());
            seller.put("firstName", u.getFirstName());
            seller.put("lastName", u.getLastName());
            seller.put("sellerStatus", u.getSellerStatus().name());
            return seller;
        }).toList();
        return ResponseEntity.ok(result);
    }

    /**
     * POST /api/admin/sellers/{userId}/approve
     * Promotes user to SELLER role with VERIFIED status
     */
    @PostMapping("/sellers/{userId}/approve")
    public ResponseEntity<Map<String, String>> approveSeller(@PathVariable Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (user.getSellerStatus() != SellerStatus.PENDING) {
            throw new BusinessException("User does not have a pending seller application");
        }

        user.setRole(Role.SELLER);
        user.setSellerStatus(SellerStatus.VERIFIED);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of(
                "message", "Seller approved successfully",
                "userId",  userId.toString()
        ));
    }

    /**
     * POST /api/admin/sellers/{userId}/reject
     * Rejects the seller application
     */
    @PostMapping("/sellers/{userId}/reject")
    public ResponseEntity<Map<String, String>> rejectSeller(@PathVariable Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (user.getSellerStatus() != SellerStatus.PENDING) {
            throw new BusinessException("User does not have a pending seller application");
        }

        user.setSellerStatus(SellerStatus.REJECTED);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of(
                "message", "Seller application rejected",
                "userId",  userId.toString()
        ));
    }
}
