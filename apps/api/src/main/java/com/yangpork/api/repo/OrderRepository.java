package com.yangpork.api.repo;

import com.yangpork.api.domain.OrderEntity;
import com.yangpork.api.domain.OrderSource;
import com.yangpork.api.domain.OrderStatus;
import com.yangpork.api.domain.PickupSlot;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<OrderEntity, String> {
    Optional<OrderEntity> findByUserIdAndIdempotencyKey(String userId, String idempotencyKey);
    Page<OrderEntity> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);

    @Query("""
        SELECT o FROM OrderEntity o WHERE o.source = :source
        AND (:pickupDate IS NULL OR o.pickupDate = :pickupDate)
        AND (:status IS NULL OR o.status = :status)
        AND (:pickupCode IS NULL OR o.pickupCode = :pickupCode)
        AND (:pickupSlot IS NULL OR o.pickupSlot = :pickupSlot)
        ORDER BY o.createdAt DESC
        """)
    Page<OrderEntity> searchShop(@Param("source") OrderSource source,
                                 @Param("pickupDate") LocalDate pickupDate,
                                 @Param("status") OrderStatus status,
                                 @Param("pickupCode") String pickupCode,
                                 @Param("pickupSlot") PickupSlot pickupSlot,
                                 Pageable pageable);

    List<OrderEntity> findByStatusAndPayExpireAtBefore(OrderStatus status, Instant before);

    List<OrderEntity> findByStatusInAndPickupDateBefore(Collection<OrderStatus> statuses, LocalDate pickupDate);

    List<OrderEntity> findByStatusInAndPickupDateLessThanEqual(Collection<OrderStatus> statuses, LocalDate pickupDate);

    long countByPickupDateAndPickupSlotAndStatusIn(LocalDate pickupDate, PickupSlot pickupSlot,
                                                    Collection<OrderStatus> statuses);
}
