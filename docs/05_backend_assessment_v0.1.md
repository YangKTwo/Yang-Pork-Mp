# 「提前一天预定猪肉」后端评估 v0.1

| 字段 | 内容 |
|------|------|
| 日期 | 2026-10-23 15:30 CST |
| 作者 | 后端工程师 |
| 依据 | 03_requirements_v1.1 + v1.2 |
| 状态 | **仅评估，未开工业务代码** |

---

## 1. 技术选型

**推荐：Spring Boot 3 + MySQL 8 + Redis（可选）**，与现有 lucky_sign / lucky-api 技术栈对齐。

| 项 | 建议 | 说明 |
|----|------|------|
| 语言/框架 | Java 17 + Spring Boot 3 | 团队已熟；订单状态机、定时关单、支付回调更稳妥 |
| ORM | MyBatis-Plus 或 JPA | 与 lucky_sign 习惯一致即可 |
| DB | **新库** `pork_preorder`（MySQL） | 与 lucky-api 库隔离，避免表/迁移互相踩 |
| 缓存 | Redis 可选 | 首期可用 DB 定时扫「待支付超时」；有 Redis 则用 TTL/延时关单更干净 |
| 鉴权 | JWT（access）+ 角色枚举 | CUSTOMER / SHOP / ADMIN |
| 微信 | 小程序 code2session + 支付 V3 | 登录与定金共用同一主体为佳 |

**是否新服务新库：是。** 独立服务 `pork-preorder-api`，独立 schema；不挂到 lucky-api 模块上（业务无关、发布节奏不同、支付密钥隔离）。

更轻方案（Node/Nest 或 Go+SQLite）可行但会增加栈分裂与运维成本，**不推荐**作为首期主路径。

---

## 2. 仓库与部署

| 项 | 初案 |
|----|------|
| GitHub repo | `YangKTwo/pork-preorder-api`（或 `yuding-zhuurou-api`，最终以用户确认命名） |
| 前端/小程序 | 另仓（前端工程师），本评估仅 API |
| 部署机 | **同现有 ECS `119.23.45.226`，不同端口 + Nginx 反代**（与 lucky-api 隔离进程/目录） |
| 路径建议 | `/www/wwwroot/pork-preorder-api`；systemd 或现有启动脚本独立管理 |
| 端口 | 例：`8082`（lucky-api 占现有端口） |
| 域名/HTTPS | 小程序强制 HTTPS。初案：新子域 `pork-api.<已有域名>` 或独立域名；Nginx + Let's Encrypt / 阿里云证书 |
| 隔离原则 | 进程、目录、DB、环境变量、微信支付证书目录均独立；不复用 lucky-api 的 `run.env` |

**同机风险**：一台 ECS 资源争用。MVP 流量极低可接受；日后再拆机。

**开工前需用户确认**：repo 名、域名是否已有可挂、是否允许同机部署。

---

## 3. 模块与工期（人天，单后端）

按「可联调」口径，不含小程序审核与商户进件等待。

| 模块 | 人天 | 说明 |
|------|------|------|
| 账号（微信登录/注册姓名手机、角色） | 2 | code2session、资料完善、JWT、店家/超管绑定 |
| 商品（CRUD+上下架+预置 SKU 种子） | 1.5 | v1.2 清单种子数据；缓存可后置 |
| 订单状态机 + 时间窗 + 取货码 | 3.5 | 12:00–22:00、次日取货、≤10/＞10 分支、10 分钟关单、取消截止、核销 |
| 支付/退款（含 mock） | 3～4 | mock 优先 1.5；接真微信 V3 再 +1.5～2.5 |
| 代录订单（分区） | 1.5 | 店家录入、与预定单 `source` 分区 |
| 超管配置（窗/定金比例/门槛） | 1 | 配置表 + 生效校验 |
| 联调/冒烟/修边 | 2 | 与前端契约、时区边界用例 |
| **合计** | **约 14.5～16.5** | 有商户证齐全偏上限；纯 mock 可压到 ~13 |

**关键路径建议分期**：P0 账号+商品+订单状态机+mock 支付+代录+超管配置 → 可完整体验；P1 真支付退款；P2 订阅消息。

---

## 4. 支付

### 依赖
- 微信小程序 AppID / AppSecret（登录）
- 微信支付商户号、APIv3 密钥、商户证书、支付结果通知 URL（公网 HTTPS）
- 退款：同一商户能力；取消时原路退定金

### 分期建议
1. **体验期（无商户）**：`PAY_MODE=mock` —— 创建待支付单返回 mock 支付参数；提供「模拟支付成功」接口（仅非 prod / 超管开关）；定时任务仍按 10 分钟关单；退款记流水为 mock success。  
2. **有商户后**：切 `PAY_MODE=wechat`，JSAPI 下单 + 回调验签落库；取消走退款 API；回调幂等。  
3. **不阻塞**：无商户时仍可验收除「真实资金」外的全部业务规则。

### 注意
- 定金金额服务端重算，不信任前端传入。  
- 支付回调与关单竞态：状态机加乐观锁/版本号。

---

## 5. 权限与后续要向用户索取的密钥

### 鉴权方案
- 顾客：微信登录 → JWT；仅本人订单。  
- 店家（老爸）：角色 `SHOP`，白名单 openid/手机（超管配置或种子）；可见完整手机号、预定区+代录区。  
- 超管（ktwo）：角色 `ADMIN`，白名单；商品/配置/全量订单/角色绑定。  
- 接口按角色注解鉴权；敏感操作打审计日志（谁改价、谁核销）。

### 作为权限对接人，开工/上线前需用户提供（**聊天不落明文**，走私聊安全通道或密钥文件）
1. 小程序 **AppID + AppSecret**  
2. 微信支付：**商户号、APIv3 Key、商户证书（私钥）**（无则先 mock）  
3. 新库 MySQL 账号或授权我在现网创建库（若用现 ECS）  
4. 域名 / HTTPS 证书材料或 DNS 解析权（挂 Nginx）  
5. GitHub 新仓库创建权限（若尚未开）  
6. 店家老爸微信用于绑定的手机号/体验者 openid（联调）  
7. 超管账号绑定方式确认（ktwo 微信或独立账号）

现有 ECS SSH（`~/.ssh/ecs_lucky_sign`，到期 2027-09-12）可复用运维，**不**复用 lucky-api 业务密钥。

---

## 6. 接口清单草案（给前端对齐）

约定：`/api/v1`，JSON，`Authorization: Bearer <jwt>`；时间 Asia/Shanghai；金额单位 **分**（整数）避免浮点。

### 6.1 账号
| 方法 | 路径 | 角色 | 说明 |
|------|------|------|------|
| POST | `/auth/wx-login` | 匿名 | `{code}` → token；未完善资料则需补全 |
| POST | `/auth/profile` | 登录 | 姓名+手机 → 昵称=姓名+手机 |
| GET | `/auth/me` | 登录 | 角色、昵称、手机 |

### 6.2 商品（顾客可读上架）
| 方法 | 路径 | 角色 | 说明 |
|------|------|------|------|
| GET | `/products` | 登录 | 上架列表 |
| GET | `/products/{id}` | 登录 | 详情 |
| POST/PUT/PATCH | `/admin/products`… | ADMIN | CRUD/上下架 |
| POST | `/admin/products/seed` | ADMIN | 可选：重跑 v1.2 种子（幂等） |

### 6.3 配置
| 方法 | 路径 | 角色 | 说明 |
|------|------|------|------|
| GET | `/config/ordering` | 登录 | 窗、定金比例、门槛、公式文案、当前是否可下单 |
| PUT | `/admin/config/ordering` | ADMIN | 改配置 |

### 6.4 预定订单（顾客）
| 方法 | 路径 | 角色 | 说明 |
|------|------|------|------|
| POST | `/orders` | CUSTOMER | 提交次日单；返回状态/定金/取货码(若已生成) |
| GET | `/orders` | CUSTOMER | 我的订单 |
| GET | `/orders/{id}` | CUSTOMER | 详情含公式说明 |
| POST | `/orders/{id}/cancel` | CUSTOMER | 当日 22:00 前；触发退款 |
| POST | `/orders/{id}/pay` | CUSTOMER | 拉起支付参数（真/mock） |
| POST | `/orders/{id}/pay/mock-success` | 非prod或开关 | 模拟支付成功 |

### 6.5 支付回调
| 方法 | 路径 | 角色 | 说明 |
|------|------|------|------|
| POST | `/pay/wechat/notify` | 匿名+验签 | 支付成功回调 |
| POST | `/pay/wechat/refund-notify` | 匿名+验签 | 退款回调（若启用） |

### 6.6 店家
| 方法 | 路径 | 角色 | 说明 |
|------|------|------|------|
| GET | `/shop/orders/preorder` | SHOP/ADMIN | 预定区；筛取货日/状态；搜取货码 |
| GET | `/shop/orders/manual` | SHOP/ADMIN | 代录区 |
| POST | `/shop/orders/manual` | SHOP/ADMIN | 新建代录 |
| POST | `/shop/orders/{id}/prepare` | SHOP/ADMIN | → 已备货 |
| POST | `/shop/orders/{id}/pickup` | SHOP/ADMIN | 核销（码+核对信息） |
| POST | `/shop/orders/{id}/cancel` | SHOP/ADMIN | 代录/异常取消（规则另定） |

### 6.7 超管补充
| 方法 | 路径 | 角色 | 说明 |
|------|------|------|------|
| GET | `/admin/orders` | ADMIN | 全量 |
| PUT | `/admin/users/{id}/role` | ADMIN | 绑定店家/超管 |

---

## 建议下一步（不写业务代码）

1. 产品经理汇总本评估 + 设计排期，经 **Grok Bot** 同步用户确认：repo 名、同机部署、域名、是否先 mock 支付。  
2. 用户点头后：建仓、建库、骨架工程、契约（OpenAPI）再与前端对齐。  
3. 密钥按 §5 由后端对接人向用户安全收取，台账登记。

