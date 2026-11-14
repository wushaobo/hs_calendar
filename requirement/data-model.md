# 数据模型

> 只定义共通数据语义，不限定各方案的具体技术实现。

## 1. 实体

### 1.1 DayRecord

| 字段 | 类型 | 说明 |
|---|---|---|
| `date` | string `YYYY-MM-DD` | 主键；`Asia/Shanghai` 日历日 |
| `status` | enum | `on_site`（到岗）或 `leave`（请假） |
| `updatedAt` | string ISO-8601 | 最后修改时间，便于排查 |

约束：

- 一天最多一条记录。
- 只能存在于工作日（按当前公休假 + 调休补班日配置判定）。
- 不允许未来日期。
- 到岗与请假互斥。

### 1.2 Holiday

| 字段 | 类型 | 说明 |
|---|---|---|
| `date` | string `YYYY-MM-DD` | 主键 |
| `name` | string | 展示名，如「国庆节」 |

约束：

- 只列公休假日期，可包含落在周末的节日日期；调休补班日不列。
- 公休假若落在周末，可以列出，统计上无额外影响。
- 修改公休假配置可能导致已有记录「失效」，见第 6 节。

### 1.3 WorkdayOverride

| 字段 | 类型 | 说明 |
|---|---|---|
| `date` | string `YYYY-MM-DD` | 主键 |
| `name` | string | 展示名，如「春节调休」 |

约束：

- 只列调休补班日；即使落在周六/周日，也计为工作日。
- 可标记到岗/请假，计入 W 与 A/L。
- 与 `Holiday.date` 不得重复；冲突时视为配置错误。

### 1.4 Settings

| 字段 | 类型 | 值 |
|---|---|---|
| `threshold` | number | 固定 `0.3` |
| `timezone` | string | 固定 `Asia/Shanghai` |

## 2. 派生数据（不持久化）

每次查询时，根据当前公休假/调休配置与记录实时计算：

- `W0`：当月工作日集合的日期数；工作日集合 =（周一至周五 − 公休假）∪ 调休补班日
- `L`：当月有效请假天数
- `W = max(0, W0 − L)`
- `A`：当月有效到岗天数
- `R = A / W`
- `need = ceil(0.3 × W)`，整数实现 `(3W + 9) // 10`
- `remain = max(0, need − A)`
- `S`：今天（含）到月末的工作日数（含调休补班日）；仅当前月计算
- `feasible = S >= remain`；仅当前月计算
- `result_status`：`qualified` / `needs_days` / `too_late` / `no_need` / `below_target_ended` / `data_error`

月度统计输出字段统一为：`w0`、`leave_days`、`working_days`、`on_site_days`、`need`、`remain`、`rate_percent`、`remaining_workdays`、`feasible`、`result_status`、`invalid_records`。详细契约见 [conventions.md](conventions.md) 第 3 节。

## 3. 公休假与调休 JSON

### 3.1 Schema

```json
{
  "schemaVersion": 1,
  "dataVersion": "2026.1",
  "updatedAt": "2026-11-14",
  "timezone": "Asia/Shanghai",
  "holidays": [
    { "date": "2026-10-01", "name": "国庆节" },
    { "date": "2026-10-02", "name": "国庆节" }
  ],
  "workdayOverrides": [
    { "date": "2026-02-14", "name": "春节调休" },
    { "date": "2026-02-28", "name": "春节调休" }
  ]
}
```

字段说明：

| 字段 | 必填 | 说明 |
|---|---|---|
| `schemaVersion` | 是 | 当前为 `1`，便于后续扩展 |
| `dataVersion` | 是 | 节假日数据版本，当前 `2026.1`；各方案复制时记录该值 |
| `updatedAt` | 是 | 数据最后更新日期 `YYYY-MM-DD` |
| `timezone` | 是 | 固定 `Asia/Shanghai` |
| `holidays` | 是 | 公休假数组，可为空 |
| `holidays[].date` | 是 | `YYYY-MM-DD`，唯一 |
| `holidays[].name` | 否 | 展示名；缺省为空字符串 |
| `workdayOverrides` | 是 | 调休补班日数组，可为空 |
| `workdayOverrides[].date` | 是 | `YYYY-MM-DD`，唯一，且不得与 `holidays[].date` 重复 |
| `workdayOverrides[].name` | 否 | 展示名，如「春节调休」 |

### 3.2 规则

- `holidays` 只列公休假日期，可包含落在周末的节日日期；不列调休补班日。
- `workdayOverrides` 只列调休补班日；这些日期即使为周六/周日，也计为工作日且可标记。
- 工作日 = 周一至周五 − 公休假 + 调休补班日。
- 未列出的日期按「周一至周五为工作日、周六周日为休息日」计算。
- 同一个日期不得同时出现在 `holidays` 与 `workdayOverrides`。
- 未知字段应忽略，保证向前兼容。
- 四个方案各自持有一份相同内容的 `holidays.json`。

## 4. 存储建议（非强制）

| 方案 | 建议 |
|---|---|
| PWA | IndexedDB；公休假/调休 JSON 构建时打包 |
| Android | Room/SQLite；`holidays.json` 放 assets，首启导入 |
| doc_driven | 本地记录 CSV（DayRecord）+ 只读公休假 JSON |
| Hermes/Telegram | 服务端 SQLite 或 JSON 文件 |

四方案数据各自独立，不做共享数据库或同步。

## 5. 日期与时间

- 日期以 `YYYY-MM-DD` 字符串保存，不做时区换算。
- 「今天」按 `Asia/Shanghai` 计算。
- 一周从周日开始（仅影响日历列顺序，工作日仍为周一至周五）。
- 月份统计按自然月（1 日至月末）。

## 6. 失效记录

当公休假或调休补班日配置变更，导致某条记录所在日期不再是工作日时：

- 该记录不计入 `A`、`L`、`W`。
- 查询时作为「失效记录」返回（日期 + 原状态）。
- UI/聊天提示用户清除或修正。
- 不自动删除用户数据。
- 反之，若原本不可标记的日期因调休配置变成工作日，允许补录。

未来日期的记录同样视为无效记录；正常写入路径应直接拒绝，不进入存储。

## 7. 数据量

- 一年最多 366 条日记录、约 20 条公休假、少量调休补班日。
- 无需分页、索引优化或归档策略。
