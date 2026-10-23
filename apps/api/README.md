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
- 时区：Asia/Shanghai
- DB：H2 文件库 `./data/pork_preorder`（零依赖 MySQL）

## Mock 登录（curl）

```bash
# 1) 微信 code 当伪 openid
TOKEN=$(curl -s -X POST http://127.0.0.1:8082/api/v1/auth/wx-login \
  -H 'Content-Type: application/json' \
  -d '{"code":"dev_user_1"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['accessToken'])")

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
