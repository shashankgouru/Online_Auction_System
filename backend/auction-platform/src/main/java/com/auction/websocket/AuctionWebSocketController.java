package com.auction.websocket;

import com.auction.dto.BidBroadcast;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.math.BigDecimal;
import java.security.Principal;
import java.util.Map;

@Slf4j
@Controller
@RequiredArgsConstructor
public class AuctionWebSocketController {

    private final LiveAuctionService liveAuctionService;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Client sends: /app/auction/{id}/join
     * Server responds with current room state snapshot sent back to /topic/auction/{id}
     */
    @MessageMapping("/auction/{auctionId}/join")
    public void joinAuction(
            @DestinationVariable Long auctionId,
            SimpMessageHeaderAccessor headerAccessor
    ) {
        try {
            BidBroadcast snapshot = liveAuctionService.joinRoom(auctionId);
            if (snapshot != null) {
                messagingTemplate.convertAndSend(
                        "/topic/auction/" + auctionId, snapshot
                );
            }
        } catch (Exception e) {
            log.error("Error joining auction room {}: {}", auctionId, e.getMessage());
        }
    }

    /**
     * Client sends: /app/auction/{id}/bid
     * Payload: { "amount": 150.00 }
     * The bid is validated, persisted, timer reset, then broadcast to all subscribers
     */
    @MessageMapping("/auction/{auctionId}/bid")
    public void placeBid(
            @DestinationVariable Long auctionId,
            @Payload Map<String, Object> payload,
            Principal principal
    ) {
        if (principal == null) {
            log.warn("Unauthenticated WebSocket bid attempt on auction {}", auctionId);
            return;
        }

        try {
            BigDecimal amount = new BigDecimal(payload.get("amount").toString());
            BidBroadcast broadcast = liveAuctionService.placeLiveBid(
                    auctionId, principal.getName(), amount
            );

            // Broadcast to everyone in the room
            messagingTemplate.convertAndSend(
                    "/topic/auction/" + auctionId, broadcast
            );

        } catch (IllegalArgumentException e) {
            // Send error only to the user who placed the bad bid
            messagingTemplate.convertAndSendToUser(
                    principal.getName(),
                    "/queue/errors",
                    Map.of("type", "BID_ERROR", "message", e.getMessage())
            );
        } catch (Exception e) {
            log.error("Live bid error on auction {}: {}", auctionId, e.getMessage());
        }
    }

    /**
     * Client sends: /app/auction/{id}/leave
     */
    @MessageMapping("/auction/{auctionId}/leave")
    public void leaveAuction(@DestinationVariable Long auctionId) {
        liveAuctionService.leaveRoom(auctionId);
    }
}