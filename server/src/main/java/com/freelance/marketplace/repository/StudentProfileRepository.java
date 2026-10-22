package com.freelance.marketplace.repository;

import com.freelance.marketplace.entity.StudentProfile;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface StudentProfileRepository extends MongoRepository<StudentProfile, String> {
}
