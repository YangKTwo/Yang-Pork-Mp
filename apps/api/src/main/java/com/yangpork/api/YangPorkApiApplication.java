package com.yangpork.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class YangPorkApiApplication {
    public static void main(String[] args) {
        SpringApplication.run(YangPorkApiApplication.class, args);
    }
}
