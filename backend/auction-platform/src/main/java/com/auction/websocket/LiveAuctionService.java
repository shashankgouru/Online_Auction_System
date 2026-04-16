package com.auction.websocket;

import com.auction.dto.BidBroadcast;
import com.auction.entity.Auction;
import com.auction.entity.Bid;
import com.auction.entity.User;
import com.auction.enums.AuctionStatus;
import com.auction.repository.AuctionRepository;
import com.auction.repository.BidRepository;
import com.auction.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class LiveAuctionService {

    private final AuctionStateManager stateManager;
    private final AuctionRepository auctionRepository;
    private final BidRepository bidRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    // ── Join room ─────────────────────────────────────────────────────────────
    // Called when a client subscribes to /topic/auction/{id}
    // Creates the in-memory room if it doesn't exist yet

    public BidBroadcast joinRoom(Long auctionId) {
        Optional<AuctionState> existing = stateManager.getAuctionState(auctionId);

        if (existing.isPresent()) {
            int users = stateManager.userJoined(auctionId);
            AuctionState state = existing.get();
            return currentStateSnapshot(state, users);
        }

        // Room doesn't exist yet — load from DB and create
        Auction auction = auctionRepository.findByIdWithSeller(auctionId)
                .orElse(null);

        if (auction == null || auction.getStatus() != AuctionStatus.ACTIVE) {
            // Return a snapshot without creating a room
            if (auction != null) {
                return BidBroadcast.builder()
                        .type("ROOM_STATE")
                        .auctionId(auctionId)
                        .currentPrice(auction.getCurrentPrice() != null
                                ? auction.getCurrentPrice()
                                : auction.getStartingPrice())
                        .totalBids(auction.getTotalBids())
                        .highestBidderUsername(
                                auction.getHighestBidder() != null
                                        ? auction.getHighestBidder().getDisplayUsername()
                                        : null
                        )
                        .remainingTime(0)
                        .activeUsers(0)
                        .build();
            }
            return null;
        }

        AuctionState state = stateManager.createAuctionState(
                auctionId,
                auction.getCurrentPrice() != null
                        ? auction.getCurrentPrice()
                        : auction.getStartingPrice(),
                auction.getHighestBidder() != null ? auction.getHighestBidder().getId() : null,
                auction.getHighestBidder() != null
                        ? auction.getHighestBidder().getDisplayUsername()
                        : null,
                auction.getTotalBids()
        );

        int users = stateManager.userJoined(auctionId);
        return currentStateSnapshot(state, users);
    }

    // ── Place live bid ────────────────────────────────────────────────────────
    // Synchronized on auction ID to prevent race conditions

    public synchronized BidBroadcast placeLiveBid(
            Long auctionId, String bidderEmail, BigDecimal amount
    ) {
        // Get room state
        AuctionState state = stateManager.getAuctionState(auctionId)
                .orElseGet(() -> {
                    joinRoom(auctionId);
                    return stateManager.getAuctionState(auctionId).orElse(null);
                });

        if (state == null || !"ACTIVE".equals(state.getStatus())) {
            throw new IllegalStateException("Auction room is not active");
        }

        // Load bidder
        User bidder = userRepository.findByEmail(bidderEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        // Load auction for DB validation
        Auction auction = auctionRepository.findByIdWithSeller(auctionId)
                .orElseThrow(() -> new IllegalArgumentException("Auction not found"));

        if (auction.getStatus() != AuctionStatus.ACTIVE) {
            throw new IllegalStateException("Auction is not active");
        }

        // Seller cannot bid on own auction
        if (auction.getSeller().getId().equals(bidder.getId())) {
            throw new IllegalArgumentException("You cannot bid on your own auction");
        }

        // Validate amount > current price
        BigDecimal currentPrice = state.getCurrentPrice();
        if (amount.compareTo(currentPrice) <= 0) {
            throw new IllegalArgumentException(
                    "Bid must be greater than current price of $" + currentPrice.setScale(2)
            );
        }

        // Validate minimum increment
        BigDecimal minRequired = currentPrice.add(auction.getMinimumBidIncrement());
        if (amount.compareTo(minRequired) < 0) {
            throw new IllegalArgumentException(
                    "Bid must be at least $" + minRequired.setScale(2)
            );
        }

        // Persist bid
        LocalDateTime now = LocalDateTime.now();
        Bid bid = Bid.builder()
                .auction(auction)
                .bidder(bidder)
                .amount(amount)
                .rank(1)
                .placedAt(now)
                .build();
        bidRepository.save(bid);

        // Update DB auction
        auction.setCurrentPrice(amount);
        auction.setHighestBidder(bidder);
        auction.setTotalBids(auction.getTotalBids() + 1);
        auctionRepository.save(auction);

        // Update in-memory state + reset 15-second timer
        stateManager.updateBid(auctionId, amount, bidder.getId(), bidder.getDisplayUsername());

        // Build and return broadcast message
        return BidBroadcast.builder()
                .type("NEW_BID")
                .auctionId(auctionId)
                .currentPrice(amount)
                .totalBids((int) state.getTotalBids().get())
                .highestBidderUsername(bidder.getDisplayUsername())
                .bidId(bid.getId())
                .bidderUsername(bidder.getDisplayUsername())
                .bidAmount(amount)
                .placedAt(now)
                .remainingTime(15)
                .activeUsers(state.getActiveUsers().get())
                .build();
    }

    // ── Leave room ────────────────────────────────────────────────────────────

    public void leaveRoom(Long auctionId) {
        stateManager.userLeft(auctionId);
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private BidBroadcast currentStateSnapshot(AuctionState state, int users) {
        return BidBroadcast.builder()
                .type("ROOM_STATE")
                .auctionId(state.getAuctionId())
                .currentPrice(state.getCurrentPrice())
                .totalBids((int) state.getTotalBids().get())
                .highestBidderUsername(state.getHighestBidderUsername())
                .remainingTime(state.getRemainingTime().get())
                .activeUsers(users)
                .build();
    }
}