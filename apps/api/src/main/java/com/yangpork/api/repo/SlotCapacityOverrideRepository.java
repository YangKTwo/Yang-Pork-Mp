package com.yangpork.api.repo;

import com.yangpork.api.domain.PickupSlot;
import com.yangpork.api.domain.SlotCapacityOverrideEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface SlotCapacityOverrideRepository extends JpaRepository<SlotCapacityOverrideEntity, Long> {
    Optional<SlotCapacityOverrideEntity> findByPickupDateAndSlot(LocalDate pickupDate, PickupSlot slot);

    List<SlotCapacityOverrideEntity> findByPickupDate(LocalDate pickupDate);

    @Transactional
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from SlotCapacityOverrideEntity e where e.pickupDate = :pickupDate")
    int deleteByPickupDate(@Param("pickupDate") LocalDate pickupDate);
}
