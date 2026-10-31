package com.yangpork.api.domain;

import jakarta.persistence.*;

import java.time.LocalDate;

@Entity
@Table(name = "slot_capacity_override", uniqueConstraints = {
        @UniqueConstraint(name = "uk_slot_capacity_date_slot", columnNames = {"pickup_date", "slot"})
})
public class SlotCapacityOverrideEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "pickup_date", nullable = false)
    private LocalDate pickupDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "slot", nullable = false, length = 16)
    private PickupSlot slot;

    @Column(name = "capacity", nullable = false)
    private int capacity;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public LocalDate getPickupDate() { return pickupDate; }
    public void setPickupDate(LocalDate pickupDate) { this.pickupDate = pickupDate; }
    public PickupSlot getSlot() { return slot; }
    public void setSlot(PickupSlot slot) { this.slot = slot; }
    public int getCapacity() { return capacity; }
    public void setCapacity(int capacity) { this.capacity = capacity; }
}
