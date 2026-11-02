package com.yangpork.api.repo;

import com.yangpork.api.domain.RefundLedgerEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RefundLedgerRepository extends JpaRepository<RefundLedgerEntity, String> {
    Optional<RefundLedgerEntity> findByOrderId(String orderId);

    boolean existsByOrderId(String orderId);
}
