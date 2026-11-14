# 到岗会疯（hs_calendar）— 跨 Session 开发约定

> 本文件是所有实现 session 的权威启动说明。业务规则的最终来源是 `requirement/README.md`；若本文件与其冲突，以 `requirement/README.md` 为准。

## 1. 项目一句话

个人到岗率追踪工具：`当月到岗天数 ÷ 当月工作日天数 ≥ 30%`，随时回答「本月已到岗几天、还需几天」。
同一需求有四个独立实现：`pwa/`、`android_app/`、`doc_driven/`、`hermes/`。

## 2. Session 边界

- 当前 session **只实现一个方案目录**，不要改动其他方案目录。
- `requirement/` 对方案 session **只读**；不要修改根约定文件。
- 四方案不共享运行时代码、数据库或部署；只共享需求文档、节假日 JSON、测试用例。
- 需要改规则时，先在独立的需求 session 中提出，用户确认后更新 `requirement/` 并递增 `specVersion`。

## 3. 开始前必读（按顺序）

> 以下路径以方案目录为当前目录；若在仓库根目录阅读，去掉开头的 `../`。

1. `当前方案目录/AGENTS.md`
2. `../AGENTS.md`（本文件）
3. `../requirement/README.md` — 业务规则、公式、边界、验收用例
4. `../requirement/data-model.md` — 数据结构、输出字段、节假日 JSON
5. `../requirement/features.md` — 功能清单与方案矩阵
6. `../requirement/journeys.md` — 只读当前方案那一节
7. `../requirement/conventions.md` — 命名、状态码、文案、存储、bot 命令
8. `../requirement/holidays.json` — 2026 公休假与调休数据
9. `../requirement/test-cases.json` — 黄金用例

## 4. 不可违背的规则

- 工作日集合 = `(周一至周五 − 公休假) ∪ 调休补班日`；`W0` = 集合日期数。
- `W = max(0, W0 − L)`；`need = ceil(0.3W)`，整数实现 `(3W + 9) // 10`。
- `remain = max(0, need − A)`。
- `S` = **今天（含）到月末**的工作日数，含调休补班日；仅当前月计算。
- `feasible = S ≥ remain`。
- 到岗率 `R = A / W`，展示时四舍五入保留 1 位小数（0.5 向上）。
- 只允许记录工作日、今天及以前；未来日期、非工作日记录无效并单独报告。
- 历史月可修改；`S`、`feasible` 为 `null`。
- `W = 0` → `no_need`；`L > W0` → `data_error`。
- 阈值固定 30%；单用户；不做提醒/推送/导出/同步；所有方案只在手机上交互。

## 5. 命名与外部契约

统一使用 `requirement/conventions.md` 中的：

- 展示名「到岗会疯」，短名「到岗」，技术标识 `hs_calendar`。
- 状态码 `on_site` / `leave`；结果状态 `qualified` / `needs_days` / `too_late` / `no_need` / `below_target_ended` / `data_error`。
- 日期存储 `YYYY-MM-DD`，展示 `MM/DD`；时区 `Asia/Shanghai`。
- 数据库 `hs_calendar.db`；IndexedDB `hs_calendar`；环境变量前缀 `HS_CALENDAR_`。
- 不得自创另一套字段名、状态文案或日期格式。

## 6. 完成定义

- 功能清单 F1–F9 可用（按 `requirement/features.md`）。
- `requirement/test-cases.json` 全部通过。
- 手机端能按 `requirement/journeys.md` 走通本方案 journey。
- 方案目录内有 `README.md`：如何运行、如何测试、数据位置、specVersion、holiday dataVersion、已知限制。
- 未修改 `requirement/` 或其他方案目录。

## 7. 遇到歧义

先读 `requirement/`；仍不明确就问用户，不要自行发挥或另立口径。
