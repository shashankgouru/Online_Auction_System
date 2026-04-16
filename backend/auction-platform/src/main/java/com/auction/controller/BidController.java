package com.auction.controller;

import com.auction.dto.AutoBidRequest;
import com.auction.dto.AutoBidResponse;
import com.auction.dto.BidResponse;
import com.auction.dto.PlaceBidRequest;
import com.auction.service.AutoBidService;
import com.auction.service.BidService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequiredArgsConstructor
public class BidController {

    private final BidService bidService;
    private final AutoBidService autoBidService;

    /**
     * POST /api/auctions/{id}/bids
     * Places a manual bid on the auction
     */
    @PostMapping("/api/auctions/{id}/bids")
    public ResponseEntity<BidResponse> placeBid(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id,
            @Valid @RequestBody PlaceBidRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(bidService.placeBid(userDetails.getUsername(), id, request));
    }

    /**
     * GET /api/auctions/{id}/bids
     * Public — paginated bid history newest first
     */
    @GetMapping("/api/auctions/{id}/bids")
    public ResponseEntity<Page<BidResponse>> getAuctionBidHistory(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(bidService.getAuctionBidHistory(id, page, size));
    }

    /**
     * GET /api/auctions/{id}/bids/top
     * Public — top N bids for detail page
     */
    @GetMapping("/api/auctions/{id}/bids/top")
    public ResponseEntity<List<BidResponse>> getTopBids(
            @PathVariable Long id,
            @RequestParam(defaultValue = "5") int limit
    ) {
        return ResponseEntity.ok(bidService.getTopBids(id, limit));
    }

    /**
     * GET /api/user/bids
     * Requires JWT — user's own bid history
     */
    @GetMapping("/api/user/bids")
    public ResponseEntity<Page<BidResponse>> getMyBids(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(bidService.getMyBids(userDetails.getUsername(), page, size));
    }

    // ── Auto-bid endpoints ────────────────────────────────────────────────────

    /**
     * POST /api/auctions/{id}/auto-bid
     * Set or update an auto-bid with a maximum amount
     */
    @PostMapping("/api/auctions/{id}/auto-bid")
    public ResponseEntity<AutoBidResponse> setAutoBid(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id,
            @Valid @RequestBody AutoBidRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(autoBidService.setAutoBid(userDetails.getUsername(), id, request));
    }

    /**
     * GET /api/auctions/{id}/auto-bid
     * Get the current user's auto-bid for this auction
     */
    @GetMapping("/api/auctions/{id}/auto-bid")
    public ResponseEntity<AutoBidResponse> getMyAutoBid(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id
    ) {
        Optional<AutoBidResponse> result = autoBidService.getMyAutoBid(
                userDetails.getUsername(), id
        );
        return result.map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    /**
     * DELETE /api/auctions/{id}/auto-bid
     * Cancel the current user's auto-bid
     */
    @DeleteMapping("/api/auctions/{id}/auto-bid")
    public ResponseEntity<Map<String, String>> cancelAutoBid(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id
    ) {
        autoBidService.cancelAutoBid(userDetails.getUsername(), id);
        return ResponseEntity.ok(Map.of("message", "Auto-bid cancelled"));
    }
}