package com.auction.service;

import com.auction.dto.AutoBidRequest;
import com.auction.dto.AutoBidResponse;
import com.auction.dto.BidBroadcast;
import com.auction.entity.Auction;
import com.auction.entity.AutoBid;
import com.auction.entity.Bid;
import com.auction.entity.User;
import com.auction.enums.AuctionStatus;
import com.auction.exception.BusinessException;
import com.auction.exception.ForbiddenException;
import com.auction.exception.ResourceNotFoundException;
import com.auction.repository.AuctionRepository;
import com.auction.repository.AutoBidRepository;
import com.auction.repository.BidRepository;
import com.auction.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AutoBidService {

    private final AutoBidRepository autoBidRepository;
    private final BidRepository bidRepository;
    private final AuctionRepository auctionRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    // ── Set or update auto-bid ────────────────────────────────────────────────

    @Transactional
    public AutoBidResponse setAutoBid(String bidderEmail, Long auctionId, AutoBidRequest request) {
        User bidder = findUserByEmail(bidderEmail);
        Auction auction = findAuctionById(auctionId);

        if (auction.getStatus() != AuctionStatus.ACTIVE) {
            throw new BusinessException("Auto-bid can only be set on active auctions");
        }
        if (auction.getSeller().getId().equals(bidder.getId())) {
            throw new ForbiddenException("You cannot set an auto-bid on your own auction");
        }

        BigDecimal currentPrice = auction.getCurrentPrice() != null
                ? auction.getCurrentPrice()
                : auction.getStartingPrice();

        if (request.getMaxAmount().compareTo(currentPrice) <= 0) {
            throw new BusinessException(
                    "Max amount must be greater than current price of $"
                            + currentPrice.setScale(2)
            );
        }

        // Create or update existing auto-bid
        Optional<AutoBid> existing = autoBidRepository.findByAuctionAndBidder(auction, bidder);
        AutoBid autoBid;

        if (existing.isPresent()) {
            autoBid = existing.get();
            autoBid.setMaxAmount(request.getMaxAmount());
            autoBid.setActive(true);
            autoBid.setUpdatedAt(LocalDateTime.now());
        } else {
            autoBid = AutoBid.builder()
                    .auction(auction)
                    .bidder(bidder)
                    .maxAmount(request.getMaxAmount())
                    .build();
        }

        autoBidRepository.save(autoBid);
        return toResponse(autoBid);
    }

    // ── Cancel auto-bid ───────────────────────────────────────────────────────

    @Transactional
    public void cancelAutoBid(String bidderEmail, Long auctionId) {
        User bidder = findUserByEmail(bidderEmail);
        Auction auction = findAuctionById(auctionId);

        AutoBid autoBid = autoBidRepository.findByAuctionAndBidder(auction, bidder)
                .orElseThrow(() -> new ResourceNotFoundException("No auto-bid found for this auction"));

        autoBid.setActive(false);
        autoBidRepository.save(autoBid);
    }

    // ── Get my auto-bid for an auction ────────────────────────────────────────

    @Transactional(readOnly = true)
    public Optional<AutoBidResponse> getMyAutoBid(String bidderEmail, Long auctionId) {
        User bidder = findUserByEmail(bidderEmail);
        Auction auction = findAuctionById(auctionId);
        return autoBidRepository.findByAuctionAndBidder(auction, bidder)
                .filter(AutoBid::getActive)
                .map(this::toResponse);
    }

    // ── Trigger auto-bids after a manual bid ──────────────────────────────────
    // Called by BidService after every successful bid.
    // Finds the highest auto-bid that can outbid the current price and fires it.

    @Transactional
    public void triggerAutoBids(Auction auction, User currentHighestBidder) {
        BigDecimal currentPrice = auction.getCurrentPrice();
        BigDecimal increment    = auction.getMinimumBidIncrement();

        // Get all other users' active auto-bids, highest max first
        List<AutoBid> competing = autoBidRepository
                .findActiveForAuctionExcluding(auction, currentHighestBidder);

        for (AutoBid autoBid : competing) {
            BigDecimal nextBid = currentPrice.add(increment);

            // Can this auto-bidder afford to outbid?
            if (autoBid.getMaxAmount().compareTo(nextBid) >= 0) {
                // Place automatic bid
                LocalDateTime now = LocalDateTime.now();
                Bid bid = Bid.builder()
                        .auction(auction)
                        .bidder(autoBid.getBidder())
                        .amount(nextBid)
                        .rank(1)
                        .placedAt(now)
                        .build();

                bidRepository.save(bid);

                auction.setCurrentPrice(nextBid);
                auction.setHighestBidder(autoBid.getBidder());
                auction.setTotalBids(auction.getTotalBids() + 1);
                auctionRepository.save(auction);

                currentPrice = nextBid;

                log.info("Auto-bid fired for {} on auction {} — ${}",
                        autoBid.getBidder().getDisplayUsername(),
                        auction.getId(),
                        nextBid);

                // Broadcast the auto-bid
                messagingTemplate.convertAndSend(
                        "/topic/auction/" + auction.getId(),
                        BidBroadcast.builder()
                                .type("NEW_BID")
                                .auctionId(auction.getId())
                                .currentPrice(nextBid)
                                .totalBids(auction.getTotalBids())
                                .highestBidderUsername(autoBid.getBidder().getDisplayUsername())
                                .bidId(bid.getId())
                                .bidderUsername(autoBid.getBidder().getDisplayUsername())
                                .bidAmount(nextBid)
                                .placedAt(now)
                                .build()
                );

                // Only one auto-bid fires per trigger
                break;
            }
        }
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private User findUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private Auction findAuctionById(Long id) {
        return auctionRepository.findByIdWithSeller(id)
                .orElseThrow(() -> new ResourceNotFoundException("Auction not found"));
    }

    private AutoBidResponse toResponse(AutoBid ab) {
        return AutoBidResponse.builder()
                .id(ab.getId())
                .auctionId(ab.getAuction().getId())
                .auctionTitle(ab.getAuction().getTitle())
                .maxAmount(ab.getMaxAmount())
                .active(ab.getActive())
                .createdAt(ab.getCreatedAt())
                .build();
    }
}