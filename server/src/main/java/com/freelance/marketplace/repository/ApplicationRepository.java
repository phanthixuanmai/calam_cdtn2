package com.freelance.marketplace.repository;

import com.freelance.marketplace.entity.Application;
import com.freelance.marketplace.entity.Job;
import com.freelance.marketplace.entity.User;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface ApplicationRepository extends MongoRepository<Application, String> {
    List<Application> findByStudent(User student);
    List<Application> findByJob(Job job);
    Optional<Application> findByStudentAndJob(User student, Job job);
}
