package com.auction.config;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

@Configuration
public class JacksonConfig {

    @Bean
    @Primary
    public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();

        // Include ALL fields — never drop null or empty values
        mapper.setSerializationInclusion(JsonInclude.Include.ALWAYS);

        // Serialize enums as their name() string e.g. "ADMIN", "USER"
        mapper.enable(SerializationFeature.WRITE_ENUMS_USING_TO_STRING);

        // Handle Java 8 date/time types (LocalDateTime etc.)
        mapper.registerModule(new JavaTimeModule());

        // Write dates as ISO strings not timestamps
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

        // Accept date strings without time component e.g. "2026-04-11T14:30"
        mapper.disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES);
        mapper.enable(DeserializationFeature.ACCEPT_EMPTY_STRING_AS_NULL_OBJECT);

        return mapper;
    }
}