package com.auction.service;

import com.auction.dto.AuctionResponse;
import com.auction.dto.CreateAuctionRequest;
import com.auction.entity.Auction;
import com.auction.entity.User;
import com.auction.enums.AuctionCategory;
import com.auction.enums.AuctionStatus;
import com.auction.exception.BusinessException;
import com.auction.exception.ForbiddenException;
import com.auction.exception.ResourceNotFoundException;
import com.auction.repository.AuctionRepository;
import com.auction.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AuctionService {

    // Auctions visible on the public browse page
    private static final List<AuctionStatus> VISIBLE_STATUSES =
            List.of(AuctionStatus.ACTIVE, AuctionStatus.SCHEDULED);

    private final AuctionRepository auctionRepository;
    private final UserRepository userRepository;

    // ── Create auction ────────────────────────────────────────────────────────

    @Transactional
    public AuctionResponse createAuction(String sellerEmail, CreateAuctionRequest request) {

        User seller = findUserByEmail(sellerEmail);

        // Only verified sellers can create auctions
        if (!seller.isVerifiedSeller()) {
            throw new ForbiddenException(
                    "Only verified sellers can create auctions. " +
                            "Please apply for seller verification first."
            );
        }

        // End time must be after start time
        if (!request.getEndTime().isAfter(request.getStartTime())) {
            throw new BusinessException("End time must be after start time");
        }

        // End time must be in the future
        if (!request.getEndTime().isAfter(java.time.LocalDateTime.now())) {
            throw new BusinessException("End time must be in the future");
        }

        // Reserve price must be >= starting price if set
        if (request.getReservePrice() != null
                && request.getReservePrice().compareTo(request.getStartingPrice()) < 0) {
            throw new BusinessException("Reserve price must be greater than or equal to starting price");
        }

        BigDecimal increment = request.getMinimumBidIncrement() != null
                ? request.getMinimumBidIncrement()
                : new BigDecimal("1.00");

        Auction auction = Auction.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .category(request.getCategory())
                .seller(seller)
                .startingPrice(request.getStartingPrice())
                .reservePrice(request.getReservePrice())
                .currentPrice(request.getStartingPrice())
                .minimumBidIncrement(increment)
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .status(AuctionStatus.SCHEDULED)
                .build();

        if (request.getImages() != null && !request.getImages().isEmpty()) {
            auction.setImageList(request.getImages());
        }

        auctionRepository.save(auction);
        return toResponse(auction);
    }

    // ── Get single auction ────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public AuctionResponse getAuction(Long id) {
        Auction auction = auctionRepository.findByIdWithSeller(id)
                .orElseThrow(() -> new ResourceNotFoundException("Auction not found with id: " + id));
        return toResponse(auction);
    }

    // ── List all active auctions (paginated) ──────────────────────────────────

    @Transactional(readOnly = true)
    public Page<AuctionResponse> listActiveAuctions(
            int page, int size, String sortBy) {

        Pageable pageable = buildPageable(page, size, sortBy);
        return auctionRepository
                .findByStatusIn(VISIBLE_STATUSES, pageable)
                .map(this::toResponse);
    }

    // ── List auctions by category ─────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<AuctionResponse> listByCategory(
            AuctionCategory category, int page, int size, String sortBy) {

        Pageable pageable = buildPageable(page, size, sortBy);
        return auctionRepository
                .findByStatusInAndCategory(VISIBLE_STATUSES, category, pageable)
                .map(this::toResponse);
    }

    // ── Search auctions ───────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<AuctionResponse> searchAuctions(
            String keyword, AuctionCategory category, int page, int size, String sortBy) {

        Pageable pageable = buildPageable(page, size, sortBy);

        if (category != null) {
            return auctionRepository
                    .searchByKeywordAndCategoryAndStatuses(VISIBLE_STATUSES, category, keyword, pageable)
                    .map(this::toResponse);
        }

        return auctionRepository
                .searchByKeywordAndStatuses(VISIBLE_STATUSES, keyword, pageable)
                .map(this::toResponse);
    }

    // ── Get seller's own auctions ─────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<AuctionResponse> getMyAuctions(
            String sellerEmail, AuctionStatus status, int page, int size) {

        User seller = findUserByEmail(sellerEmail);
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());

        Page<Auction> results = (status != null)
                ? auctionRepository.findBySellerAndStatus(seller, status, pageable)
                : auctionRepository.findBySeller(seller, pageable);

        return results.map(this::toResponse);
    }

    // ── Cancel auction ────────────────────────────────────────────────────────

    @Transactional
    public AuctionResponse cancelAuction(String sellerEmail, Long auctionId) {
        User seller = findUserByEmail(sellerEmail);
        Auction auction = findAuctionById(auctionId);

        // Only the seller who owns it can cancel
        if (!auction.getSeller().getId().equals(seller.getId())) {
            throw new ForbiddenException("You are not the seller of this auction");
        }

        // Can only cancel DRAFT or SCHEDULED auctions
        if (auction.getStatus() == AuctionStatus.ACTIVE) {
            throw new BusinessException(
                    "Cannot cancel an active auction that has bids. Contact support."
            );
        }
        if (auction.getStatus() == AuctionStatus.ENDED
                || auction.getStatus() == AuctionStatus.SOLD
                || auction.getStatus() == AuctionStatus.CANCELLED) {
            throw new BusinessException(
                    "Auction is already " + auction.getStatus().name().toLowerCase()
            );
        }

        auction.setStatus(AuctionStatus.CANCELLED);
        auctionRepository.save(auction);
        return toResponse(auction);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private User findUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private Auction findAuctionById(Long id) {
        return auctionRepository.findByIdWithSeller(id)
                .orElseThrow(() -> new ResourceNotFoundException("Auction not found with id: " + id));
    }

    private Pageable buildPageable(int page, int size, String sortBy) {
        Sort sort = switch (sortBy) {
            case "price_asc"    -> Sort.by("currentPrice").ascending();
            case "price_desc"   -> Sort.by("currentPrice").descending();
            case "ending_soon"  -> Sort.by("endTime").ascending();
            case "newest"       -> Sort.by("createdAt").descending();
            default             -> Sort.by("createdAt").descending();
        };
        return PageRequest.of(page, size, sort);
    }

    // ── Entity → DTO mapper ───────────────────────────────────────────────────

    public AuctionResponse toResponse(Auction auction) {
        return AuctionResponse.builder()
                .id(auction.getId())
                .title(auction.getTitle())
                .description(auction.getDescription())
                .category(auction.getCategory())
                .status(auction.getStatus())
                .sellerId(auction.getSeller().getId())
                .sellerUsername(auction.getSeller().getDisplayUsername())
                .startingPrice(auction.getStartingPrice())
                .reservePrice(auction.getReservePrice())
                .currentPrice(auction.getCurrentPrice())
                .minimumBidIncrement(auction.getMinimumBidIncrement())
                .reserveMet(auction.isReserveMet())
                .startTime(auction.getStartTime())
                .endTime(auction.getEndTime())
                .totalBids(auction.getTotalBids())
                .highestBidderUsername(
                        auction.getHighestBidder() != null
                                ? auction.getHighestBidder().getDisplayUsername()
                                : null
                )
                .images(auction.getImageList())
                .createdAt(auction.getCreatedAt())
                .updatedAt(auction.getUpdatedAt())
                .build();
    }
}