package com.auction.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class BidResponse {

    private Long id;
    private Long auctionId;
    private String auctionTitle;
    private Long bidderId;
    private String bidderUsername;
    private BigDecimal amount;
    private Integer rank;
    private LocalDateTime placedAt;
}