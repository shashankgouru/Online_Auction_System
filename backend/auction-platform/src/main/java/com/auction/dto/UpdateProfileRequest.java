package com.auction.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateProfileRequest {

    @Size(min = 2, max = 50, message = "First name must be 2–50 characters")
    private String firstName;

    @Size(min = 2, max = 50, message = "Last name must be 2–50 characters")
    private String lastName;

    @Size(min = 3, max = 50, message = "Username must be 3–50 characters")
    @Pattern(regexp = "^[a-zA-Z0-9_]+$", message = "Username can only contain letters, numbers, and underscores")
    private String username;

    @Size(max = 15, message = "Phone number too long")
    private String phone;

    @Size(max = 500, message = "Profile image URL too long")
    private String profileImage;
}