package com.auction.service;

import com.auction.dto.WatchlistResponse;
import com.auction.entity.Auction;
import com.auction.entity.User;
import com.auction.entity.Watchlist;
import com.auction.exception.BusinessException;
import com.auction.exception.ResourceNotFoundException;
import com.auction.repository.AuctionRepository;
import com.auction.repository.UserRepository;
import com.auction.repository.WatchlistRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class WatchlistService {

    private final WatchlistRepository watchlistRepository;
    private final AuctionRepository auctionRepository;
    private final UserRepository userRepository;

    // ── Add to watchlist ──────────────────────────────────────────────────────

    @Transactional
    public WatchlistResponse addToWatchlist(String userEmail, Long auctionId) {
        User user = findUserByEmail(userEmail);
        Auction auction = findAuctionById(auctionId);

        if (watchlistRepository.existsByUserAndAuction(user, auction)) {
            throw new BusinessException("Auction is already in your watchlist");
        }

        Watchlist entry = Watchlist.builder()
                .user(user)
                .auction(auction)
                .build();

        watchlistRepository.save(entry);
        return toResponse(entry);
    }

    // ── Remove from watchlist ─────────────────────────────────────────────────

    @Transactional
    public void removeFromWatchlist(String userEmail, Long auctionId) {
        User user = findUserByEmail(userEmail);
        Auction auction = findAuctionById(auctionId);

        Watchlist entry = watchlistRepository.findByUserAndAuction(user, auction)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Auction is not in your watchlist"
                ));

        watchlistRepository.delete(entry);
    }

    // ── Check if auction is in user's watchlist ───────────────────────────────

    @Transactional(readOnly = true)
    public boolean isWatching(String userEmail, Long auctionId) {
        User user = findUserByEmail(userEmail);
        Auction auction = findAuctionById(auctionId);
        return watchlistRepository.existsByUserAndAuction(user, auction);
    }

    // ── Get user's watchlist (paginated) ──────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<WatchlistResponse> getMyWatchlist(String userEmail, int page, int size) {
        User user = findUserByEmail(userEmail);
        return watchlistRepository
                .findByUserWithAuction(user, PageRequest.of(page, size))
                .map(this::toResponse);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private User findUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private Auction findAuctionById(Long id) {
        return auctionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Auction not found with id: " + id
                ));
    }

    private WatchlistResponse toResponse(Watchlist entry) {
        Auction a = entry.getAuction();
        String firstImage = a.getImageList().isEmpty() ? null : a.getImageList().get(0);

        return WatchlistResponse.builder()
                .watchlistId(entry.getId())
                .addedAt(entry.getAddedAt())
                .auctionId(a.getId())
                .auctionTitle(a.getTitle())
                .category(a.getCategory())
                .status(a.getStatus())
                .currentPrice(a.getCurrentPrice() != null ? a.getCurrentPrice() : a.getStartingPrice())
                .totalBids(a.getTotalBids())
                .endTime(a.getEndTime())
                .sellerUsername(a.getSeller().getDisplayUsername())
                .firstImage(firstImage)
                .build();
    }
}