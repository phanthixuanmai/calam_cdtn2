package com.freelance.marketplace.service;

import com.freelance.marketplace.dto.NotificationResponse;
import com.freelance.marketplace.entity.Notification;
import com.freelance.marketplace.entity.User;
import com.freelance.marketplace.exception.ResourceNotFoundException;
import com.freelance.marketplace.repository.NotificationRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserService userService;

    public NotificationService(NotificationRepository notificationRepository, UserService userService) {
        this.notificationRepository = notificationRepository;
        this.userService = userService;
    }

    public void createNotification(User user, String title, String content) {
        Notification notification = new Notification();
        notification.setUser(user);
        notification.setTitle(title);
        notification.setContent(content);
        notification.setRead(false);
        notificationRepository.save(notification);
    }

    public List<NotificationResponse> getNotificationsForCurrentUser() {
        User user = userService.getCurrentUser();
        return notificationRepository.findByUserOrderByCreatedAtDesc(user)
                .stream()
                .map(item -> new NotificationResponse(
                        item.getId(),
                        item.getTitle(),
                        item.getContent(),
                        item.isRead(),
                        item.getCreatedAt()))
                .toList();
    }

    public NotificationResponse markRead(String id) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));
        User currentUser = userService.getCurrentUser();
        if (notification.getUser() == null || !notification.getUser().getId().equals(currentUser.getId())) {
            throw new AccessDeniedException("You are not allowed to update this notification");
        }

        notification.setRead(true);
        Notification saved = notificationRepository.save(notification);
        return new NotificationResponse(saved.getId(), saved.getTitle(), saved.getContent(), saved.isRead(), saved.getCreatedAt());
    }
}
