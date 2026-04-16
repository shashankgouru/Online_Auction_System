package com.auction.controller;

import com.auction.dto.AuctionResponse;
import com.auction.dto.CreateAuctionRequest;
import com.auction.enums.AuctionCategory;
import com.auction.enums.AuctionStatus;
import com.auction.service.AuctionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auctions")
@RequiredArgsConstructor
public class AuctionController {

    private final AuctionService auctionService;

    /**
     * POST /api/auctions
     * Requires: JWT token of a VERIFIED SELLER
     * Creates a new auction (starts in SCHEDULED state)
     */
    @PostMapping
    public ResponseEntity<AuctionResponse> createAuction(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody CreateAuctionRequest request
    ) {
        AuctionResponse response = auctionService.createAuction(
                userDetails.getUsername(), request
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * GET /api/auctions/{id}
     * Public — no token required
     * Returns a single auction by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<AuctionResponse> getAuction(@PathVariable Long id) {
        return ResponseEntity.ok(auctionService.getAuction(id));
    }

    /**
     * GET /api/auctions
     * Public — no token required
     * Lists all ACTIVE auctions with pagination and sorting
     * Params: page (default 0), size (default 12), sort (default newest)
     * Sort options: newest, ending_soon, price_asc, price_desc
     */
    @GetMapping
    public ResponseEntity<Page<AuctionResponse>> listAuctions(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(defaultValue = "newest") String sort
    ) {
        return ResponseEntity.ok(
                auctionService.listActiveAuctions(page, size, sort)
        );
    }

    /**
     * GET /api/auctions/category/{category}
     * Public — no token required
     * Lists ACTIVE auctions filtered by category
     */
    @GetMapping("/category/{category}")
    public ResponseEntity<Page<AuctionResponse>> listByCategory(
            @PathVariable AuctionCategory category,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(defaultValue = "newest") String sort
    ) {
        return ResponseEntity.ok(
                auctionService.listByCategory(category, page, size, sort)
        );
    }

    /**
     * GET /api/auctions/search?keyword=watch&category=JEWELRY
     * Public — no token required
     * Searches ACTIVE auctions by keyword in title/description
     * Optional: filter by category
     */
    @GetMapping("/search")
    public ResponseEntity<Page<AuctionResponse>> searchAuctions(
            @RequestParam String keyword,
            @RequestParam(required = false) AuctionCategory category,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(defaultValue = "newest") String sort
    ) {
        return ResponseEntity.ok(
                auctionService.searchAuctions(keyword, category, page, size, sort)
        );
    }

    /**
     * GET /api/auctions/my
     * Requires: JWT token
     * Returns the logged-in seller's own auctions
     * Optional filter by status: DRAFT, SCHEDULED, ACTIVE, ENDED, CANCELLED, SOLD
     */
    @GetMapping("/my")
    public ResponseEntity<Page<AuctionResponse>> getMyAuctions(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) AuctionStatus status,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "12") int size
    ) {
        return ResponseEntity.ok(
                auctionService.getMyAuctions(userDetails.getUsername(), status, page, size)
        );
    }

    /**
     * DELETE /api/auctions/{id}
     * Requires: JWT token of the auction's seller
     * Cancels a DRAFT or SCHEDULED auction
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<AuctionResponse> cancelAuction(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(
                auctionService.cancelAuction(userDetails.getUsername(), id)
        );
    }
}