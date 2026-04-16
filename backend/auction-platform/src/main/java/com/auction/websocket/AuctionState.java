package com.auction.websocket;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.ScheduledFuture;

@Data
@Builder
public class AuctionState {

    private Long auctionId;

    // Price — volatile so all threads see latest value
    private volatile BigDecimal currentPrice;

    private volatile Long highestBidderId;
    private volatile String highestBidderUsername;

    // 15-second countdown — AtomicInteger for thread-safe decrement
    @Builder.Default
    private AtomicInteger remainingTime = new AtomicInteger(15);

    // Active users in the room
    @Builder.Default
    private AtomicInteger activeUsers = new AtomicInteger(0);

    // "ACTIVE" | "ENDED"
    @Builder.Default
    private volatile String status = "ACTIVE";

    // Total bids placed in this live session
    @Builder.Default
    private AtomicLong totalBids = new AtomicLong(0);

    // Reference to the running timer task so we can cancel/restart it
    private volatile ScheduledFuture<?> timerTask;
}