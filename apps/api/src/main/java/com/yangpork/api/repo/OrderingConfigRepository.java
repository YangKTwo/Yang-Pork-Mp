package com.yangpork.api.repo;

import com.yangpork.api.domain.OrderingConfigEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderingConfigRepository extends JpaRepository<OrderingConfigEntity, Long> {
}
