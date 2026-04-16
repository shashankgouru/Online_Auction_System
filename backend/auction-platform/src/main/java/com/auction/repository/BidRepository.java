package com.auction.repository;

import com.auction.entity.Auction;
import com.auction.entity.Bid;
import com.auction.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BidRepository extends JpaRepository<Bid, Long> {

    // All bids for an auction ordered newest first
    Page<Bid> findByAuctionOrderByPlacedAtDesc(Auction auction, Pageable pageable);

    // All bids placed by a specific user
    Page<Bid> findByBidderOrderByPlacedAtDesc(User bidder, Pageable pageable);

    // Highest bid on an auction
    @Query("SELECT b FROM Bid b WHERE b.auction = :auction ORDER BY b.amount DESC LIMIT 1")
    Optional<Bid> findHighestBidForAuction(@Param("auction") Auction auction);

    // Count of bids on an auction
    long countByAuction(Auction auction);

    // Check if a user has already bid on an auction
    boolean existsByAuctionAndBidder(Auction auction, User bidder);

    // All bids for an auction ordered by amount desc (for bid history display)
    @Query("""
            SELECT b FROM Bid b
            JOIN FETCH b.bidder
            WHERE b.auction = :auction
            ORDER BY b.amount DESC
            """)
    List<Bid> findTopBidsByAuction(@Param("auction") Auction auction, Pageable pageable);
}