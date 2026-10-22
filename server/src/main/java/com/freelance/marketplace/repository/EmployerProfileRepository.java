package com.freelance.marketplace.repository;

import com.freelance.marketplace.entity.EmployerProfile;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface EmployerProfileRepository extends MongoRepository<EmployerProfile, String> {
}
