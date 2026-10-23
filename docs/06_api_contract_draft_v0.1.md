# 「提前一天预定猪肉」API 契约草案 v0.1

| 字段 | 内容 |
|------|------|
| 日期 | 2026-10-23 CST |
| 作者 | 后端工程师 |
| 对齐 | 需求 v1.1+v1.2；前端仓 `pork-preorder-mp`；后端评估 `05_backend_assessment_v0.1.md` |
| 状态 | **草案**（含 2026-10-23 店家代取消拍板）；用户确认开工前可改；未实现 |
| 修订 | 店家 `POST /shop/orders/{id}/cancel` 已定为确定项（不受 22:00 自助窗限制） |

---

## 0. 全局约定

| 项 | 约定 |
|----|------|
| Base URL | `https://<pork-api-host>/api/v1`（HTTPS 强制） |
| 时区 | **Asia/Shanghai**；所有业务日界、12:00–22:00、取消截止均按此时区；请求/响应时间字段用 ISO-8601 带偏移，如 `2026-10-24T12:00:00+08:00`，或拆 `date`=`YYYY-MM-DD` + `time`=`HH:mm:ss` |
| 金额 | 整数 **分**（`int64`）；展示由前端除 100 |
| 鉴权 | `Authorization: Bearer <accessToken>` |
| 成功体 | `{ "code": 0, "message": "ok", "data": ... }` |
| 业务错误 | `{ "code": <非0>, "message": "<可读>", "data": null }`；HTTP 仍可用 200 或 4xx（实现时统一一种，联调前锁定） |
| 分页 | `?page=1&pageSize=20` → `data: { list, total, page, pageSize }` |
| 幂等 | 下单建议 `Idempotency-Key`；支付回调必须幂等 |

### 0.1 角色

| role | 说明 |
|------|------|
| `CUSTOMER` | 顾客 |
| `SHOP` | 店家（老爸） |
| `ADMIN` | 超管（ktwo） |

未完善资料的用户：`profileCompleted=false`，仅允许调登录/补全资料。

### 0.2 订单来源与状态

**source**

| 值 | 含义 | 列表分区 |
|----|------|----------|
| `PREORDER` | 顾客自助预定 | 预定区 |
| `MANUAL` | 店家代录 | 代录区 |

**status（预定 PREORDER）**

| 值 | 含义 |
|----|------|
| `PENDING_PAY` | 待支付（总额＞门槛） |
| `PENDING_PREPARE` | 待备货（已订成功） |
| `PREPARED` | 已备货 |
| `PICKED_UP` | 已取货（终态） |
| `CANCELLED` | 已取消（终态，含退款成功） |
| `CLOSED` | 已关闭（超时未付，终态） |

**status（代录 MANUAL）**：至少 `PENDING_PREPARE` → `PREPARED` → `PICKED_UP` / `CANCELLED`；可选线下定金标记，不强制走线上支付态。

**状态机（预定）**

```
总额 ≤ depositThreshold → 提交即 PENDING_PREPARE（生成 pickupCode）
总额 ＞ depositThreshold → PENDING_PAY
  ├─ paySuccess within payTimeoutSec → PENDING_PREPARE（生成 pickupCode）
  └─ timeout → CLOSED
PENDING_PREPARE | PREPARED → 顾客 cancel（当日 cancelDeadline 前）→ CANCELLED（已付则退款）
PENDING_PREPARE | PREPARED → 店家/超管 cancel（**不受 22:00 窗限制**，原因必填）→ CANCELLED（已付则退款）
PENDING_PREPARE → prepare → PREPARED
PREPARED → pickup(verify) → PICKED_UP
PICKED_UP | CLOSED → 不可取消
```

默认：`depositThresholdFen=1000`（10 元），`depositRateBps=2000`（20%），`payTimeoutSec=600`，下单窗 `12:00`–`22:00`（含），取消截止=当日 `22:00`。

定金公式文案示例：`定金 = 订单金额 × 20%（订单满 10 元收取）`（比例/门槛随配置变）。

---

## 1. 鉴权

### POST `/auth/wx-login`

匿名。Body: `{ "code": "<wx.login code>", "devKey": "<稳定键>" }`（**mock/本地**：`devKey` 或 Header `X-Dev-Key` 必填，服务端 openid 为 `mock_dev_<规范化键>`，同一键同一用户；`code` 可传以兼容前端但 mock 下不得用 code 派生 openid。真机 `real` 模式走 code2session。）

Response `data`:
```json
{
  "accessToken": "...",
  "expiresIn": 7200,
  "profileCompleted": false,
  "user": { "id": "u_...", "role": "CUSTOMER", "nickname": null, "phone": null, "realName": null }
}
```

### POST `/auth/profile`

登录。Body: `{ "realName": "张三", "phone": "13800138000" }`  
规则：昵称服务端生成 `realName + phone`；提示真实姓名由产品文案，不校验实名。

### GET `/auth/me`

登录。返回当前 user + role + profileCompleted。

**错误码（示意）**：`40101` 未登录；`40301` 角色不足；`40001` 参数非法；`40010` 非下单窗口；`40011` 不可取消；`40012` 状态不允许；`40201` 支付失败；`40401` 资源不存在。

---

## 2. 配置（时区相关只读给前端）

### GET `/config/ordering`

登录。`data`:
```json
{
  "timezone": "Asia/Shanghai",
  "orderWindowStart": "12:00",
  "orderWindowEnd": "22:00",
  "cancelDeadline": "22:00",
  "pickupDayOffset": 1,
  "depositThresholdFen": 1000,
  "depositRateBps": 2000,
  "payTimeoutSec": 600,
  "depositFormulaText": "定金 = 订单金额 × 20%（订单满 10 元收取）",
  "canOrderNow": true,
  "serverNow": "2026-10-23T15:30:00+08:00",
  "nextPickupDate": "2026-10-24"
}
```

`canOrderNow`：服务端按 Shanghai 墙钟计算，前端可展示但**以下单接口校验为准**。

### PUT `/admin/config/ordering`

ADMIN。可改窗、取消截止、门槛、比例、超时秒数；服务端重算 `depositFormulaText`。

---

## 3. 商品（含 SKU 种子）

### Product 对象

```json
{
  "id": "prod_...",
  "skuCode": "P01",
  "name": "精瘦肉",
  "unit": "斤",
  "priceFen": 1500,
  "status": "ON_SHELF",
  "remark": "炒菜常用",
  "sort": 10
}
```

`status`: `ON_SHELF` | `OFF_SHELF`

### GET `/products`

登录。默认仅上架；查询 `?includeOffShelf=1` 仅 ADMIN/SHOP。

### GET `/products/{id}`

登录。

### Admin CRUD

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/admin/products` | 新建 |
| PUT | `/admin/products/{id}` | 改名/单位/价/备注/排序 |
| PATCH | `/admin/products/{id}/shelf` | `{ "status": "ON_SHELF"\|"OFF_SHELF" }` |
| POST | `/admin/products/seed` | 幂等写入 v1.2 首批 SKU（默认上/下架策略按需求） |

种子默认上架：P01–P07、R01–R02、O01、O03；其余 OFF_SHELF 保留。

---

## 4. 顾客预定订单

### POST `/orders`

CUSTOMER。Body:
```json
{
  "idempotencyKey": "uuid",
  "items": [{ "productId": "prod_...", "quantity": "1.5" }],
  "remark": ""
}
```

- `quantity`：字符串或 decimal 字符串，避免浮点；斤可 1 位小数，条/只为正整数（服务端按 unit 校验）。
- `pickupDate`：**服务端**定为「次日」（Shanghai），不接受客户端随意指定（首期）。
- 窗外 → `40010`。
- 总额 = Σ priceFen×quantity（斤类 quantity 按小数算到分，四舍五入规则联调锁定为**银行家/半入**之一）。

Response `data`（Order 摘要）:
```json
{
  "id": "ord_...",
  "source": "PREORDER",
  "status": "PENDING_PAY",
  "pickupDate": "2026-10-24",
  "totalFen": 4500,
  "depositFen": 900,
  "depositRequired": true,
  "depositFormulaText": "...",
  "payExpireAt": "2026-10-23T15:40:00+08:00",
  "pickupCode": null,
  "items": [...]
}
```

≤门槛：`status=PENDING_PREPARE`，`depositRequired=false`，`depositFen=0`，**立即** `pickupCode`（4–6 位数字）。

### GET `/orders` / GET `/orders/{id}`

CUSTOMER，仅本人。详情含状态、明细、定金公式、取货码（若有）、支付倒计时剩余秒。

### POST `/orders/{id}/cancel`

CUSTOMER。当日 cancelDeadline 前且状态允许；已付定则发起退款，成功后 `CANCELLED`。

### POST `/orders/{id}/pay`

CUSTOMER。仅 `PENDING_PAY`。  
`data`: `{ "payMode": "mock"|"wechat", "prepay": { ...微信参数或 mock 票据 } }`

### POST `/orders/{id}/pay/mock-success`

仅 `payMode=mock` 或非 prod 开关。将单推到 `PENDING_PREPARE` 并生成 `pickupCode`。

---

## 5. 支付 / 退款

### POST `/pay/wechat/notify`

匿名 + 平台验签。成功支付 → 幂等进入 `PENDING_PREPARE` + 生成码。

### POST `/pay/wechat/refund-notify`

若启用。退款成功确认（或同步退款结果轮询，实现二选一写进联调清单）。

**定金**：一律服务端按配置重算，忽略客户端金额。

**关单任务**：扫描 `PENDING_PAY` 且 `now >= payExpireAt` → `CLOSED`（与支付回调竞态：乐观锁/版本号，已支付胜出）。

---

## 6. 店家双区

### GET `/shop/orders/preorder`

SHOP/ADMIN。Query: `pickupDate`, `status`, `pickupCode`, 分页。  
列表含完整 `phone`、`realName`、`pickupCode`、明细。

### GET `/shop/orders/manual`

SHOP/ADMIN。代录区，同筛选维度（无支付态为主）。

### POST `/shop/orders/manual`

SHOP/ADMIN。Body:
```json
{
  "realName": "李四",
  "phone": "139...",
  "pickupDate": "2026-10-24",
  "items": [{ "productId": "...", "quantity": "2" }],
  "remark": "电话预定",
  "depositOffline": "COLLECTED"|"WAIVED"|"NONE"
}
```

创建即 `PENDING_PREPARE` + `pickupCode`（首期代录默认订成功；线上定金可选后置）。

### POST `/shop/orders/{id}/prepare`

→ `PREPARED`（预定或代录）。

### POST `/shop/orders/{id}/pickup`

Body: `{ "pickupCode": "123456" }`（可选再传姓名/手机二次核对，服务端与订单比对）。  
成功 → `PICKED_UP`，码标记已使用。

### POST `/shop/orders/{id}/cancel`（店家代取消 · **已拍板**）

SHOP/ADMIN。对 **预定单（PREORDER）与代录单（MANUAL）** 均可发起。

Body:
```json
{
  "reason": "客户电话改口，不要了"
}
```

| 规则 | 说明 |
|------|------|
| 可取消状态 | `PENDING_PREPARE`、`PREPARED`（未取货） |
| 不可取消 | `PICKED_UP`、`CLOSED`；`PENDING_PAY` 由超时关单/顾客路径处理（店家一般无需代取消待支付单；若产品后续要覆盖再加） |
| 时间窗 | **不受**顾客自助取消的当日 22:00 限制（人工兜底，电话改口常在窗后） |
| 定金 | 已付定金 → 原路退；退款成功后 `status=CANCELLED` |
| 审计 | 必记 `operatorUserId`、`operatorRole`、`reason`（短备注必填，建议 1～100 字）、`cancelledAt` |
| 与顾客取消区别 | 顾客：`POST /orders/{id}/cancel`，受 22:00 窗约束；店家本接口不走该窗 |

成功 Response `data`：更新后的 Order（含 `cancelSource=SHOP|ADMIN`、`cancelReason`）。

错误：`40012` 状态不允许；`40001` reason 缺失；退款失败时保持原状态并返回可重试错误（实现时落 `refundStatus`）。

---

## 7. 超管补充

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/admin/orders` | 全量，可按 source 滤 |
| PUT | `/admin/users/{id}/role` | `{ "role": "SHOP"|"ADMIN"|"CUSTOMER" }` |
| GET | `/admin/users` | 账号列表（绑店家用） |

---

## 8. 与前端仓对齐备注

- 前端：`YangKTwo/pork-preorder-mp`（原生小程序，三角色分包）
- 后端建议仓：`YangKTwo/pork-preorder-api`
- 联调优先顺序：鉴权 → config → products/seed → orders 状态机（含窗外/≤10/＞10/关单/取消）→ mock 支付 → 店家双区核销 → 真支付
- OpenAPI 正式文件可在开工建仓后放 `docs/openapi.yaml`；本草案先锁字段名

---

## 9. 仓库 / 库 / 部署（再次确认）

| 项 | 建议 |
|----|------|
| API 仓名 | **`YangKTwo/pork-preorder-api`** |
| DB | **新库** `pork_preorder` |
| 部署 | 同 ECS 异端口+Nginx；目录/进程/env/支付证书与 lucky-api **隔离** |
