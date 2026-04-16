package com.auction.repository;

import com.auction.entity.Auction;
import com.auction.entity.User;
import com.auction.enums.AuctionCategory;
import com.auction.enums.AuctionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface AuctionRepository extends JpaRepository<Auction, Long> {

    // ── Seller queries ────────────────────────────────────────────────────────

    Page<Auction> findBySeller(User seller, Pageable pageable);

    Page<Auction> findBySellerAndStatus(User seller, AuctionStatus status, Pageable pageable);

    // ── Browse (single status) ────────────────────────────────────────────────

    Page<Auction> findByStatus(AuctionStatus status, Pageable pageable);

    Page<Auction> findByStatusAndCategory(
            AuctionStatus status, AuctionCategory category, Pageable pageable);

    // ── Browse (multiple statuses) ────────────────────────────────────────────

    Page<Auction> findByStatusIn(Collection<AuctionStatus> statuses, Pageable pageable);

    Page<Auction> findByStatusInAndCategory(
            Collection<AuctionStatus> statuses, AuctionCategory category, Pageable pageable);

    // ── Search (multiple statuses) ────────────────────────────────────────────

    @Query("""
            SELECT a FROM Auction a
            WHERE a.status IN :statuses
            AND (LOWER(a.title) LIKE LOWER(CONCAT('%', :keyword, '%'))
              OR LOWER(a.description) LIKE LOWER(CONCAT('%', :keyword, '%')))
            """)
    Page<Auction> searchByKeywordAndStatuses(
            @Param("statuses") Collection<AuctionStatus> statuses,
            @Param("keyword") String keyword,
            Pageable pageable);

    @Query("""
            SELECT a FROM Auction a
            WHERE a.status IN :statuses
            AND a.category = :category
            AND (LOWER(a.title) LIKE LOWER(CONCAT('%', :keyword, '%'))
              OR LOWER(a.description) LIKE LOWER(CONCAT('%', :keyword, '%')))
            """)
    Page<Auction> searchByKeywordAndCategoryAndStatuses(
            @Param("statuses") Collection<AuctionStatus> statuses,
            @Param("category") AuctionCategory category,
            @Param("keyword") String keyword,
            Pageable pageable);

    // ── Lifecycle management ──────────────────────────────────────────────────

    List<Auction> findByStatusAndStartTimeBefore(AuctionStatus status, LocalDateTime now);

    List<Auction> findByStatusAndEndTimeBefore(AuctionStatus status, LocalDateTime now);

    // ── Single auction ────────────────────────────────────────────────────────

    @Query("SELECT a FROM Auction a JOIN FETCH a.seller WHERE a.id = :id")
    Optional<Auction> findByIdWithSeller(@Param("id") Long id);
}