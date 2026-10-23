package com.yangpork.api.repo;

import com.yangpork.api.domain.ProductEntity;
import com.yangpork.api.domain.ProductStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<ProductEntity, String> {
    Optional<ProductEntity> findBySkuCode(String skuCode);
    List<ProductEntity> findByStatusOrderBySortAscSkuCodeAsc(ProductStatus status);
    List<ProductEntity> findAllByOrderBySortAscSkuCodeAsc();
}
