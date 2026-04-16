package com.auction.dto;

import com.auction.enums.Role;
import com.auction.enums.SellerStatus;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AuthResponse {

    private String token;

    @Builder.Default
    private String tokenType = "Bearer";

    private Long userId;
    private String username;
    private String email;
    private String firstName;
    private String lastName;
    private String profileImage;
    private Role role;
    private SellerStatus sellerStatus;
}