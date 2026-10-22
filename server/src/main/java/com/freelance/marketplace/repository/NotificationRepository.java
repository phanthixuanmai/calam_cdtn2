package com.freelance.marketplace.repository;

import com.freelance.marketplace.entity.Notification;
import com.freelance.marketplace.entity.User;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface NotificationRepository extends MongoRepository<Notification, String> {
    List<Notification> findByUserOrderByCreatedAtDesc(User user);
}
