package com.auction.exception;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
public class ApiError {
    private int status;
    private String message;
    private LocalDateTime timestamp;
    private Map<String, String> fieldErrors;
}