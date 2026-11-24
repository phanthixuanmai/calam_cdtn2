package com.freelance.marketplace;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class FreelanceMarketplaceApplication {

    public static void main(String[] args) {
        SpringApplication.run(FreelanceMarketplaceApplication.class, args);
    }
}