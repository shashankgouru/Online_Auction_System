package com.auction.config;

import com.auction.entity.User;
import com.auction.enums.Role;
import com.auction.enums.SellerStatus;
import com.auction.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${admin.seed.email}")
    private String adminEmail;

    @Value("${admin.seed.password}")
    private String adminPassword;

    @Value("${admin.seed.username}")
    private String adminUsername;

    @Value("${admin.seed.firstName}")
    private String adminFirstName;

    @Value("${admin.seed.lastName}")
    private String adminLastName;

    @Override
    public void run(String... args) {

        // ── Case 1: Admin already exists by role ─────────────────────────────
        List<User> existingAdmins = userRepository.findByRole(Role.ADMIN);
        if (!existingAdmins.isEmpty()) {
            User existing = existingAdmins.get(0);

            // Repair: make sure existing admin has emailVerified=true and isActive=true
            boolean repaired = false;
            if (!existing.getEmailVerified()) {
                existing.setEmailVerified(true);
                repaired = true;
            }
            if (!existing.getIsActive()) {
                existing.setIsActive(true);
                repaired = true;
            }
            if (repaired) {
                userRepository.save(existing);
                log.info("Admin account repaired — emailVerified and isActive set to true");
            } else {
                log.info("Admin account already exists — skipping seed. Email: {}", existing.getEmail());
            }
            return;
        }

        // ── Case 2: Email already taken by non-admin — promote them ──────────
        Optional<User> existingByEmail = userRepository.findByEmail(adminEmail);
        if (existingByEmail.isPresent()) {
            User u = existingByEmail.get();
            u.setRole(Role.ADMIN);
            u.setSellerStatus(SellerStatus.VERIFIED);
            u.setEmailVerified(true);
            u.setIsActive(true);
            userRepository.save(u);
            log.info("Promoted existing account '{}' to ADMIN", adminEmail);
            return;
        }

        // ── Case 3: Username taken — log a clear warning ──────────────────────
        if (userRepository.existsByUsername(adminUsername)) {
            log.warn("⚠ Admin seed SKIPPED — username '{}' is taken by another user. " +
                    "Change admin.seed.username in application.properties and restart.", adminUsername);
            return;
        }

        // ── Case 4: Create fresh admin ────────────────────────────────────────
        User admin = User.builder()
                .email(adminEmail)
                .password(passwordEncoder.encode(adminPassword))
                .username(adminUsername)
                .firstName(adminFirstName)
                .lastName(adminLastName)
                .role(Role.ADMIN)
                .sellerStatus(SellerStatus.VERIFIED)
                .isActive(true)
                .emailVerified(true)
                .build();

        userRepository.save(admin);

        log.info("══════════════════════════════════════════════");
        log.info("  ✓ Admin account created successfully");
        log.info("  Email   : {}", adminEmail);
        log.info("  Username: {}", adminUsername);
        log.info("  Password: (as set in application.properties)");
        log.info("  ⚠ Change your password after first login!");
        log.info("══════════════════════════════════════════════");
    }
}