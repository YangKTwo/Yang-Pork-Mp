# F-SLOT-02 / F-NOSHOW-01 API 契约 v0.1

| 字段 | 内容 |
|------|------|
| 日期 | 2026-10-31 |
| 范围 | `apps/api`；Base `/api/v1` |
| 对齐 | 分支后续 `feat/slot-capacity`、`feat/no-pickup-timeout` → PR→`dev`；前序 `07_f_slot_sub_contract_v0.1.md`；全局约定见 `06_api_contract_draft_v0.1.md` |
| 状态 | **草案**（PM 范围已拍板；容量默认 / 占位规则 / 错误码由 BE 建议，FE 可跟） |

---

## 0. 非目标（本契约明确不做）

| 项 | 说明 |
|----|------|
| 真实微信退款 | 超时未取 / 取消仍只记 mock 应退台账；**不**调微信退款 API |
| 支付链路变更 | 定金门槛、支付态机、mock 支付接口不变 |
| 主分支直接合入 | 两特性各自 feature 分支 → PR→`dev`，本契约不要求当日上 main |
| 改时段文案 / 订阅模板 | F-SLOT-01 / F-SUB-01 已定；本契约只扩容量与关单原因 |
| 推送「超时未取」订阅消息 | 本期仅状态机 + 展示；有模板需求另开 |

---

## 1. F-SLOT-02 — 时段容量

### 1.1 容量模型

按 **取货日 `pickupDate`（Asia/Shanghai 日历日）+ 时段 `pickupSlot`** 计量占用。

| 层 | 说明 | 默认 |
|----|------|------|
| 全局默认 | 三个时段各自一份默认容量，存 ordering 配置 | **每档 30** |
| 按日覆盖 | 某 `pickupDate` 可覆盖某一档或全部三档 | 无覆盖则回落默认 |

解析规则（写单 / 读余量共用）：

```
effectiveCapacity(date, slot) =
  dayOverride[date][slot]   若存在
  else defaultCapacity[slot]
```

`capacity <= 0` 视为该档不可约（等价 `full=true`，`remaining=0`）。

### 1.2 占用计数规则（拍板）

| 状态 | 是否占用名额 |
|------|----------------|
| `PENDING_PREPARE` | **是** |
| `PREPARED` | **是** |
| `PENDING_PAY` | **否**（未付完成前不占；支付超时 `CLOSED` 亦不占） |
| `PICKED_UP` | **否**（已取，释放） |
| `CANCELLED` | **否** |
| `CLOSED` | **否**（含支付超时 / 超时未取） |

说明：

- 顾客 `POST /orders`：免定金直入 `PENDING_PREPARE` → **创建时占位**；需定金路径先入 `PENDING_PAY` → **支付成功切 `PENDING_PREPARE` 时再占位并校验**（满则支付成功回调仍拒并关单或回滚支付标记，见 §1.5）。
- 店家 `POST /shop/orders/manual`：直入 `PENDING_PREPARE` → **创建时占位校验**。
- 计数维度：`COUNT(*) WHERE pickupDate=? AND pickupSlot=? AND status IN (PENDING_PREPARE, PREPARED)`。
- `remaining = max(0, capacity - occupied)`；`full = remaining == 0`。

### 1.3 GET `/config/ordering` 扩展

**查询参数（新增，可选）**

| 参数 | 类型 | 说明 |
|------|------|------|
| `pickupDate` | `YYYY-MM-DD` | 用于计算各档 `remaining` / `full`；缺省 = 当前配置算出的 `nextPickupDate` |

在既有 `pickupSlots[{code,label,hint}]`、`defaultPickupSlot`、`subscribePreparedTmplId` 等字段上，**每档追加**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `pickupSlots[].capacity` | int | 该日该档有效容量（已套用日覆盖） |
| `pickupSlots[].occupied` | int | 占用数（§1.2） |
| `pickupSlots[].remaining` | int | `max(0, capacity - occupied)` |
| `pickupSlots[].full` | bool | `remaining == 0` |
| `pickupDateForSlots` | string | 本次余量所针对的取货日（回显查询参数或默认） |
| `defaultSlotCapacity` | object | 全局默认，形如 `{ "MORNING": 30, "NOON": 30, "EVENING": 30 }`（管理端/调试用；顾客端可忽略） |

FE 埋点对齐（snake，见 `08_TRACKING_MP_FUNNEL` T24）：`slot_capacity` ← `capacity`，`slot_remaining` ← `remaining`，`slot_full` ← `full`。

### 1.4 写单拒满

| 接口 | 行为 |
|------|------|
| `POST /orders` | 免定金：创建时若目标档 `full` → 拒；需定金：创建可过（不占），支付成功入 `PENDING_PREPARE` 前再验一次 |
| `POST /shop/orders/manual` | 创建时若 `full` → 拒 |

**稳定错误码**（`ErrorCodes` 新增）：

| 常量名 | 数值 | message |
|--------|------|---------|
| `SLOT_FULL` | `40013` | `该时段已约满` |

响应示例：

```json
{
  "code": 40013,
  "message": "该时段已约满",
  "data": null
}
```

FE：确认页 / 提交失败 Toast「该时段已约满」；店家列表对 `full=true` 档展示「已约满」Tag（可用 `GET /config/ordering?pickupDate=` 或列表旁同日配置）。

并发：占位与写库应在同一事务内 `COUNT` + insert；超卖以 DB 计数为准，超则抛 `SLOT_FULL`（乐观即可；H2/本地不做强锁也可接受）。

### 1.5 需定金路径的二次校验（默认）

支付成功（mock pay / 回调）将订单从 `PENDING_PAY` → `PENDING_PREPARE` 时：

1. 再算该 `pickupDate`+`pickupSlot` 是否已满；
2. 若已满 → **不**进入 `PENDING_PREPARE`；订单改 `CLOSED`，`closeReason=SLOT_FULL_ON_PAY`（见 §2.1）；已付定金记应退台账（mock，同 §2.4）；向调用方返回业务失败（可用同一 `SLOT_FULL` 或订单详情可见 `closeReason`）。

若产品希望「支付时挤不进则仍保持 PENDING_PAY 让用户改档」——本期不做改档 API，故采用关单+应退更干净。

### 1.6 管理端 API（最小）

鉴权：现有 `ADMIN`（与 `PUT /admin/config/ordering` 同）。

#### 1.6.1 设全局默认容量

扩展现有：

```http
PUT /api/v1/admin/config/ordering
Authorization: Bearer <admin>
Content-Type: application/json

{
  "defaultSlotCapacity": {
    "MORNING": 30,
    "NOON": 30,
    "EVENING": 40
  }
}
```

- 可与原有 `orderWindowStart` 等字段同请求 partial 提交；
- 缺省 key 不改；非法（非正整数）→ `BAD_PARAM`；
- 响应：完整 `orderingView()`（可无 `pickupDate` 余量，或带当前 `nextPickupDate` 余量）。

#### 1.6.2 按日覆盖

```http
PUT /api/v1/admin/config/slot-capacity
Authorization: Bearer <admin>
Content-Type: application/json

{
  "pickupDate": "2026-11-01",
  "capacities": {
    "MORNING": 20,
    "NOON": 20
  }
}
```

| 规则 | 说明 |
|------|------|
| 仅写入 body 出现的 slot | 未出现的 slot 保持「无覆盖→用默认」或保留已有覆盖 |
| `capacities` 某 key 值为 `null` | 删除该日该档覆盖 |
| 整日清空 | `capacities: {}` 且 `clearAll: true`（可选；实现可简化为按 slot null） |

```http
GET /api/v1/admin/config/slot-capacity?pickupDate=2026-11-01
```

返回：

```json
{
  "pickupDate": "2026-11-01",
  "defaultSlotCapacity": { "MORNING": 30, "NOON": 30, "EVENING": 30 },
  "overrides": { "MORNING": 20, "NOON": 20 },
  "effective": {
    "MORNING": { "capacity": 20, "occupied": 5, "remaining": 15, "full": false },
    "NOON": { "capacity": 20, "occupied": 20, "remaining": 0, "full": true },
    "EVENING": { "capacity": 30, "occupied": 0, "remaining": 30, "full": false }
  }
}
```

存储建议（实现提示，非契约强制）：`ordering_config` 增 JSON 列存默认；另表 `slot_capacity_override(pickup_date, slot, capacity)` 唯一键 `(pickup_date, slot)`。

---

## 2. F-NOSHOW-01 — 超时未取

### 2.1 枚举 `closeReason`

订单实体 **新增** 字段 `closeReason`（`VARCHAR`，可空；仅 `status=CLOSED` 时有意义）。

| 值 | 含义 | 写入方 |
|----|------|--------|
| `PAY_TIMEOUT` | 待支付超时未付 | 现有 `closeExpired()` 扩展补写（历史行可为 null） |
| `NO_PICKUP` | 取货日当日 22:00 后仍未取 | 本特性扫描任务 |
| `SLOT_FULL_ON_PAY` | 支付成功时时段已满，无法入备货 | §1.5 |

预留：后续其它关单原因继续往枚举加，**禁止**复用 `cancelReason`。

### 2.2 订单视图字段

list / detail（顾客、店家）每条订单增加：

| 字段 | 类型 | 说明 |
|------|------|------|
| `closeReason` | string \| null | 枚举名；非 `CLOSED` 时为 `null` |
| `closedAt` | string \| null | ISO-8601 带偏移；首次置 `CLOSED` 时写入（建议新增列；若嫌多可暂用 `updatedAt`，但契约推荐独立字段） |

FE 展示：

- `status=CLOSED` 且 `closeReason=NO_PICKUP` → 文案「超时未取」（顾客 / 店家一致）；
- `closeReason=PAY_TIMEOUT` → 保持现有「超时未支付 / 已关闭」类文案；
- 取货日 **当日 22:00 之前**，`PENDING_PREPARE` / `PREPARED` 仍可正常备货、核销取货。

### 2.3 调度规则（对齐现有 `closeExpired`）

**不要**另起完全独立的关单框架；在 `OrderService` 现有 `@Scheduled` 路径上扩展（或同级再挂一个方法，共用调度节奏）。

| 项 | 约定 |
|----|------|
| 时区 | `Asia/Shanghai`（与 `ordering_config.timezone` 一致） |
| 截止 | 取货日 `pickupDate` **当天 22:00:00**（含：`now >= pickupDate 22:00`） |
| 扫描状态 | `PENDING_PREPARE`、`PREPARED` |
| 动作 | `status → CLOSED`；`closeReason = NO_PICKUP`；写 `closedAt` |
| 支付超时路径 | 现有 `PENDING_PAY` + `payExpireAt < now` → `CLOSED`，并补 `closeReason=PAY_TIMEOUT` |
| 节奏 | 可继续 `fixedDelay`（如 15s）或改为 cron `0 * * * * *`；契约只要求 **过点后尽快**（分钟级可接受） |

伪条件：

```
pickupDate < today(SH)
  OR (pickupDate == today(SH) AND localTime(SH) >= 22:00)
AND status IN (PENDING_PREPARE, PREPARED)
→ close with NO_PICKUP
```

### 2.4 定金应退台账（mock，无真退）

当 `NO_PICKUP`（及 §1.5 `SLOT_FULL_ON_PAY`）关单且 `depositPaid=true` / `depositFen>0`：

1. **不**调用微信退款；
2. 将 `depositPaid` 置 `false`（与现有 cancel mock refund 口径一致），并落一条应退记录供对账。

建议实体（最小）：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 主键 |
| `orderId` | string | 订单 ID |
| `amountFen` | long | 应退金额（通常 = 当时 `depositFen`） |
| `reason` | string | `NO_PICKUP` \| `SLOT_FULL_ON_PAY` \| `CANCEL`（cancel 亦可逐步迁入，本期可不迁） |
| `status` | string | 固定 `RECORDED`（mock）；未来真退再扩 `PENDING_WX` / `SUCCEEDED` |
| `createdAt` | instant | 写入时间 |

订单视图可选附加（店家/管理可读；顾客端可不展示金额细节）：

| 字段 | 类型 | 说明 |
|------|------|------|
| `refundLedgerStatus` | string \| null | 有应退记录时为 `RECORDED`；否则 null |

本期 **不**新增顾客可见「退款中」流转；FE 仅需展示「超时未取」。

### 2.5 与取消的边界

- 22:00 前顾客/店家取消 → 仍走 `CANCELLED` + 既有 cancel 字段；**不**写 `closeReason`。
- 22:00 后扫描到的未取单 → 一律 `CLOSED` + `NO_PICKUP`，不再允许核销。

---

## 3. 示例片段

### GET `/config/ordering?pickupDate=2026-11-01`

```json
{
  "timezone": "Asia/Shanghai",
  "nextPickupDate": "2026-11-01",
  "pickupDateForSlots": "2026-11-01",
  "defaultPickupSlot": "MORNING",
  "defaultSlotCapacity": { "MORNING": 30, "NOON": 30, "EVENING": 30 },
  "subscribePreparedTmplId": "",
  "pickupSlots": [
    {
      "code": "MORNING",
      "label": "上午取",
      "hint": "08:00–11:00",
      "capacity": 30,
      "occupied": 12,
      "remaining": 18,
      "full": false
    },
    {
      "code": "NOON",
      "label": "中午取",
      "hint": "11:00–14:00",
      "capacity": 20,
      "occupied": 20,
      "remaining": 0,
      "full": true
    },
    {
      "code": "EVENING",
      "label": "下午取",
      "hint": "14:00–18:00",
      "capacity": 30,
      "occupied": 3,
      "remaining": 27,
      "full": false
    }
  ]
}
```

### POST `/orders` 满档拒绝

```http
POST /api/v1/orders
```

```json
{ "code": 40013, "message": "该时段已约满", "data": null }
```

### 订单 detail（超时未取）

```json
{
  "id": "ord_xxx",
  "status": "CLOSED",
  "pickupDate": "2026-10-30",
  "pickupSlot": "NOON",
  "closeReason": "NO_PICKUP",
  "closedAt": "2026-10-30T22:00:08+08:00",
  "depositPaid": false,
  "refundLedgerStatus": "RECORDED"
}
```

---

## 4. FE 对接要点（摘要）

| 场景 | BE 暴露 | FE 行为 |
|------|---------|---------|
| 确认页选档 | `pickupSlots[].remaining` / `full` | `full` 禁用或选中后 Toast；埋点 T24，属性 `slot_capacity` / `slot_remaining` |
| 提交满档 | `code=40013` `SLOT_FULL` | Toast「该时段已约满」；T07 `fail_reason=slot_full` |
| 店家列表 Tag | 同日 `full` | 「已约满」Tag；纯展示可不打点 |
| 超时未取 | `status=CLOSED` + `closeReason=NO_PICKUP` | 文案「超时未取」；T25（与 T13 支付超时区分） |
| 核销窗内 | 22:00 前仍 `PREPARED` | 正常核销，不打 T25 |

---

## 5. 实现落点（给 BE）

| 项 | 建议 |
|----|------|
| `ErrorCodes.SLOT_FULL = 40013` | 新增 |
| `OrderEntity.closeReason` / `closedAt` | 新增列；`ddl-auto: update` |
| `OrderService.closeExpired()` | 保留支付超时分支并补 `PAY_TIMEOUT`；同方法或邻方法扫 `NO_PICKUP` |
| 占位 COUNT | `OrderRepository` 增按 date+slot+statuses 计数 |
| 应退台账 | 新表或最小实体；关单路径调用 |
| 分支 | `feat/slot-capacity`、`feat/no-pickup-timeout` 可同 PR 或拆两个 PR→`dev` |

本地 H2：加列后若异常，删 `apps/api/data/pork_preorder*` 后重启（同 `07` 说明）。

---

## 6. 开放问题（最多 3；非阻塞已自定默认）

| # | 问题 | 本契约默认 | 谁拍板 |
|---|------|------------|--------|
| 1 | 支付成功瞬间满档：关单应退 vs 保持待支付改档？ | **关单 + `SLOT_FULL_ON_PAY` + mock 应退**（无改档 API） | FE/PM 若强诉求「改档」再开迭代 |
| 2 | `closedAt` 是否独立列？ | **独立列**；可暂回落 `updatedAt` 但不推荐 | BE 可直接按独立列做 |
| 3 | 日覆盖是否允许只改一档？ | **允许**（PUT body 部分 slot） | 已定 |

无其它阻塞项；容量默认 30、占位仅 `PENDING_PREPARE`+`PREPARED`、错误码 `SLOT_FULL=40013` 已定。
