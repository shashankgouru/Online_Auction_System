package com.auction.enums;

public enum SellerStatus {
    NONE,       // Regular user, not applied
    PENDING,    // Applied for seller, awaiting admin review
    VERIFIED,   // Approved seller
    REJECTED    // Application rejected
}