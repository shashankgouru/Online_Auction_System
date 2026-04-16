package com.auction.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class AutoBidRequest {

    @NotNull(message = "Maximum amount is required")
    @DecimalMin(value = "0.01", message = "Maximum amount must be greater than zero")
    @Digits(integer = 10, fraction = 2, message = "Invalid amount format")
    private BigDecimal maxAmount;
}