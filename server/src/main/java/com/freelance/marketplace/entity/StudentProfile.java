package com.freelance.marketplace.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "student_profiles")
public class StudentProfile {

    @Id
    private String id;

    private String bio;

    private String address;

    private String cvUrl;

    private String skills;

    public StudentProfile() {
    }

    public StudentProfile(String id, String bio, String address, String cvUrl, String skills) {
        this.id = id;
        this.bio = bio;
        this.address = address;
        this.cvUrl = cvUrl;
        this.skills = skills;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getBio() { return bio; }
    public void setBio(String bio) { this.bio = bio; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public String getCvUrl() { return cvUrl; }
    public void setCvUrl(String cvUrl) { this.cvUrl = cvUrl; }
    public String getSkills() { return skills; }
    public void setSkills(String skills) { this.skills = skills; }
}
