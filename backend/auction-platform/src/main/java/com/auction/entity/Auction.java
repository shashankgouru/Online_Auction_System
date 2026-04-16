package com.auction.entity;

import com.auction.enums.AuctionCategory;
import com.auction.enums.AuctionStatus;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "auctions")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Auction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String title;

    @Column(nullable = false, length = 4000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private AuctionCategory category;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "seller_id", nullable = false)
    private User seller;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "highest_bidder_id")
    private User highestBidder;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal startingPrice;

    @Column(precision = 12, scale = 2)
    private BigDecimal reservePrice;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal currentPrice;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal minimumBidIncrement;

    @Column(nullable = false)
    private LocalDateTime startTime;

    @Column(nullable = false)
    private LocalDateTime endTime;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AuctionStatus status;

    @Builder.Default
    @Column(nullable = false)
    private Integer totalBids = 0;

    @ElementCollection
    @CollectionTable(name = "auction_images", joinColumns = @JoinColumn(name = "auction_id"))
    @Column(name = "image_url", length = 1000)
    @Builder.Default
    private List<String> imageList = new ArrayList<>();

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public boolean isReserveMet() {
        return reservePrice == null || (currentPrice != null && currentPrice.compareTo(reservePrice) >= 0);
    }
}
