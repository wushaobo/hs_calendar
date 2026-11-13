# 方案：Android App（到岗会疯）

> 当前 session 只实现本目录，不修改 `requirement/` 或其他方案目录。

## 开始前按顺序读

1. 本文件（当前方案入口）
2. `../AGENTS.md`
3. `../requirement/README.md`
4. `../requirement/data-model.md`
5. `../requirement/features.md`
6. `../requirement/journeys.md` 的「Android App」一节
7. `../requirement/conventions.md`
8. `../requirement/holidays.json`
9. `../requirement/test-cases.json`

## 方案范围

- Android 原生 App；手机端使用，不做桌面端。
- 打开即当前月；月历 + 统计卡；点工作日选择到岗 / 请假 / 清除。
- 本地数据库（SQLite/Room）持久化；首启导入节假日 JSON；离线可用。
- 无登录、无多用户、无后端；不做提醒推送和桌面小组件。

## 不可越界

- `requirement/` 只读；不改其他方案目录。
- 不引用其他方案的代码、数据库或运行时。
- 必须通过 `requirement/test-cases.json`。

## 交付

- 方案 `README.md`：如何构建运行、如何测试、数据位置、`specVersion=1`、`holiday dataVersion=2026.1`、已知限制。
- 公休假/调休 JSON 放在 assets，运行时不依赖 `../requirement`。
