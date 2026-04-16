package com.auction.dto;

import com.auction.enums.AuctionCategory;
import com.auction.enums.AuctionStatus;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class WatchlistResponse {

    private Long watchlistId;
    private LocalDateTime addedAt;

    // Embedded auction summary
    private Long auctionId;
    private String auctionTitle;
    private AuctionCategory category;
    private AuctionStatus status;
    private BigDecimal currentPrice;
    private Integer totalBids;
    private LocalDateTime endTime;
    private String sellerUsername;
    private String firstImage;
}