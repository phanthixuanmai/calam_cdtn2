-- LEGACY ONLY: This MySQL schema is not used by the current MongoDB backend.
-- Keep for historical reference; do not execute for this application.

CREATE DATABASE IF NOT EXISTS freelance_marketplace;
USE freelance_marketplace;

CREATE TABLE IF NOT EXISTS users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role ENUM('STUDENT', 'EMPLOYER', 'ADMIN') NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS student_profiles (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL UNIQUE,
    bio TEXT,
    address VARCHAR(255),
    cv_url VARCHAR(255),
    skills VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS employer_profiles (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL UNIQUE,
    company_name VARCHAR(255),
    description TEXT,
    website VARCHAR(255),
    location VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS jobs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(255),
    location VARCHAR(255),
    salary_range VARCHAR(255),
    status ENUM('OPEN', 'FILLED', 'COMPLETED', 'CLOSED') DEFAULT 'OPEN',
    employer_id BIGINT NOT NULL,
    start_date DATETIME,
    end_date DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employer_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS applications (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    job_id BIGINT NOT NULL,
    student_id BIGINT NOT NULL,
    cv_url VARCHAR(255),
    cover_letter TEXT,
    status ENUM('PENDING', 'ACCEPTED', 'REJECTED') DEFAULT 'PENDING',
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES jobs(id),
    FOREIGN KEY (student_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS reviews (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    reviewer_id BIGINT NOT NULL,
    reviewee_id BIGINT NOT NULL,
    target_type ENUM('STUDENT', 'EMPLOYER') NOT NULL,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reviewer_id) REFERENCES users(id),
    FOREIGN KEY (reviewee_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

INSERT INTO users (email, username, password, name, phone, role, enabled)
VALUES
('admin@marketplace.com', 'admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJd.9RLTbC6', 'Admin', '0900000000', 'ADMIN', TRUE),
('employer@marketplace.com', 'employer', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJd.9RLTbC6', 'Employer Demo', '0901111111', 'EMPLOYER', TRUE),
('student@marketplace.com', 'student', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJd.9RLTbC6', 'Student Demo', '0902222222', 'STUDENT', TRUE);

INSERT INTO student_profiles (user_id, bio, address, cv_url, skills)
VALUES (3, 'Sinh viên lập trình chuyên nghiệp.', 'Hà Nội', 'cv-demo.pdf', 'Java, React, Spring Boot');

INSERT INTO employer_profiles (user_id, company_name, description, website, location)
VALUES (2, 'ABC Studio', 'Công ty tuyển dụng sinh viên part-time.', 'https://example.com', 'Hà Nội');
