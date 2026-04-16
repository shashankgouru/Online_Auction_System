package com.auction.service;

import com.auction.dto.BidBroadcast;
import com.auction.service.AutoBidService;
import com.auction.dto.BidResponse;
import com.auction.dto.PlaceBidRequest;
import com.auction.entity.Auction;
import com.auction.entity.Bid;
import com.auction.entity.User;
import com.auction.enums.AuctionStatus;
import com.auction.exception.BusinessException;
import com.auction.exception.ForbiddenException;
import com.auction.exception.ResourceNotFoundException;
import com.auction.repository.AuctionRepository;
import com.auction.repository.BidRepository;
import com.auction.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class BidService {

    private final BidRepository bidRepository;
    private final AuctionRepository auctionRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final AutoBidService autoBidService;

    // ── Place bid ─────────────────────────────────────────────────────────────

    @Transactional
    public BidResponse placeBid(String bidderEmail, Long auctionId, PlaceBidRequest request) {

        User bidder = findUserByEmail(bidderEmail);
        Auction auction = findAuctionWithSeller(auctionId);

        // Auction must be ACTIVE
        if (auction.getStatus() != AuctionStatus.ACTIVE) {
            throw new BusinessException("Bidding is only allowed on active auctions");
        }

        // Seller cannot bid on their own auction
        if (auction.getSeller().getId().equals(bidder.getId())) {
            throw new ForbiddenException("You cannot bid on your own auction");
        }

        // Bid must be greater than current price
        BigDecimal currentPrice = auction.getCurrentPrice() != null
                ? auction.getCurrentPrice()
                : auction.getStartingPrice();

        if (request.getAmount().compareTo(currentPrice) <= 0) {
            throw new BusinessException(
                    "Bid must be greater than current price of $" + currentPrice.setScale(2)
            );
        }

        // Bid must meet minimum increment
        BigDecimal minimumRequired = currentPrice.add(auction.getMinimumBidIncrement());
        if (request.getAmount().compareTo(minimumRequired) < 0) {
            throw new BusinessException(
                    "Bid must be at least $" + minimumRequired.setScale(2)
                            + " (current + $" + auction.getMinimumBidIncrement().setScale(2) + " increment)"
            );
        }

        // Save bid — set placedAt explicitly so it is never null in the response
        LocalDateTime now = LocalDateTime.now();
        Bid bid = Bid.builder()
                .auction(auction)
                .bidder(bidder)
                .amount(request.getAmount())
                .rank(1)
                .placedAt(now)
                .build();

        bidRepository.save(bid);

        // Update auction
        auction.setCurrentPrice(request.getAmount());
        auction.setHighestBidder(bidder);
        auction.setTotalBids(auction.getTotalBids() + 1);
        auctionRepository.save(auction);

        BidResponse response = toResponse(bid);

        // Trigger auto-bids from other users who have set a max amount
        autoBidService.triggerAutoBids(auction, bidder);

        // Broadcast to all subscribers of this auction room
        broadcast(BidBroadcast.builder()
                .type("NEW_BID")
                .auctionId(auctionId)
                .currentPrice(auction.getCurrentPrice())
                .totalBids(auction.getTotalBids())
                .highestBidderUsername(bidder.getDisplayUsername())
                .bidId(bid.getId())
                .bidderUsername(bidder.getDisplayUsername())
                .bidAmount(request.getAmount())
                .placedAt(now)
                .build(), auctionId);

        return response;
    }

    // ── Broadcast helper (also called by AuctionScheduler) ───────────────────

    public void broadcast(BidBroadcast message, Long auctionId) {
        messagingTemplate.convertAndSend(
                "/topic/auction/" + auctionId, message
        );
    }

    // ── Get bid history for an auction (paginated) ────────────────────────────

    @Transactional(readOnly = true)
    public Page<BidResponse> getAuctionBidHistory(Long auctionId, int page, int size) {
        Auction auction = findAuctionById(auctionId);
        return bidRepository
                .findByAuctionOrderByPlacedAtDesc(auction, PageRequest.of(page, size))
                .map(this::toResponse);
    }

    // ── Get top N bids ────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<BidResponse> getTopBids(Long auctionId, int limit) {
        Auction auction = findAuctionById(auctionId);
        return bidRepository
                .findTopBidsByAuction(auction, PageRequest.of(0, limit))
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // ── My bids ───────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<BidResponse> getMyBids(String bidderEmail, int page, int size) {
        User bidder = findUserByEmail(bidderEmail);
        return bidRepository
                .findByBidderOrderByPlacedAtDesc(bidder, PageRequest.of(page, size))
                .map(this::toResponse);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private User findUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private Auction findAuctionById(Long id) {
        return auctionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Auction not found with id: " + id));
    }

    private Auction findAuctionWithSeller(Long id) {
        return auctionRepository.findByIdWithSeller(id)
                .orElseThrow(() -> new ResourceNotFoundException("Auction not found with id: " + id));
    }

    private BidResponse toResponse(Bid bid) {
        return BidResponse.builder()
                .id(bid.getId())
                .auctionId(bid.getAuction().getId())
                .auctionTitle(bid.getAuction().getTitle())
                .bidderId(bid.getBidder().getId())
                .bidderUsername(bid.getBidder().getDisplayUsername())
                .amount(bid.getAmount())
                .rank(bid.getRank())
                .placedAt(bid.getPlacedAt())
                .build();
    }
}