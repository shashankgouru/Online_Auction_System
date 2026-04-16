package com.auction.repository;

import com.auction.entity.User;
import com.auction.enums.Role;
import com.auction.enums.SellerStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    Optional<User> findByUsername(String username);

    boolean existsByEmail(String email);

    boolean existsByUsername(String username);

    // Used during profile update — checks username taken by someone ELSE
    boolean existsByUsernameAndIdNot(String username, Long id);

    List<User> findByRole(Role role);

    List<User> findBySellerStatus(SellerStatus sellerStatus);

    List<User> findByRoleAndSellerStatus(Role role, SellerStatus sellerStatus);
}