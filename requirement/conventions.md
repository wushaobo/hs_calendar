# 到岗会疯 — 共享命名与实现契约

> Spec 版本：`1`
> 本文件是四个方案（PWA / Android / doc_driven / Telegram）共同遵守的外部契约。
> 业务规则以 [README.md](README.md) 为准；本文件补充命名、字段、文案、存储和伪代码。

## 1. 命名与标识

| 项 | 值 |
|---|---|
| 展示名 | 到岗会疯 |
| 短名 / 主屏名 | 到岗 |
| 技术标识 | `hs_calendar` |
| PWA `name` / `short_name` | 到岗会疯 / 到岗 |
| Android `app_name` | 到岗会疯 |
| Android `applicationId` | `com.wushaobo.hs_calendar`（若工具不接受下划线，归一化为 `com.wushaobo.hscalendar`） |
| doc_driven 文件 | 记录 CSV、公休假 JSON、规则 MD、skill（具体文件名实现时确认） |
| Telegram 机器人显示名 | 到岗会疯 |
| Telegram 用户名 | 由 BotFather 注册；建议 `@hs_calendar_bot`，以实际唯一性为准 |
| SQLite 数据库 | `hs_calendar.db` |
| PWA IndexedDB | `hs_calendar` |
| localStorage 前缀 | `hs_calendar.` |
| 环境变量前缀 | `HS_CALENDAR_` |
| 时区 | `Asia/Shanghai` |
| 语言 | `zh-CN` |
| 阈值 | `0.30` |
| Spec 版本 | `1` |
| 节假日数据版本 | `2026.1` |

环境变量（不写真实密钥）：

```text
HS_CALENDAR_TZ=Asia/Shanghai
HS_CALENDAR_DB_PATH=./data/hs_calendar.db
HS_CALENDAR_ALLOWED_CHAT_IDS=...
HS_CALENDAR_BOT_TOKEN=...
```

## 2. 业务口径（冻结）

### 2.1 工作日集合

```text
workdaySet(month) = { d ∈ month |
  (d 是周一至周五 且 d ∉ holidays) 或 d ∈ workdayOverrides
}
W0 = |workdaySet(month)|
```

- 调休补班日即使落在周六/周日，也属于工作日。
- 同一日期不得同时出现在 `holidays` 与 `workdayOverrides`。
- 调休补班日只影响 W0，不影响「公休假」列表。

### 2.2 月度指标

```text
L = 当月有效请假记录数
A = 当月有效到岗记录数
W = max(0, W0 − L)
need = ceil(0.3 × W)          # 整数实现：(3W + 9) // 10
remain = max(0, need − A)
R = A / W
S = count(workdaySet ∩ [today, monthEnd])   # 仅当前月；含今天
feasible = (S ≥ remain)                      # 仅当前月
```

- `S` **包含今天**，且不因今天已有记录而扣减；这是刻意的简化口径。
- 分母始终是整月工作日，不按「截至今天」截断。
- `rate_percent` 四舍五入保留 1 位小数，0.5 向上；`W = 0` 时为 `null`。

### 2.3 有效记录

有效记录必须同时满足：

1. 日期属于当月工作日集合；
2. 日期 ≤ 今天；
3. 状态为 `on_site` 或 `leave`。

不满足的记录进入 `invalid_records`，不计入 A/L/W，但不清除用户数据。

### 2.4 结果状态

| 状态码 | 条件 | 文案 |
|---|---|---|
| `data_error` | `L > W0` | 数据异常，请检查请假记录 |
| `no_need` | `W = 0` | 本月无需到岗 |
| `qualified` | `remain = 0` | 已合格（可附「超出 X 天」） |
| `below_target_ended` | 历史月且 `remain > 0` | 未达标（本月已结束） |
| `too_late` | 当前月且 `S < remain` | 已来不及 |
| `needs_days` | 当前月且 `S ≥ remain` 且 `remain > 0` | 还差 {remain} 天 |

判定顺序：`data_error` → `no_need` → `qualified` → 历史月 `below_target_ended` → 当前月 `too_late` → `needs_days`。
未来月份只展示日历与工作日，不计算到岗统计。

## 3. 输出字段契约

月度统计 JSON 统一使用以下字段（snake_case）：

| 字段 | 类型 | 说明 |
|---|---|---|
| `w0` | integer | 当月工作日集合大小 |
| `leave_days` | integer | 有效请假天数 L |
| `working_days` | integer | W = max(0, W0 − L) |
| `on_site_days` | integer | 有效到岗天数 A |
| `need` | integer \| null | 达标所需到岗天数；`data_error` 时为 null |
| `remain` | integer \| null | 还需到岗天数；`data_error` 时为 null |
| `rate_percent` | number \| null | 到岗率百分数，保留 1 位小数；W=0 时为 null |
| `remaining_workdays` | integer \| null | S；仅当前月且 W > 0；W=0 或非当前月为 null |
| `feasible` | boolean \| null | 是否来得及；仅当前月且 W > 0；W=0 或非当前月为 null |
| `result_status` | string | 见 2.4 状态码 |
| `invalid_records` | array | 无效记录 `{date, status}` |

记录字段：`date`（`YYYY-MM-DD`）、`status`（`on_site` / `leave`）、`updatedAt`（ISO-8601）。

## 4. 展示文案与错误

### 4.1 统计文案

```text
已到岗 {A} 天 / 工作日 {W} 天
占比 {R}%
还需 {N} 天
剩余 {S} 个工作日
```

状态文案见 2.4。日期明细：

```text
到岗：11/02、11/03、11/05
请假：11/09、11/10
```

无记录时显示「到岗：无」「请假：无」。
日期存储 `YYYY-MM-DD`；展示 `MM/DD`，跨年时补年份。

### 4.2 错误文案

| 场景 | 文案 |
|---|---|
| 未来日期 | 未来日期不可记录 |
| 周末 / 公休假 | 非工作日不可记录 |
| 日期格式错误 | 日期格式应为 YYYY-MM-DD |
| 无权限 | 未授权 |
| 聊天日期解析失败 | 日期解析失败，请示例：今天到岗 / 11月12日请假 / 取消11月10日 |
| L > W0 | 数据异常，请检查请假记录 |

四个方案对同一场景应使用相同或等义的文案，不得自创另一套。

## 5. 存储命名

| 方案 | 建议 |
|---|---|
| PWA | IndexedDB `hs_calendar`；对象仓库 `day_records`、`holidays`、`workday_overrides`；localStorage 前缀 `hs_calendar.` |
| Android | SQLite/Room `hs_calendar.db`；表 `day_records`、`holidays`、`workday_overrides`、`settings` |
| doc_driven | 本地记录 CSV + 只读公休假 JSON；无服务端 |
| Hermes/Telegram | 服务端 SQLite `hs_calendar.db` 或等价 JSON |

四个方案数据独立；不得共享数据库、不得跨方案读写。

## 6. 聊天命令与回复

### 6.1 Telegram

| 命令 | 作用 |
|---|---|
| `/month` | 本月统计 + 日期明细 |
| `/onsite` | 今天标记到岗 |
| `/leave` | 今天标记请假 |
| `/undo` | 取消今天记录 |
| `/history YYYY-MM` | 历史月份统计 + 日期明细 |
| `/help` | 用法 |

同时支持自然语言：「今天到岗」「11月12日请假」「取消11月10日」「看下10月」。

### 6.2 doc_driven

由手机 AI app 读取规则 MD、skill、记录 CSV、公休假 JSON 执行。
具体短指令、文件写入方式和回复形式在 doc_driven 实现 session 中确定，不写入共享契约。

### 6.3 回复结构

聊天/文档方案统一为：

```text
2026 年 11 月
已到岗 4 天 / 工作日 19 天（已请 2 天假）
占比 21.1%，还需 2 天
剩余 11 个工作日，来得及

到岗：11/2、11/3、11/5、11/6
请假：11/9、11/10
```

示例日期为 2026-11-16；`S` 含今天，故为 11。

## 7. 节假日 JSON

- 权威文件：[holidays.json](holidays.json)
- 每个方案在实现中**复制一份**，运行时不依赖 `../requirement`。
- 方案 `README.md` 记录所复制的 `dataVersion`。
- 字段：`schemaVersion`、`dataVersion`、`updatedAt`、`timezone`、`holidays[]`、`workdayOverrides[]`。
- 只列公休假与调休补班日；周末由程序计算。
- 2026 数据已预置；2027 待补。

## 8. 参考伪代码

```text
monthStats(month, today, records, calendar):
  monthStart, monthEnd = bounds(month)
  workdays = workdaySet(month, calendar)
  w0 = |workdays|

  valid = []
  invalid = []
  for r in records where r.date in month:
    if r.date in workdays and r.date <= today:
      valid.append(r)
    else:
      invalid.append(r)

  L = count(valid, status == "leave")
  A = count(valid, status == "on_site")

  if L > w0:
    return {result_status: "data_error", need: null, remain: null, ...}

  W = max(0, w0 - L)
  if W == 0:
    return {w0, leave_days: L, working_days: 0, on_site_days: A,
            need: 0, remain: 0, rate_percent: null,
            remaining_workdays: null, feasible: null,
            result_status: "no_need", invalid_records: invalid}

  need = (3 * W + 9) // 10
  remain = max(0, need - A)

  if month == currentMonth(today):
    S = count(d in workdays where today <= d <= monthEnd)
    feasible = S >= remain
    if remain == 0: status = "qualified"
    elif not feasible: status = "too_late"
    else: status = "needs_days"
  elif month < currentMonth(today):
    S = null
    feasible = null
    status = "qualified" if remain == 0 else "below_target_ended"
  else:
    return not_started   # 未来月份不计算统计

  return {w0, leave_days: L, working_days: W, on_site_days: A,
          need, remain,
          rate_percent: roundHalfUp(A / W * 100, 1),
          remaining_workdays: S, feasible,
          result_status: status, invalid_records: invalid}
```

## 9. 版本与变更

- 当前 `specVersion = 1`。
- 方案 session 只读 `requirement/`；需要改规则时先在需求 session 中确认，更新本目录并递增 `specVersion`。
- 每个方案 `README.md` 必须记录：`specVersion`、`holiday dataVersion`。
- 四个方案必须通过 [test-cases.json](test-cases.json)。
