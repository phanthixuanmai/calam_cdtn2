package com.freelance.marketplace.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "employer_profiles")
public class EmployerProfile {

    @Id
    private String id;

    private String companyName;

    private String description;

    private String website;

    private String location;

    public EmployerProfile() {
    }

    public EmployerProfile(String id, String companyName, String description, String website, String location) {
        this.id = id;
        this.companyName = companyName;
        this.description = description;
        this.website = website;
        this.location = location;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getCompanyName() { return companyName; }
    public void setCompanyName(String companyName) { this.companyName = companyName; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getWebsite() { return website; }
    public void setWebsite(String website) { this.website = website; }
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
}
