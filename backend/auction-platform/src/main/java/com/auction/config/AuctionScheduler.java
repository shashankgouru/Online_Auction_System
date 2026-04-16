package com.auction.config;

import com.auction.dto.BidBroadcast;
import com.auction.entity.Auction;
import com.auction.enums.AuctionStatus;
import com.auction.repository.AuctionRepository;
import com.auction.service.BidService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Component
@EnableScheduling
@RequiredArgsConstructor
public class AuctionScheduler {

    private final AuctionRepository auctionRepository;
    private final BidService bidService;

    /**
     * Every 30 seconds — activates SCHEDULED auctions whose startTime has passed.
     */
    @Scheduled(fixedDelay = 30000)
    @Transactional
    public void activateScheduledAuctions() {
        List<Auction> toActivate = auctionRepository
                .findByStatusAndStartTimeBefore(AuctionStatus.SCHEDULED, LocalDateTime.now());

        if (!toActivate.isEmpty()) {
            toActivate.forEach(a -> a.setStatus(AuctionStatus.ACTIVE));
            auctionRepository.saveAll(toActivate);
            log.info("Activated {} auction(s)", toActivate.size());
        }
    }

    /**
     * Every 30 seconds — ends ACTIVE auctions whose endTime has passed.
     * Declares winner = highestBidder if one exists, otherwise ENDED with no winner.
     * Broadcasts AUCTION_ENDED to all live subscribers.
     */
    @Scheduled(fixedDelay = 30000)
    @Transactional
    public void endExpiredAuctions() {
        List<Auction> toEnd = auctionRepository
                .findByStatusAndEndTimeBefore(AuctionStatus.ACTIVE, LocalDateTime.now());

        for (Auction auction : toEnd) {
            String winnerUsername = null;

            if (auction.getHighestBidder() != null) {
                // Has bids — winner is highest bidder
                auction.setStatus(AuctionStatus.SOLD);
                winnerUsername = auction.getHighestBidder().getDisplayUsername();
                log.info("Auction {} SOLD to {}", auction.getId(), winnerUsername);
            } else {
                // No bids — just ended
                auction.setStatus(AuctionStatus.ENDED);
                log.info("Auction {} ENDED with no bids", auction.getId());
            }

            auctionRepository.save(auction);;

            // Broadcast to all users watching this auction
            bidService.broadcast(BidBroadcast.builder()
                    .type("AUCTION_ENDED")
                    .auctionId(auction.getId())
                    .currentPrice(auction.getCurrentPrice())
                    .totalBids(auction.getTotalBids())
                    .highestBidderUsername(winnerUsername)
                    .winnerUsername(winnerUsername)
                    .build(), auction.getId());
        }
    }
}