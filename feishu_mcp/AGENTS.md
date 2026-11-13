# 方案：飞书 MCP（到岗会疯）

> 当前 session 只实现本目录，不修改 `requirement/` 或其他方案目录。

## 开始前按顺序读

1. 本文件（当前方案入口）
2. `../AGENTS.md`
3. `../requirement/README.md`
4. `../requirement/data-model.md`
5. `../requirement/features.md`
6. `../requirement/journeys.md` 的「飞书 MCP」一节
7. `../requirement/conventions.md`
8. `../requirement/holidays.json`
9. `../requirement/test-cases.json`

## 方案范围

- 手机飞书单聊机器人 / MCP 服务端；对话式查看统计和增删改。
- 统计卡片 + 日期明细；快捷按钮：今天到岗 / 今天请假 / 本月统计 / 取消今天。
- 仅白名单 `open_id` 可用；服务端持久化（SQLite 或等价 JSON）。
- 不做日历视图、不做多用户、不做公司考勤系统对接。

## 不可越界

- `requirement/` 只读；不改其他方案目录。
- 不引用其他方案的代码、数据库或运行时。
- 必须通过 `requirement/test-cases.json`。

## 交付

- 方案 `README.md`：如何配置飞书应用、如何运行 MCP 服务、如何测试、数据位置、`specVersion=1`、`holiday dataVersion=2026.1`、已知限制。
- 公休假/调休 JSON 复制到本方案内，运行时不依赖 `../requirement`。
