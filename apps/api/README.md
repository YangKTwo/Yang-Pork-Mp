# apps/api — Yang Pork Preorder API

Spring Boot 3.3 + Java 17（本机可用 JDK 21 编译 `release=17`）+ Maven + H2。

## 本地启动

```bash
cd apps/api
mvn -q -DskipTests package
mvn spring-boot:run
# 或: java -jar target/yang-pork-api-0.1.0-SNAPSHOT.jar
```

- 端口：**8082**
- API 基址：`http://127.0.0.1:8082/api/v1`
- OpenAPI：`http://127.0.0.1:8082/v3/api-docs` · Swagger UI：`/swagger-ui.html`
- 支付：`app.pay-mode=mock`（`application.yml`）
- 微信登录：`app.wx.mode=mock`（默认）；本地/开发者工具须传 **稳定** `devKey`（或 Header `X-Dev-Key`），同一 key 对应同一用户；`real` 模式预留 `WX_APP_ID` / `WX_APP_SECRET`（本轮未接真机 code2session）
- 时区：Asia/Shanghai
- DB：H2 文件库 `./data/pork_preorder`（零依赖 MySQL）

### H2 本地库与 schema 变更

`spring.jpa.hibernate.ddl-auto: update` 对**已有**文件库有时不会稳定追加新列（例如 F-SLOT-01 / F-SUB-01 的 `pickupSlot`、`subscribeStatus`）。本地 smoke 若出现列缺失、启动或下单异常，请先**停服务**，删除 `apps/api/data/pork_preorder*`（含 `.mv.db` / `.trace.db` 等），再启动让 Hibernate 重建/更新表结构。无需 MySQL；mock 环境以 wipe 为准即可。

## Mock 登录（curl）

```bash
# 1) 稳定 devKey（勿用每次变化的 wx.login code 当身份）
TOKEN=$(curl -s -X POST http://127.0.0.1:8082/api/v1/auth/wx-login \
  -H 'Content-Type: application/json' \
  -d '{"code":"ignored_in_mock","devKey":"dev_user_1"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['accessToken'])")

# 也可用 Header：curl ... -H 'X-Dev-Key: dev_user_1' -d '{"code":"x"}'

# 2) 完善资料（测试 ADMIN 手机 13800000001 / SHOP 13800000002）
curl -s -X POST http://127.0.0.1:8082/api/v1/auth/profile \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"realName":"测试顾客","phone":"13800138000"}'

# 3) 商品 / 配置
curl -s http://127.0.0.1:8082/api/v1/products -H "Authorization: Bearer $TOKEN"
curl -s http://127.0.0.1:8082/api/v1/config/ordering -H "Authorization: Bearer $TOKEN"
```

下单窗默认 **12:00–22:00**（上海）；窗外 `POST /orders` 返回业务码 `40010`。

## 注意

- **暂无服务器**；GitHub Actions 仅 build 骨架，deploy job `if: false`。
- **不要提交密钥**；微信 AppSecret / 商户证书后续由权限对接人收取，勿写入仓库。
- 契约：仓库根 `docs/06_api_contract_draft_v0.1.md`；导出副本 `docs/openapi.yaml`。
