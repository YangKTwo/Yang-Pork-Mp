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

## 小程序 / 微信开发者工具

前端为原生微信小程序（TypeScript），目录 `apps/mp`。项目 AppID 已在 `apps/mp/project.config.json` 中配置（勿在仓库中提交 AppSecret）。

1. 安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)。
2. 打开项目：选择目录 **`apps/mp`**（内含 `project.config.json` 与 `miniprogram/`；勿只打开 `miniprogram/` 子目录）。源码为纯 `.ts`，`project.config.json` 的 `setting.useCompilerPlugins` 需包含 **`typescript`**，否则开发者工具会报无法解析 `app.js`。
3. 本地调试：
   - 默认走本地 API **`http://127.0.0.1:8082/api/v1`**（先按上文启动 `apps/api`）；无后端时可在顾客端「我的」打开 **Mock** 离线点通（见 `miniprogram/services/mock.ts`）。
   - 可用存储键 `API_BASE_URL` 覆盖 API 基址。
4. 安装依赖后需 **构建 npm**：`cd apps/mp && npm install && npm run build:npm`（或开发者工具 **工具 → 构建 npm**）。详见 [apps/mp/README.md](apps/mp/README.md)。
5. 可选类型检查：`cd apps/mp && npm run tsc`。
6. Vant 主题与 P0 自定义块说明：[docs/design/11_vant_weapp_design_align.md](docs/design/11_vant_weapp_design_align.md)。
