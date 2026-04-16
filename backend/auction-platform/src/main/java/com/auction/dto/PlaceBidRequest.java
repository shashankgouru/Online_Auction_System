package com.auction.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class PlaceBidRequest {

    @NotNull(message = "Bid amount is required")
    @DecimalMin(value = "0.01", message = "Bid amount must be greater than zero")
    @Digits(integer = 10, fraction = 2, message = "Invalid bid amount format")
    private BigDecimal amount;
}