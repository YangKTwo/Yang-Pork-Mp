# F-SLOT-02 / F-NOSHOW-01 可开发标注（时段容量满档 + 超时未取）

| 字段 | 内容 |
|------|------|
| 日期 | 2026-10-31（Asia/Shanghai） |
| 范围 | 仅设计标注 + 轻量高保真增量；不改 `apps/`、不新开 Figma/Mobbin、不写埋点 schema |
| 依据 | PM 拍板 F-SLOT-02、F-NOSHOW-01；**契约已冻结**（见 §3）；UI 基准 Vant Weapp；主色 `#C62828` |
| 关联 | `12_f_sub_slot_design.md`（F-SLOT-01 三档基线）、`07_hifi_index.md`、`02_customer_flows.md`、`03_shop_admin_flows.md` |
| 继承 | `MORNING/NOON/EVENING` →「上午取/中午取/下午取」· 08–11/11–14/14–18；`pickupSlot` 大写 |

---

## 1. 本批范围

1. **F-SLOT-02 时段容量**：每档按取货日可配 capacity（全局默认 + 按日覆盖）；`GET /config/ordering` → `pickupSlots[]` 下发 `capacity/occupied/remaining/full`；满档档位 **禁用不可选**；拦截 Toast / 错误文案 **「该时段已约满」**（API `SLOT_FULL=40013`）；店家工作台 Tag「已约满」；埋点只标触发点。
2. **F-NOSHOW-01 超时未取**：取货日 Asia/Shanghai **当日 22:00 后**仍 `PENDING_PREPARE`/`PREPARED` → `CLOSED` + `closeReason=NO_PICKUP`；展示 **「超时未取」**；窗内仍可核销；mock 定金只记应退流水 —— **不做退款流程 UI**。
3. **本周无超管容量配置页**（P1 备注，不挡交付）。
4. **支付瞬间满档**（后端 `CLOSED` + `closeReason=SLOT_FULL_ON_PAY`）：顾客侧若需展示，用关闭文案 **「时段已约满」**（短注即可，本批不单独做支付失败整页）。

**不在本批**：改业务代码、真退款 UI、超管配置 hifi、埋点字段明细。

---

## 2. 文件清单

| 路径 | 动作 |
|------|------|
| `13_f_slot_capacity_noshow_design.md` | **新建** · 本文 |
| `hifi/c_order_confirm.html` | 改 · 满档禁用 + Toast「该时段已约满」 |
| `hifi/s_proxy_create.html` | 改 · 同上（代录同步） |
| `hifi/s_workbench.html` | 改 · 满档 Tag「已约满」+ 超时未取 Tag/筛选 |
| `hifi/c_order_detail.html` | 改 · 超时未取关闭态（+ SLOT_FULL_ON_PAY 短注） |
| `hifi/s_order_detail.html` | 改 · 超时未取关闭态 |
| `07_hifi_index.md` | 改 · 索引本批 |
| `02_customer_flows.md` | 短补 · 交叉引用 13 |
| `03_shop_admin_flows.md` | 短补 · 交叉引用 13 |
| `12_f_sub_slot_design.md` | 短补 · 指向 13（覆盖「无容量」） |

样式复用 `hifi/common.css`（`#C62828`）。

---

## 3. 契约对齐（已冻结 · 设计勿改口径）

### 3.1 `pickupSlots[]`（ordering config）

| 字段 | 说明 | 设计用法 |
|------|------|----------|
| `code` | `MORNING` \| `NOON` \| `EVENING` | 提交 `pickupSlot` |
| `label` / `hint` | 上午取… / 08:00–11:00… | 档位主文案 |
| `capacity` | 容量上限；**默认每档 30** | 一般不直接展示数字 |
| `occupied` | 已占用 | 实现侧 |
| `remaining` | 余量 | 可选缀「余 N」（见决策 D3） |
| `full` | 是否满档（`remaining<=0`） | `full===true` → **禁用 + Tag「已约满」** |

维度：每个 `pickupSlot` × **取货日**；全局默认 capacity=30 + 按日覆盖（本周无超管配置 UI）。

### 3.2 满档错误

| 项 | 冻结值 |
|----|--------|
| Toast / 前端错误文案 | **该时段已约满** |
| API | `SLOT_FULL` = **40013** |
| 确认页 / 代录 | 该档 **禁用不可选**（仍展示 label/hint +「已约满」） |
| 店家工作台 | Tag **「已约满」**（筛选 chip 上/旁；chip 不因满档隐藏） |

### 3.3 `closeReason`（`status=CLOSED` 时）

| closeReason | 触发（契约） | UI 主文案 |
|-------------|--------------|-----------|
| `PAY_TIMEOUT` | 待支付超时关单 | **已关闭**（可副文「超时未付」） |
| `NO_PICKUP` | 取货日 22:00 后仍未核销 | **超时未取** |
| `SLOT_FULL_ON_PAY` | 支付瞬间档位已满（后端关单） | **时段已约满**（短文案；非独立支付失败页） |

与 `CANCELLED`（已取消）必须分文案，勿混用。

### 3.4 超时未取规则

- 时区：取货日 **Asia/Shanghai** 当日 **22:00 后**关单 → `CLOSED` + `NO_PICKUP`
- **22:00 前窗内**：`PENDING_PREPARE` / `PREPARED` 仍可备货、核销
- 定金：mock 只记应退流水；设计无退款按钮/流程

---

## 4. 信息架构 / 涉及页

```
【满档 F-SLOT-02】
C-ORDER-01 确认订单
    → pickupSlots[] 渲染三档；full 项 disabled +「已约满」
    → 点满档 / 提交遇 40013 → Toast「该时段已约满」
S-PROXY-01 代录
    → 同一套禁用与 Toast（不可绕过容量池）
S-WORK 预定区
    → 取货日下筛选 chip：「午」等满档挂 Tag「已约满」
    → 埋点触发：满档曝光 / 满额拦截（只标，不写 schema）

【关闭态】
C-DETAIL / S-ORDER
    → NO_PICKUP：「超时未取」
    → PAY_TIMEOUT：「已关闭」
    → SLOT_FULL_ON_PAY：「时段已约满」（短注）
S-WORK
    → 状态筛可含「超时未取」；卡片 Tag；终态无核销
```

P1：超管容量默认/按日覆盖入口（挂 A-CFG，本周不做页）。

---

## 5. 文案表（关键 · 可直接开发）

### 5.1 满档

| 场景 | 文案 |
|------|------|
| 满档 Tag | 已约满 |
| Toast / 40013 | 该时段已约满 |
| 区块标题 | 取货时段（必选，继承 12） |
| 未选提交 | 请先选好取货时段（继承 12） |

### 5.2 关闭 / 超时未取

| 场景 | 文案 |
|------|------|
| `CLOSED`+`NO_PICKUP` 主徽章 | 超时未取 |
| 顾客详情说明 | 已过取货日当日 22:00，订单已关闭 |
| 店家详情说明 | 取货日 22:00 后仍未核销，系统已关闭（超时未取） |
| 定金行（已付 mock） | 定金：已付 ¥X（应退流水已记 · mock） |
| `CLOSED`+`PAY_TIMEOUT` | 已关闭（副文可选：超时未付） |
| `CLOSED`+`SLOT_FULL_ON_PAY` | 时段已约满 |
| `CANCELLED` | 已取消 |

---

## 6. 交互规则（可落地）

### 6.1 满档

1. `full===true` → **禁用不可选**（非仅提示）；仍展示三档，满档打「已约满」。
2. 点满档或提交返回 40013 → Toast「该时段已约满」。
3. 代录与顾客同一 `pickupSlots[]` 余量，不可绕过。
4. 切换取货日 → 重新按当日 `remaining/full` 渲染。
5. 工作台：满档 chip **不隐藏**，挂「已约满」；店家可筛该档已有单。
6. 埋点触发点：满档档位曝光、点击满档、提交满额拦截（事件名示意 `slot_capacity`；不写 schema）。

### 6.2 关闭态对照

| 条件 | status | closeReason | UI |
|------|--------|-------------|-----|
| 支付超时 | `CLOSED` | `PAY_TIMEOUT` | 已关闭 |
| 取货日 22:00 后未取 | `CLOSED` | `NO_PICKUP` | **超时未取** |
| 支付瞬间满档 | `CLOSED` | `SLOT_FULL_ON_PAY` | 时段已约满 |
| 取消 | `CANCELLED` | — | 已取消 |

进入 `NO_PICKUP` / `SLOT_FULL_ON_PAY` / `PAY_TIMEOUT` 后：无取消、无备货/核销/代取消。

---

## 7. Vant 映射

| 场景 | 建议 |
|------|------|
| 满档档位 | 自定义 Cell + disabled + Tag |
| Toast | van-toast「该时段已约满」 |
| 已约满 / 超时未取 | van-tag（灰 / warning） |
| 工作台筛选 | 现有 chip；满档缀 Tag |

---

## 8. 与 12 / 现有页

| 项 | 关系 |
|----|------|
| `12_*.md` | F-SLOT-01 三档/文案/筛选仍有效；「无容量」**由本批覆盖** |
| 确认 / 代录 / 工作台 / 两端详情 | 见 §2 文件清单与 hifi 多态注释 |
| `a_config.html` | 本周不改；P1 容量配置 |

---

## 9. 设计决策

### 9.1 默认可开发（与冻结契约一致）

| # | 默认 |
|---|------|
| D1 | 满档：**禁用** + 仍显示 +「已约满」 |
| D2 | Toast/40013 文案统一「该时段已约满」 |
| D3 | 默认只打「已约满」；`remaining≤3` 且 >0 时可缀「余 N」（FE 可先不做缀） |
| D4 | 代录不可绕过满档 |
| D5 | `NO_PICKUP` 主文案「超时未取」；与 PAY_TIMEOUT / CANCELLED / SLOT_FULL_ON_PAY 分文案 |
| D6 | 无退款 UI；mock 应退仅一行说明 |
| D7 | 无超管配置页（P1） |
| D8 | `SLOT_FULL_ON_PAY`：详情短文案「时段已约满」，不做独立支付失败整页 |
| D9 | 默认 capacity=30（展示层可不强调数字） |

### 9.2 非阻塞可选确认（有默认）

| # | 默认 | 可选 |
|---|------|------|
| P1 | 余量缀仅紧张时 | 或始终「余 N」 |
| P2 | 工作台独立筛「超时未取」 | 或并入「已关闭」仅靠 Tag |

---

## 10. 验收点

- [ ] 确认/代录：`full` 档禁用 +「已约满」；Toast「该时段已约满」；注释含 40013
- [ ] 工作台满档 Tag「已约满」；chip 不消失
- [ ] 顾客/店家详情：`NO_PICKUP` →「超时未取」；与已取消/已关闭/时段已约满可区分
- [ ] 注明窗内可核销；无退款流程 UI；无超管容量页（P1 已标）
- [ ] `SLOT_FULL_ON_PAY` 有短文案注释

---

## 11. 与开发并行

静态 hifi + 标注不阻塞排期。实现：读 `pickupSlots[]`；下单/代录前校验 `full`；40013→统一 Toast；关单任务取货日 22:00→`NO_PICKUP`；支付竞态满档→`SLOT_FULL_ON_PAY`。F-SUB/F-SLOT-01 基线见 `12_f_sub_slot_design.md`。
