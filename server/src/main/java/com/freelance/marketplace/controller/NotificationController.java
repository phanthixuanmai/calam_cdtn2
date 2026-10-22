package com.freelance.marketplace.controller;

import com.freelance.marketplace.dto.ApiResponse;
import com.freelance.marketplace.dto.NotificationResponse;
import com.freelance.marketplace.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping("/notifications")
    @PreAuthorize("hasAnyRole('STUDENT','EMPLOYER','ADMIN')")
    public ResponseEntity<ApiResponse<List<NotificationResponse>>> getNotifications() {
        return ResponseEntity.ok(ApiResponse.success("Notifications retrieved successfully", notificationService.getNotificationsForCurrentUser()));
    }

    @PutMapping("/notifications/{id}/read")
    @PreAuthorize("hasAnyRole('STUDENT','EMPLOYER','ADMIN')")
    public ResponseEntity<ApiResponse<NotificationResponse>> markNotificationRead(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success("Notification marked as read", notificationService.markRead(id)));
    }
}
