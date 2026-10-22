package com.freelance.marketplace.dto;

import java.time.LocalDateTime;

public record NotificationResponse(
        String id,
        String title,
        String content,
        boolean read,
        LocalDateTime createdAt
) {
}
