package com.auction.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class AutoBidResponse {

    private Long id;
    private Long auctionId;
    private String auctionTitle;
    private BigDecimal maxAmount;
    private Boolean active;
    private LocalDateTime createdAt;
}