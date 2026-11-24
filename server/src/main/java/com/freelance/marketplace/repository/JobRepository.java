package com.freelance.marketplace.repository;

import com.freelance.marketplace.entity.Job;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface JobRepository extends MongoRepository<Job, String> {
    List<Job> findByEmployer_Id(String employerId);
}
