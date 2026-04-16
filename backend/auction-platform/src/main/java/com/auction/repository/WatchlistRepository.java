package com.auction.repository;

import com.auction.entity.Auction;
import com.auction.entity.User;
import com.auction.entity.Watchlist;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface WatchlistRepository extends JpaRepository<Watchlist, Long> {

    boolean existsByUserAndAuction(User user, Auction auction);

    Optional<Watchlist> findByUserAndAuction(User user, Auction auction);

    // Fetch watchlist entries with auction and seller eagerly to avoid N+1
    @Query("""
            SELECT w FROM Watchlist w
            JOIN FETCH w.auction a
            JOIN FETCH a.seller
            WHERE w.user = :user
            ORDER BY w.addedAt DESC
            """)
    Page<Watchlist> findByUserWithAuction(@Param("user") User user, Pageable pageable);

    long countByUser(User user);
}