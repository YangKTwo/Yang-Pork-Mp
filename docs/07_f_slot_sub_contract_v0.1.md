# F-SLOT-01 / F-SUB-01 API 契约 v0.1

| 字段 | 内容 |
|------|------|
| 日期 | 2026-10-30 |
| 范围 | `apps/api`；Base `/api/v1` |
| 对齐 | 分支 `dev`；全局约定见 `06_api_contract_draft_v0.1.md` |

---

## 1. F-SLOT-01 — 取货时段

### 1.1 枚举 `pickupSlot`

| code | 说明 |
|------|------|
| `MORNING` | 上午时段 |
| `NOON` | 中午时段 |
| `EVENING` | 下午时段（代码仍为 EVENING） |

下单 **必填**；缺失或非法值 → `BAD_PARAM`。

### 1.2 GET `/config/ordering`（只读，无容量、无管理端改文案）

在原有字段基础上增加：

| 字段 | 类型 | 说明 |
|------|------|------|
| `pickupSlots` | array | 固定三项，顺序 MORNING → NOON → EVENING |
| `pickupSlots[].code` | string | `MORNING` \| `NOON` \| `EVENING` |
| `pickupSlots[].label` | string | 展示主文案 |
| `pickupSlots[].hint` | string | 时间段 |
| `defaultPickupSlot` | string | 默认选中，如 `MORNING` |

**PM 定稿默认文案**（来自 `app.ordering.*`，仅配置只读下发）：

| code | label | hint |
|------|-------|------|
| `MORNING` | 上午取 | 08:00–11:00 |
| `NOON` | 中午取 | 11:00–14:00 |
| `EVENING` | 下午取 | 14:00–18:00 |

v1 **不做** 时段容量校验。

### 1.3 写单

| 接口 | body 字段 |
|------|-----------|
| `POST /orders`（顾客预定） | `pickupSlot` **必填** |
| `POST /shop/orders/manual`（店家代录） | `pickupSlot` **必填** |

### 1.4 读单

订单 list / detail 的每条订单增加：

| 字段 | 类型 | 说明 |
|------|------|------|
| `pickupSlot` | string \| null | 枚举名；历史行迁移期可能为 null |

### 1.5 店家列表筛选

| 接口 | 查询参数 |
|------|----------|
| `GET /shop/orders/preorder` | 可选 `pickupSlot=MORNING\|NOON\|EVENING` |
| `GET /shop/orders/manual` | 同上 |

---

## 2. F-SUB-01 — 备货完成订阅消息

### 2.1 配置

GET `/config/ordering` 增加：

| 字段 | 类型 | 说明 |
|------|------|------|
| `subscribePreparedTmplId` | string | 微信订阅模板 ID；未配置时为 `""`，**FE 应跳过授权** |

后端配置项：`app.wx.subscribe.prepared-template-id`（可选）。

### 2.2 订单字段 `subscribeStatus`

| 值 | 含义 |
|----|------|
| `NONE` | 默认，未接受订阅 |
| `ACCEPTED` | 用户已接受，待备货完成后尝试发送 |
| `SENT` | 已发送（含 mock 模式落库） |
| `SKIPPED_NO_AUTH` | 已 ACCEPTED 但无模板等，跳过 |
| `FAILED` | 发送失败（不影响备货状态机） |

list / detail 均返回 `subscribeStatus`，供 UI 展示。

### 2.3 接受订阅 — **主路径（FE 确认）**

结账/下单成功后，由 **订单 owner** 调用：

```http
POST /api/v1/orders/{id}/subscribe
Authorization: Bearer <token>
Content-Type: application/json

{ "accepted": true }
```

| body | 说明 |
|------|------|
| `accepted` | **必填**；`true` → `ACCEPTED`，`false` → `NONE` |

幂等：重复提交相同 `accepted` 仍为成功。

**这是 FE 设置 `ACCEPTED` 的首选方式**（可在拉起 `wx.requestSubscribeMessage` 之后调用）。

### 2.4 兼容字段（非主路径）

`POST /orders` 与 `POST /shop/orders/manual` 可选：

| body | 说明 |
|------|------|
| `acceptSubscribePrepared` | 可选 boolean；`true` → `ACCEPTED`，否则 `NONE` |

FE **不依赖** 此字段；保留供旧客户端或联调兼容。

### 2.5 发送时机

订单状态变为 `PREPARED` 时：

- 非 `ACCEPTED` 或模板 ID 为空 → 不抛错；记录日志；必要时 `SKIPPED_NO_AUTH` 或保持 `NONE`
- `ACCEPTED` 且模板 ID 非空 → 调用订阅消息（`app.wx.mode=mock` 时只打日志并标记 `SENT`）
- 发送失败 → `FAILED`，**不阻断** `prepare` 成功

---

## 3. 示例片段

### GET `/config/ordering`（节选）

```json
{
  "pickupSlots": [
    { "code": "MORNING", "label": "上午取", "hint": "08:00–11:00" },
    { "code": "NOON", "label": "中午取", "hint": "11:00–14:00" },
    { "code": "EVENING", "label": "下午取", "hint": "14:00–18:00" }
  ],
  "defaultPickupSlot": "MORNING",
  "subscribePreparedTmplId": ""
}
```

### POST `/orders`（节选）

```json
{
  "pickupSlot": "MORNING",
  "items": [{ "productId": "...", "quantity": "1" }]
}
```

### 结账后订阅（主路径）

```json
POST /orders/{id}/subscribe
{ "accepted": true }
```
