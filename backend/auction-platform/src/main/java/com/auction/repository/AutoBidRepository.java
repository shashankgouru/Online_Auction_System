package com.auction.repository;

import com.auction.entity.Auction;
import com.auction.entity.AutoBid;
import com.auction.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AutoBidRepository extends JpaRepository<AutoBid, Long> {

    // Find existing auto-bid for a specific user on a specific auction
    Optional<AutoBid> findByAuctionAndBidder(Auction auction, User bidder);

    // Find all active auto-bids for an auction except the current highest bidder
    // Used to trigger competing auto-bids after a manual bid
    @Query("""
            SELECT ab FROM AutoBid ab
            JOIN FETCH ab.bidder
            WHERE ab.auction = :auction
            AND ab.active = true
            AND ab.bidder != :excludeUser
            ORDER BY ab.maxAmount DESC
            """)
    List<AutoBid> findActiveForAuctionExcluding(
            @Param("auction") Auction auction,
            @Param("excludeUser") User excludeUser
    );

    // Check if user has an active auto-bid on this auction
    boolean existsByAuctionAndBidderAndActiveTrue(Auction auction, User bidder);
}