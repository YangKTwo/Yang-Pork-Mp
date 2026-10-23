package com.yangpork.api.repo;

import com.yangpork.api.domain.OrderItemEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface OrderItemRepository extends JpaRepository<OrderItemEntity, Long> {
    List<OrderItemEntity> findByOrderId(String orderId);
}
