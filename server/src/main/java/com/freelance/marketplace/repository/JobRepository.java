package com.freelance.marketplace.repository;

import com.freelance.marketplace.entity.Job;
import com.freelance.marketplace.entity.User;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface JobRepository extends MongoRepository<Job, String> {
    List<Job> findByEmployer(User employer);
}
