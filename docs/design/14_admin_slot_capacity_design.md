# 超管时段容量配置页（F-SLOT-02 配置 UI · 可开发标注）

| 字段 | 内容 |
|------|------|
| 日期 | 2026-11-02（Asia/Shanghai） |
| 范围 | 仅设计标注 + 高保真；不改 `apps/`、不新开 Figma/Mobbin、不写埋点 schema |
| 依据 | PM 本周开工：超管时段容量配置页；**契约已冻结** `docs/08_f_slot02_noshow_contract_v0.1.md` **§1.6**；UI 基准 Vant Weapp；主色 `#C62828` |
| 关联 | `13_f_slot_capacity_noshow_design.md`（顾客/店家满档与超时未取）、`07_hifi_index.md`、`03_shop_admin_flows.md`、`a_config.html` |
| 继承 | `MORNING/NOON/EVENING` →「上午取/中午取/下午取」· 08–11/11–14/14–18；默认每档 capacity **30** |

---

## 1. 本批范围

1. **超管页 A-CFG-02 时段容量**：全局默认三档 + 按日覆盖（单日）；对接既有管理 API（**BE 本周无新接口**）。
2. **入口**：超管「管理」首页 / 业务配置页进入「时段容量」。
3. **只读余量（本批做）**：选日后用 `GET /admin/config/slot-capacity?pickupDate=` 的 `effective` 展示占用/余量/满档（API 已返回，成本低）。
4. **埋点**：仅标保存成功 / 失败触发点（不写 schema）。

**不在本批**：支付/券/套餐；复杂日历批量改多日；改顾客/店家满档交互（仍以 13 为准）；账号页；真退款。

---

## 2. 文件清单

| 路径 | 动作 |
|------|------|
| `14_admin_slot_capacity_design.md` | **新建** · 本文 |
| `hifi/a_slot_capacity.html` | **新建** · A-CFG-02 高保真 |
| `hifi/a_config.html` | 改 · 增加「时段容量」入口 |
| `07_hifi_index.md` | 改 · 索引本批 |
| `13_f_slot_capacity_noshow_design.md` | 改 · 「本周无超管配置页」→ 指向本文 |
| `03_shop_admin_flows.md` | 短补 · 超管入口与 A-CFG-02 |
| `00_ia_and_pages.md` / `04_page_inventory.md` | 短补 · 页 ID（若缺口） |

样式复用 `hifi/common.css`（`#C62828`）。

---

## 3. 契约对齐（已冻结 · 设计勿改口径）

指针：`docs/08_f_slot02_noshow_contract_v0.1.md` **§1.6**（鉴权同现有 `ADMIN`）。

### 3.1 全局默认 · `PUT /admin/config/ordering`（partial）

```json
{ "defaultSlotCapacity": { "MORNING": 30, "NOON": 30, "EVENING": 30 } }
```

| 规则 | 说明 |
|------|------|
| partial | 可只传 `defaultSlotCapacity`；缺省 key 不改；可与窗/定金等同请求 |
| 合法值 | **正整数 ≥1**；非法 → `BAD_PARAM`（40001） |
| 默认 | 每档 **30** |
| 响应 | 完整 ordering 视图（可含 `defaultSlotCapacity`） |

### 3.2 按日覆盖 · `GET/PUT /admin/config/slot-capacity`

**GET** `?pickupDate=YYYY-MM-DD`（必填）→

| 字段 | 用途 |
|------|------|
| `defaultSlotCapacity` | 全局默认，灰字对照 |
| `overrides` | 本日已覆盖的档（无 key = 用默认） |
| `effective.{SLOT}.{capacity,occupied,remaining,full}` | 有效容量 + 只读占用 |

**PUT** body：

```json
{
  "pickupDate": "2026-11-03",
  "capacities": { "MORNING": 20, "NOON": 20 },
  "clearAll": false
}
```

| 规则 | 说明 | UI 映射 |
|------|------|---------|
| 仅写入出现的 slot | 未出现的保持现状 | 保存时只提交有改动的档；或三档显式提交（见决策 D4） |
| key = `null` | **删除**该日该档覆盖 → 回退默认 | 覆盖输入框**清空**后保存 → 传 `null` |
| `capacities: {}` + `clearAll: true` | **整日清空**覆盖 | 按钮「清除本日覆盖」 |

下发侧（顾客/代录，非本页写）：`GET /config/ordering?pickupDate=` → `pickupSlots[]` 的 capacity/occupied/remaining/full（见 13 / 08 §1.3）。

---

## 4. 信息架构

```
超管 Tab「管理」A-MGMT-01
  ├─ 商品管理 → A-SKU-*
  ├─ 业务配置 → A-CFG-01（下单窗 / 定金）
  │              └─ 入口「时段容量」→ A-CFG-02
  └─（可选同级入口）时段容量 → A-CFG-02

A-CFG-02 时段容量
  ① 全局默认容量（三档数字）→ PUT ordering.defaultSlotCapacity
  ② 按日覆盖（选日期 + 三档；可空=回退）→ GET/PUT slot-capacity
  ③ 只读：该日 effective 占用 / 余量 / 已约满
  ④ 保存 / 清除本日覆盖 → Toast
```

页面 ID：**A-CFG-02**（业务配置子页；独立路由，勿塞进 A-CFG-01 表单以免窗/定金与容量误同存）。

---

## 5. 字段与布局

### 5.1 区块① 全局默认

| UI | 绑定 | 校验 |
|----|------|------|
| 上午取（08:00–11:00） | `defaultSlotCapacity.MORNING` | 正整数 ≥1；空不可保存 |
| 中午取（11:00–14:00） | `NOON` | 同左 |
| 下午取（14:00–18:00） | `EVENING` | 同左 |
| 说明灰字 | — | 「未做按日覆盖的日期，均使用此处默认。默认每档 30。」 |
| 主按钮 | — | 「保存默认容量」→ `PUT /admin/config/ordering` partial |

### 5.2 区块② 按日覆盖

| UI | 绑定 | 行为 |
|----|------|------|
| 取货日 | `pickupDate` | 日期选择；默认次日（或 `nextPickupDate`）；变更即 `GET` 刷新 |
| 三档覆盖输入 | `overrides` / 编辑态 | 有覆盖则显示覆盖值；无则 placeholder 显示「默认 N」且值为空 |
| 清空单档 | 输入清空 | 保存时该 key 传 `null`（删覆盖） |
| 清除本日覆盖 | `clearAll: true` | 二次确认后整日清空；输入复位为空 |
| 只读行 | `effective` | 「占用 x · 余 y」；`full` 时 Tag「已约满」 |
| 主按钮 | — | 「保存本日覆盖」→ `PUT /admin/config/slot-capacity` |

### 5.3 不展示

- 支付/券/套餐相关配置  
- 批量多日日历  
- 占用明细订单列表（有需要去工作台）

---

## 6. 交互规则

1. 进页：拉 `GET /config/ordering`（或最近一次 ordering）填默认三档；按日区默认选 `nextPickupDate`，再 `GET slot-capacity?pickupDate=`。
2. 改日期：重新 GET；未保存编辑丢弃（或脏检查 Toast「请先保存或放弃修改」——默认：**切换前提示若脏**，见 D6）。
3. 保存默认：三档均合法 → PUT ordering → Toast「默认容量已保存」；失败 Toast API `message` 或「保存失败」。
4. 保存本日：组装 `capacities`——有值的档传 int；显式清空的档传 `null`；从未编辑且仍无覆盖的档可不传（保持）——**推荐显式三态**见 D4。
5. 清除本日：Dialog「确定清除该日全部覆盖？将恢复为全局默认」→ PUT `{ capacities:{}, clearAll:true }` → Toast「已清除本日覆盖」。
6. 校验失败（前端先拦）：「请输入 ≥1 的整数」；后端 40001 → Toast 错误文案。
7. 只读占用：不支持在本页改 occupied；刷新随 GET。
8. 埋点触发点（仅标）：`admin_slot_capacity_save_ok` / `admin_slot_capacity_save_fail`（默认/按日可用同一事件 + `scope=default|day`）；不写属性明细。

---

## 7. 文案表（关键 · 可直接开发）

| 场景 | 文案 |
|------|------|
| 导航标题 | 时段容量 |
| 管理/配置入口 | 时段容量 |
| 入口副文 | 全局默认与按日覆盖 |
| 区块①标题 | 全局默认容量 |
| 区块①说明 | 未做按日覆盖的日期，均使用此处默认。默认每档 30。 |
| 档位标签 | 上午取 / 中午取 / 下午取（副：08:00–11:00 等） |
| 保存默认 | 保存默认容量 |
| Toast 默认成功 | 默认容量已保存 |
| 区块②标题 | 按日覆盖 |
| 日期标签 | 取货日 |
| 覆盖 placeholder | 默认 {N} |
| 覆盖说明 | 留空并保存 = 该档回退默认；不支持 0（不可约请用覆盖减小或联系产品）。 |
| 只读占用 | 占用 {occupied} · 余 {remaining} |
| 满档 Tag | 已约满 |
| 保存本日 | 保存本日覆盖 |
| Toast 本日成功 | 本日覆盖已保存 |
| 清除按钮 | 清除本日覆盖 |
| 清除确认标题 | 清除本日覆盖？ |
| 清除确认正文 | 该日三档将全部恢复为全局默认。 |
| 确认 / 取消 | 确定清除 / 取消 |
| Toast 已清除 | 已清除本日覆盖 |
| Toast 失败 | 保存失败（或 API message） |
| 前端校验 | 请输入 ≥1 的整数 |
| 脏切换 | 有未保存修改，是否放弃？ |

---

## 8. 空态 / 校验 / 异常

| 态 | 处理 |
|----|------|
| 无按日覆盖 | 三档输入为空 + placeholder「默认 N」；effective 用默认容量 |
| 非法数字 / 小数 / ≤0 | 前端拦；后端 BAD_PARAM |
| GET 缺 pickupDate | 不发起；日期控件必填 |
| 非 ADMIN | 无入口（管理 Tab 本就超管可见） |
| 网络失败 | Toast「保存失败」/「加载失败」 |
| 覆盖值 = 默认值 | 允许保存为显式覆盖（与默认相同）；清除仍靠清空或 clearAll |

---

## 9. Vant 映射

| 场景 | 建议 |
|------|------|
| 数字输入 | `van-field` type=digit / number；或 stepper（本批 **digit 输入**，避免大容量难输） |
| 日期 | `van-datetime-picker` 日期列 或 `van-calendar` 单选 |
| 保存 | `van-button` primary `#C62828` |
| Toast | `van-toast` |
| 确认清除 | `van-dialog` |
| 已约满 | `van-tag` 灰/warning |
| 卡片分区 | 现有 card 间距 |

---

## 10. 与 13 / 配置页关系

| 项 | 关系 |
|----|------|
| `13_*.md` | 顾客确认/代录满档、工作台「已约满」、超时未取 —— **不变**；其「无超管配置页」由本文落地 |
| `a_config.html` | 保留窗/定金；增加跳转入口，**不把容量字段混进同一保存** |
| 顾客侧 | 只读 `pickupSlots[]`；不展示超管配置数字（13 D9） |

---

## 11. 设计决策（默认可开发）

### 11.1 本批默认

| # | 默认 |
|---|------|
| D1 | 独立页 A-CFG-02；入口在 A-CFG-01 与管理首页 |
| D2 | 默认容量与按日覆盖 **分两个保存按钮**（对齐两个 API） |
| D3 | 本批 **展示** 选日 effective 占用/余量（GET 已有）；不做订单明细 |
| D4 | 保存本日时三档显式提交：有值→int；空→`null`（删覆盖）；避免「未出现的 key 保持旧覆盖」与用户「我以为空就是默认」不一致 |
| D5 | 不做多日批量；单日即可 |
| D6 | 切换取货日若脏：Dialog 确认放弃 |
| D7 | 不允许配 0（与 BAD_PARAM 一致）；「不可约」非本页目标 |
| D8 | 埋点仅保存成功/失败触发点 |
| D9 | 支付/券/套餐搁置 |

### 11.2 非阻塞可选（有默认，可不打断 PM）

| # | 默认 | 可选 |
|---|------|------|
| P1 | 管理首页与配置页 **双入口** | 或仅配置页入口 |
| P2 | 覆盖空=null（D4） | 或「重置为默认」单档文字按钮 |
| P3 | digit 输入 | van-stepper |

**本批无需 PM 再拍板即可开发**；若 P1/P2 有偏好可会后微调，不挡 `feat/admin-slot-capacity`。

---

## 12. 验收点

- [ ] A-CFG-02：全局默认三档，默认值 30，校验 ≥1 整数；保存走 `PUT /admin/config/ordering` partial `defaultSlotCapacity`
- [ ] 按日：选日期 + GET 刷新；覆盖保存走 `PUT /admin/config/slot-capacity`；清空单档 → null；清除本日 → clearAll
- [ ] 只读占用/余量/已约满来自 `effective`
- [ ] Toast 文案与入口文案与 §7 一致
- [ ] `a_config` / 管理首页有「时段容量」入口；hifi 索引已更新；13 已改指向 14
- [ ] 注释标明契约 `08` §1.6；无新接口依赖

---

## 13. 与开发并行

FE 开 `feat/admin-slot-capacity`：新页 + 管理入口；复用现有 ADMIN token。读 08 §1.6 与本文即可；满档顾客路径仍跟 13。BE 接口已在 `feat/slot-capacity` / `dev` 侧具备，本周无新接口。
