package com.freelance.marketplace.repository;

import com.freelance.marketplace.entity.Application;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;
import java.util.Optional;

public interface ApplicationRepository extends MongoRepository<Application, String> {
    @Query("{ '$or': [ { 'student._id': ?0 }, { 'student.id': ?0 }, { 'student.$id': ?0 }, { 'studentId': ?0 } ] }")
    List<Application> findByStudent_Id(String studentId);

    @Query("{ '$or': [ { 'job._id': ?0 }, { 'job.id': ?0 }, { 'job.$id': ?0 }, { 'jobId': ?0 } ] }")
    List<Application> findByJob_Id(String jobId);

    @Query("{ '$and': [ { '$or': [ { 'student._id': ?0 }, { 'student.id': ?0 }, { 'student.$id': ?0 }, { 'studentId': ?0 } ] }, { '$or': [ { 'job._id': ?1 }, { 'job.id': ?1 }, { 'job.$id': ?1 }, { 'jobId': ?1 } ] } ] }")
    Optional<Application> findByStudent_IdAndJob_Id(String studentId, String jobId);
}
