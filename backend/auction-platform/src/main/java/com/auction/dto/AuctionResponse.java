package com.auction.dto;

import com.auction.enums.AuctionCategory;
import com.auction.enums.AuctionStatus;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class AuctionResponse {

    private Long id;
    private String title;
    private String description;
    private AuctionCategory category;
    private AuctionStatus status;

    // Seller info (safe subset — no password/email)
    private Long sellerId;
    private String sellerUsername;

    // Pricing
    private BigDecimal startingPrice;
    private BigDecimal reservePrice;
    private BigDecimal currentPrice;
    private BigDecimal minimumBidIncrement;
    private boolean reserveMet;

    // Timing
    private LocalDateTime startTime;
    private LocalDateTime endTime;

    // Bids
    private Integer totalBids;
    private String highestBidderUsername;

    // Images
    private List<String> images;

    // Audit
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}