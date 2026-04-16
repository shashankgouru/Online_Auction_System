package com.auction.enums;

public enum AuctionStatus {
    DRAFT,      // Created but not yet published by seller
    SCHEDULED,  // Published, waiting for start time
    ACTIVE,     // Live — bidding is open
    ENDED,      // Time expired — winner being determined
    CANCELLED,  // Cancelled by seller or admin
    SOLD        // Winner confirmed and notified
}