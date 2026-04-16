package com.auction.dto;

import com.auction.enums.AuctionCategory;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class CreateAuctionRequest {

    @NotBlank(message = "Title is required")
    @Size(min = 5, max = 150, message = "Title must be 5–150 characters")
    private String title;

    @NotBlank(message = "Description is required")
    @Size(min = 20, message = "Description must be at least 20 characters")
    private String description;

    @NotNull(message = "Category is required")
    private AuctionCategory category;

    @NotNull(message = "Starting price is required")
    @DecimalMin(value = "0.01", message = "Starting price must be at least 0.01")
    @Digits(integer = 10, fraction = 2, message = "Invalid price format")
    private BigDecimal startingPrice;

    // Optional — null means no reserve price
    @DecimalMin(value = "0.01", message = "Reserve price must be at least 0.01")
    @Digits(integer = 10, fraction = 2, message = "Invalid price format")
    private BigDecimal reservePrice;

    @DecimalMin(value = "0.01", message = "Minimum bid increment must be at least 0.01")
    @Digits(integer = 10, fraction = 2, message = "Invalid increment format")
    private BigDecimal minimumBidIncrement;

    // FutureOrPresent allows today's date/time
    // End > start is enforced in AuctionService, not here
    @NotNull(message = "Start time is required")
    @FutureOrPresent(message = "Start time cannot be in the past")
    private LocalDateTime startTime;

    @NotNull(message = "End time is required")
    private LocalDateTime endTime;

    // Optional list of image URLs (max 5 images)
    @Size(max = 5, message = "Maximum 5 images allowed")
    private List<String> images;
}