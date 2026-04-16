package com.auction.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class BidBroadcast {

    // Message type: NEW_BID | TIMER_TICK | AUCTION_ENDED | ROOM_STATE
    private String type;

    // Auction state
    private Long auctionId;
    private BigDecimal currentPrice;
    private Integer totalBids;
    private String highestBidderUsername;
    private String winnerUsername;

    // The specific bid that triggered this event (NEW_BID only)
    private Long bidId;
    private String bidderUsername;
    private BigDecimal bidAmount;
    private LocalDateTime placedAt;

    // Live room data
    private Integer remainingTime;  // seconds left on 15-second timer
    private Integer activeUsers;    // users currently in the room
}