package com.yangpork.api.seed;

import com.yangpork.api.domain.ProductEntity;
import com.yangpork.api.domain.ProductStatus;
import com.yangpork.api.repo.ProductRepository;
import com.yangpork.api.service.IdGenerator;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Set;

@Component
public class ProductSeeder implements ApplicationRunner {
    private static final Set<String> DEFAULT_ON = Set.of(
            "P01","P02","P03","P04","P05","P06","P07","R01","R02","O01","O03");

    private final ProductRepository productRepository;
    private final IdGenerator idGenerator;

    public ProductSeeder(ProductRepository productRepository, IdGenerator idGenerator) {
        this.productRepository = productRepository;
        this.idGenerator = idGenerator;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        List<Seed> seeds = List.of(
                new Seed("P01", "精瘦肉", "斤", 1500, "炒菜常用", 10),
                new Seed("P02", "前腿肉", "斤", 1200, null, 20),
                new Seed("P03", "后腿肉", "斤", 1100, null, 30),
                new Seed("P04", "五花肉", "斤", 1300, null, 40),
                new Seed("P05", "肋条肉", "斤", 1200, null, 50),
                new Seed("P06", "梅花肉", "斤", 1600, "偏瘦带一点肥", 60),
                new Seed("P07", "带皮猪肉", "斤", 1100, "有皮上肉类", 70),
                new Seed("P08", "肉糜（绞肉）", "斤", 1400, "可选；无设备可先下架", 80),
                new Seed("R01", "肋排（一条）", "条", 3200, "约 1.2–1.5 斤/条", 110),
                new Seed("R02", "小排（一条）", "条", 2200, "偏小条/段", 120),
                new Seed("R03", "脊骨/筒骨（一条）", "条", 1200, "煲汤用", 130),
                new Seed("R04", "棒骨（一条）", "条", 1000, null, 140),
                new Seed("O01", "猪蹄", "只", 1800, null, 210),
                new Seed("O02", "猪蹄", "斤", 1400, "与 O01 可只上架其一", 220),
                new Seed("O03", "猪前肘", "只", 2800, null, 230),
                new Seed("O04", "猪后肘", "只", 2500, null, 240),
                new Seed("O05", "龙骨", "斤", 1000, null, 250),
                new Seed("O06", "猪肚", "斤", 2800, "副产", 260),
                new Seed("O07", "肝/心等杂烩", "斤", 1000, "可合并为猪杂", 270)
        );
        for (Seed s : seeds) {
            productRepository.findBySkuCode(s.sku()).orElseGet(() -> {
                ProductEntity p = new ProductEntity();
                p.setId(idGenerator.productId());
                p.setSkuCode(s.sku());
                p.setName(s.name());
                p.setUnit(s.unit());
                p.setPriceFen(s.priceFen());
                p.setRemark(s.remark());
                p.setSort(s.sort());
                p.setStatus(DEFAULT_ON.contains(s.sku()) ? ProductStatus.ON_SHELF : ProductStatus.OFF_SHELF);
                p.setCreatedAt(Instant.now());
                p.setUpdatedAt(Instant.now());
                return productRepository.save(p);
            });
        }
    }

    private record Seed(String sku, String name, String unit, long priceFen, String remark, int sort) {}
}
