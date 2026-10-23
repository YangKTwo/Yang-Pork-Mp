# Yang-Pork-Mp

Monorepo：猪肉预定相关应用（小程序与后端 API）。

## apps/api 本地启动

后端为 Spring Boot 3 / Java 17，默认端口 **8082**，API 基址 `/api/v1`，支付模式 `PAY_MODE=mock`（见 `application.yml` 中 `app.pay-mode`）。

```bash
cd apps/api
mvn -q -DskipTests package   # 可选
mvn spring-boot:run
```

- 详细说明、Mock 登录与 OpenAPI 地址见 [apps/api/README.md](apps/api/README.md)。
- H2 数据文件落在 `apps/api/data/`（已 gitignore，勿提交）。
