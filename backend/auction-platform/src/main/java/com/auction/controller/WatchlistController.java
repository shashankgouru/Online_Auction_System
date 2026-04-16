package com.auction.controller;

import com.auction.dto.WatchlistResponse;
import com.auction.service.WatchlistService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/user/watchlist")
@RequiredArgsConstructor
public class WatchlistController {

    private final WatchlistService watchlistService;

    /**
     * GET /api/user/watchlist
     * Requires: JWT token
     * Returns paginated watchlist for the logged-in user
     */
    @GetMapping
    public ResponseEntity<Page<WatchlistResponse>> getMyWatchlist(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "12") int size
    ) {
        return ResponseEntity.ok(
                watchlistService.getMyWatchlist(userDetails.getUsername(), page, size)
        );
    }

    /**
     * POST /api/user/watchlist/{auctionId}
     * Requires: JWT token
     * Adds an auction to the user's watchlist
     */
    @PostMapping("/{auctionId}")
    public ResponseEntity<WatchlistResponse> addToWatchlist(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long auctionId
    ) {
        WatchlistResponse response = watchlistService.addToWatchlist(
                userDetails.getUsername(), auctionId
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * DELETE /api/user/watchlist/{auctionId}
     * Requires: JWT token
     * Removes an auction from the user's watchlist
     */
    @DeleteMapping("/{auctionId}")
    public ResponseEntity<Map<String, String>> removeFromWatchlist(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long auctionId
    ) {
        watchlistService.removeFromWatchlist(userDetails.getUsername(), auctionId);
        return ResponseEntity.ok(Map.of("message", "Removed from watchlist"));
    }

    /**
     * GET /api/user/watchlist/{auctionId}/check
     * Requires: JWT token
     * Returns whether the auction is in the user's watchlist
     */
    @GetMapping("/{auctionId}/check")
    public ResponseEntity<Map<String, Boolean>> checkWatchlist(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long auctionId
    ) {
        boolean watching = watchlistService.isWatching(
                userDetails.getUsername(), auctionId
        );
        return ResponseEntity.ok(Map.of("watching", watching));
    }
}