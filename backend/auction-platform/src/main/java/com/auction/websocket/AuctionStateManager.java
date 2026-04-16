package com.auction.websocket;

import com.auction.dto.BidBroadcast;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.*;

@Slf4j
@Component
@RequiredArgsConstructor
public class AuctionStateManager {

    private final SimpMessagingTemplate messagingTemplate;

    // In-memory store of all currently active auction rooms
    private final Map<Long, AuctionState> activeRooms = new ConcurrentHashMap<>();

    // Single-threaded scheduler — ticks every second for all active rooms
    private final ScheduledExecutorService scheduler =
            Executors.newSingleThreadScheduledExecutor();

    // ── Create room ───────────────────────────────────────────────────────────

    public AuctionState createAuctionState(
            Long auctionId,
            BigDecimal currentPrice,
            Long highestBidderId,
            String highestBidderUsername,
            long totalBids
    ) {
        AuctionState state = AuctionState.builder()
                .auctionId(auctionId)
                .currentPrice(currentPrice)
                .highestBidderId(highestBidderId)
                .highestBidderUsername(highestBidderUsername)
                .build();
        state.getTotalBids().set(totalBids);

        activeRooms.put(auctionId, state);
        startTimer(state);

        log.info("Live auction room created for auction {}", auctionId);
        return state;
    }

    // ── Get room ──────────────────────────────────────────────────────────────

    public Optional<AuctionState> getAuctionState(Long auctionId) {
        return Optional.ofNullable(activeRooms.get(auctionId));
    }

    public boolean roomExists(Long auctionId) {
        return activeRooms.containsKey(auctionId);
    }

    // ── Update bid ────────────────────────────────────────────────────────────

    public void updateBid(
            Long auctionId,
            BigDecimal newPrice,
            Long bidderId,
            String bidderUsername
    ) {
        AuctionState state = activeRooms.get(auctionId);
        if (state == null) return;

        state.setCurrentPrice(newPrice);
        state.setHighestBidderId(bidderId);
        state.setHighestBidderUsername(bidderUsername);
        state.getTotalBids().incrementAndGet();
        resetTimer(state);
    }

    // ── User join/leave ───────────────────────────────────────────────────────

    public int userJoined(Long auctionId) {
        AuctionState state = activeRooms.get(auctionId);
        if (state == null) return 0;
        return state.getActiveUsers().incrementAndGet();
    }

    public int userLeft(Long auctionId) {
        AuctionState state = activeRooms.get(auctionId);
        if (state == null) return 0;
        int count = state.getActiveUsers().decrementAndGet();
        return Math.max(count, 0);
    }

    // ── Timer ─────────────────────────────────────────────────────────────────

    private void startTimer(AuctionState state) {
        state.getRemainingTime().set(15);

        ScheduledFuture<?> task = scheduler.scheduleAtFixedRate(() -> {
            try {
                tick(state);
            } catch (Exception e) {
                log.error("Timer error for auction {}: {}", state.getAuctionId(), e.getMessage());
            }
        }, 1, 1, TimeUnit.SECONDS);

        state.setTimerTask(task);
    }

    public void resetTimer(AuctionState state) {
        state.getRemainingTime().set(15);
        // Timer task keeps running — it just reads the reset value on next tick
    }

    private void tick(AuctionState state) {
        if (!"ACTIVE".equals(state.getStatus())) return;

        int remaining = state.getRemainingTime().decrementAndGet();

        // Broadcast timer tick to all subscribers
        messagingTemplate.convertAndSend(
                "/topic/auction/" + state.getAuctionId(),
                BidBroadcast.builder()
                        .type("TIMER_TICK")
                        .auctionId(state.getAuctionId())
                        .remainingTime(remaining)
                        .currentPrice(state.getCurrentPrice())
                        .totalBids((int) state.getTotalBids().get())
                        .highestBidderUsername(state.getHighestBidderUsername())
                        .activeUsers(state.getActiveUsers().get())
                        .build()
        );

        if (remaining <= 0) {
            endAuction(state.getAuctionId());
        }
    }

    // ── End auction ───────────────────────────────────────────────────────────

    public void endAuction(Long auctionId) {
        AuctionState state = activeRooms.get(auctionId);
        if (state == null || "ENDED".equals(state.getStatus())) return;

        state.setStatus("ENDED");

        // Cancel the timer
        if (state.getTimerTask() != null) {
            state.getTimerTask().cancel(false);
        }

        // Broadcast final result
        messagingTemplate.convertAndSend(
                "/topic/auction/" + auctionId,
                BidBroadcast.builder()
                        .type("AUCTION_ENDED")
                        .auctionId(auctionId)
                        .currentPrice(state.getCurrentPrice())
                        .totalBids((int) state.getTotalBids().get())
                        .winnerUsername(state.getHighestBidderUsername())
                        .highestBidderUsername(state.getHighestBidderUsername())
                        .remainingTime(0)
                        .activeUsers(state.getActiveUsers().get())
                        .build()
        );

        // Remove from memory after a short delay to let final messages propagate
        scheduler.schedule(() -> activeRooms.remove(auctionId), 5, TimeUnit.SECONDS);

        log.info("Live auction {} ended. Winner: {}", auctionId, state.getHighestBidderUsername());
    }
}