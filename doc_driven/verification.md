# doc_driven 验证记录

## 1. 验证环境

| 项 | 值 |
|---|---|
| 验证日期 | 2026-11-14 |
| specVersion | `1` |
| holiday dataVersion | `2026.1` |
| 时区 | `Asia/Shanghai` |
| 阈值 | `0.30` |
| 节假日数据 | 23 条公休假 + 2 条调休补班日，两数组无交集 |
| skill 包布局 | `hs-calendar/{SKILL.md,references/rules.md,data/holidays.json}` |
| 记录位置 | AI app 资料库中的 `records.csv`（不在 skill 包内） |
| 黄金用例来源 | `../requirement/test-cases.json`（12 条） |

验证方式说明：

- 12 条黄金用例由一份独立的一次性计算脚本，按
  `hs-calendar/references/rules.md` 的公式重算，并与 `test-cases.json` 的
  `expected` 逐字段比对。该脚本只用于本次验证，不随方案提交。
- 流程用例用内存资料库模拟 app 的文件工具：
  `library = { "records.csv": { text, version, writable } }`，
  文件工具为 `find(name)`、`read(handle)`、`replace(handle, text, version)`；
  handle 不暴露路径。
- 本次未在真实手机 AI app 中执行。真实 app 是否支持按文件名查找、读取全文、
  整文件替换和版本检查，仍需实测；相关限制已写入 `README.md` 第 8 节。

## 2. 12 条黄金用例

逐字段比对 `w0`、`leave_days`、`working_days`、`on_site_days`、`need`、
`remain`、`rate_percent`、`remaining_workdays`、`feasible`、`result_status`、
`invalid_records`。

| # | case id | 月份 / today | W0 | L | A | W | need | remain | rate | S | feasible | 状态 | 结果 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `2026-11-empty` | 2026-11 / 11-16 | 21 | 0 | 0 | 21 | 7 | 7 | 0.0 | 11 | true | `needs_days` | ✅ PASS |
| 2 | `2026-11-qualified-7` | 2026-11 / 11-16 | 21 | 0 | 7 | 21 | 7 | 0 | 33.3 | 11 | true | `qualified` | ✅ PASS |
| 3 | `2026-11-leave-1-a6` | 2026-11 / 11-16 | 21 | 1 | 6 | 20 | 6 | 0 | 30.0 | 11 | true | `qualified` | ✅ PASS |
| 4 | `2026-11-leave-1-a5` | 2026-11 / 11-16 | 21 | 1 | 5 | 20 | 6 | 1 | 25.0 | 11 | true | `needs_days` | ✅ PASS |
| 5 | `2026-11-leave-3-a6` | 2026-11 / 11-16 | 21 | 3 | 6 | 18 | 6 | 0 | 33.3 | 11 | true | `qualified` | ✅ PASS |
| 6 | `2026-11-all-leave` | 2026-11 / 11-30 | 21 | 21 | 0 | 0 | 0 | 0 | null | null | null | `no_need` | ✅ PASS |
| 7 | `2026-10-historical-below` | 2026-10 / 11-16 | 19 | 0 | 4 | 19 | 6 | 2 | 21.1 | null | null | `below_target_ended` | ✅ PASS |
| 8 | `2026-02-overrides-qualified` | 2026-02 / 02-24 | 16 | 0 | 5 | 16 | 5 | 0 | 31.3 | 5 | true | `qualified` | ✅ PASS |
| 9 | `2026-02-leave-on-override` | 2026-02 / 02-24 | 16 | 1 | 5 | 15 | 5 | 0 | 33.3 | 5 | true | `qualified` | ✅ PASS |
| 10 | `2026-11-last-day-feasible` | 2026-11 / 11-30 | 21 | 0 | 6 | 21 | 7 | 1 | 28.6 | 1 | true | `needs_days` | ✅ PASS |
| 11 | `2026-11-last-day-too-late` | 2026-11 / 11-30 | 21 | 0 | 5 | 21 | 7 | 2 | 23.8 | 1 | false | `too_late` | ✅ PASS |
| 12 | `2026-11-invalid-record` | 2026-11 / 11-16 | 21 | 0 | 0 | 21 | 7 | 7 | 0.0 | 11 | true | `needs_days` | ✅ PASS |

用例 12 的 `invalid_records` 为 `[{date: "2026-11-14", status: "on_site"}]`，
2026-11-14 是周六，未计入 `A`。

结论：**12 / 12 通过**。

重点核对项：

- `2026-02`：`5 / 16 = 31.25%`，半向上得到 `31.3`；`W0 = 20 − 6 + 2 = 16`。
- `2026-10`：`4 / 19 = 21.052…%`，半向上得到 `21.1`；国庆扣除 3 个工作日。
- `2026-11`：`W0 = 21`；today = 11/16 时 `S = 11`；today = 11/30 时 `S = 1`。
- 整月请假：`W = 0`，`rate_percent`、`S`、`feasible` 均为 `null`，状态 `no_need`。
- 当前月 `S` 包含今天，不因今天已有记录扣减。

## 3. 算例逐字核对

`hs-calendar/references/rules.md` 第 10 节的 6 个算例已用同一套规则渲染并与文档
逐字比对：

| 算例 | 关键结果 | 核对 |
|---|---|---|
| 10.1 2026-11 无记录 | need=7, remain=7, R=0.0, S=11, `needs_days` | ✅ 一致 |
| 10.2 请 1 到岗 5 | W=20, need=6, remain=1, R=25.0, S=11 | ✅ 一致 |
| 10.3 最后一天到岗 5 | need=7, remain=2, R=23.8, S=1, `too_late` | ✅ 一致 |
| 10.4 2026-02 调休 | W0=16, need=5, R=31.3, S=5, `qualified` | ✅ 一致 |
| 10.5 2026-10 历史月 | W0=19, need=6, remain=2, R=21.1, 无 S | ✅ 一致 |
| 10.6 2026-11 整月请假 | W=0, `no_need`, 无占比与 S | ✅ 一致 |

## 4. 流程用例

模拟条件：today = 2026-11-14（周六）；可写工作日使用 2026-11-13（周五）；
资料库初始只有表头。每个用例记录文件工具调用序列与写后回读结果。

| # | 操作 | 预期 | 结果 |
|---|---|---|---|
| W1 | 资料库空表，发 `11/13请假` | `find → read → replace → read`；新增一行；回复「已记录 11/13 请假」+ 统计块 | ✅ PASS |
| W2 | 同日再发 `11/13到岗` | 仍只有一行；状态变为 `on_site`；回复注明「覆盖原记录：请假」 | ✅ PASS |
| W3 | 发 `取消11/13` | 删除该行，保留表头；回复「已取消 11/13 记录（原为到岗）」 | ✅ PASS |
| W4 | today=11/14 时发 `11/20到岗` | 首行「未来日期不可记录」；`replace` 调用次数为 0 | ✅ PASS |
| W5 | today=11/20 时补记 `11/14到岗` | 首行「非工作日不可记录」（11/14 是周六）；`replace` 调用次数为 0 | ✅ PASS |
| W6 | today=2028-01-10 时补记 `2027-06-01到岗` | 首行「2027 年节假日数据未配置，暂不可记录」；`replace` 调用次数为 0 | ✅ PASS |
| W7 | 资料库无 `records.csv`，发 `本月` | 停止；回复「请在资料库中上传 records.csv（首次可只含表头 date,status,updatedAt）」；不创建文件 | ✅ PASS |
| W8 | 写入工具不可用或资料库只读，发 `11/13请假` | 回复「写入失败，记录未保存」；不出现「已记录」；不输出完整 CSV；不出现「复制/替换/保存」；文件不变 | ✅ PASS |
| W9 | 资料库有两个同名 `records.csv` | 停止；回复「资料库中存在多个 records.csv，请只保留一个」；不读取统计、不写入 | ✅ PASS |
| W10 | `records.csv` 只存在于 skill 包内 | 停止；回复「records.csv 位于 skill 包内，无法写入；请移到资料库」；不写包内文件 | ✅ PASS（人工走查） |
| W11 | `replace` 返回成功但回读内容未变化 | 回复「写入未确认，记录可能未保存」；不出现「已记录」；不出统计 | ✅ PASS |
| W12 | 读取后、写入前文件版本发生变化 | 重新读取并重算一次；仍变化则回复「records.csv 已被其他会话修改，本次操作未应用」 | ✅ PASS |
| W13 | 文件工具只返回不透明 handle，不返回路径 | 全流程正常；没有构造、拼接或猜测任何路径 | ✅ PASS（人工走查） |
| W14 | 发 `取消11/13` 但目标日期不存在 | 回复「11/13 没有记录，未做修改」；`replace` 调用次数为 0 | ✅ PASS |
| W15 | `records.csv` 表头错误 | 停止写入；首行「records.csv 表头错误：应为 date,status,updatedAt」 | ✅ PASS |
| W16 | 同日期重复行 | 读取时取 `updatedAt` 最新一条并提示；写入时全量去重 | ✅ PASS |

补充核对：

- 写入成功后统计必须来自回读后的文件，不是写入前的内存结果。
- 写入失败后不得出现统计块；若用户随后发「本月」，按实际文件计算。
- 多个同名文件时一律停止，不静默选择。
- 文件名精确匹配 `records.csv`；大小写变体按缺失处理。

## 5. 文档一致性检查

| 检查项 | 结果 |
|---|---|
| 文件树符合 `hs-calendar/` 包布局 | ✅ |
| `SKILL.md` 有 YAML frontmatter，name/description 完整 | ✅ |
| skill 包内不存在 `records.csv` | ✅ |
| `SKILL.md` 不含 `README.md`；`./`、`../`、绝对路径、`同目录` 只出现在禁止语境 | ✅ |
| `rules.md` 不再出现“同目录下的 records.csv 与 holidays.json” | ✅ |
| `SKILL.md` / `rules.md` 不再出现旧文件名 `skill.md` | ✅ |
| 所有文档不再把 `records.csv` 描述为 skill 包内文件 | ✅ |
| 不再存在“输出完整 CSV 让用户替换”的降级路径 | ✅ |
| 写入失败文案不包含“复制/粘贴/手工保存/替换文件”指令 | ✅ |
| 写入流程包含写前版本检查和写后回读 | ✅ |
| 缺 `records.csv`、多个同名文件、只读资料库、工具不可用都有固定文案 | ✅ |
| 包内 `rules.md`/`holidays.json` 是唯一权威，资料库同名文件不参与 | ✅ |
| 12 条黄金用例结果与重构前一致 | ✅ |
| `README.md` 安装章节不再提供附件/代码块 fallback | ✅ |
| 未修改 `requirement/`、其他方案目录、根约定文件 | ✅ |
| 未复制 PWA 的「未来请假预排」偏差 | ✅ |

## 6. 结论与遗留风险

- 12 条黄金用例全部通过，业务口径未变；6 个算例逐字一致。
- 14 条流程用例通过内存资料库模拟，W10/W13 为人工走查；真实 app 的文件工具能力仍需实测。
- 未在真实手机 AI app 中执行，风险集中在：app 是否支持按文件名查找、读取全文、
  整文件替换、写后回读，以及是否向 agent 暴露 skill 包内 `references`/`data`。
- 2027 年节假日数据未配置：查询按周末规则计算并提示，写入被拒绝。
- 相对星期（上周五、周三）不支持，会返回解析失败文案。
- 无状态词的裸日期会追问状态，不会自动猜测。
