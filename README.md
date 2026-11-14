# 到岗会疯（hs_calendar）

个人到岗率追踪工具：`当月到岗天数 ÷ 当月工作日天数 ≥ 30%`。
到岗一天记一天，请假一天记一天；随时查看「本月已到岗几天、还需几天」。

同一需求用四种方案独立实现，用于横向对比。

## 四种方案

| 目录 | 交互形态 | 数据 | 状态 |
|---|---|---|---|
| `pwa/` | 手机浏览器 / 可安装 PWA，月历点选 | 本地存储，离线可用 | 未开始 |
| `android_app/` | Android 原生 App，月历点选 | 本地数据库 | 未开始 |
| `doc_driven/` | 手机 AI app + 文档/skill，对话式 | 本地 CSV + 只读 JSON | 未开始 |
| `hermes/` | 手机 Telegram Bot，对话式 | 服务端 | 未开始 |

四个方案核心功能对齐（记录、统计、历史查询），数据各自独立。

## 新 Session 怎么开始

进入某个方案目录后启动 agent：

```bash
cd pwa        # 或 android_app / doc_driven / hermes
claude
```

Agent 会通过根 `CLAUDE.md` / `AGENTS.md` 获得启动说明。也可以直接提示：

```text
先读 ../AGENTS.md 和其中列出的 requirement 文件，再开始实现当前方案。
```

## 文档索引

- [`AGENTS.md`](AGENTS.md)：所有 session 的权威启动说明与不可违背规则
- [`requirement/README.md`](requirement/README.md)：业务需求、公式、边界、验收用例
- [`requirement/data-model.md`](requirement/data-model.md)：数据结构、输出字段、节假日 JSON
- [`requirement/features.md`](requirement/features.md)：功能清单与四方案矩阵
- [`requirement/journeys.md`](requirement/journeys.md)：四方案 user journey
- [`requirement/conventions.md`](requirement/conventions.md)：命名、状态码、文案、存储、bot 命令
- [`requirement/holidays.json`](requirement/holidays.json)：2026 公休假与调休数据
- [`requirement/test-cases.json`](requirement/test-cases.json)：四方案共用的黄金用例
- [`requirement/dialogue-log.md`](requirement/dialogue-log.md)：需求讨论记录

## 当前规格

- Spec 版本：`1`
- 节假日数据版本：`2026.1`（2026 全年已预置；2027 待补）
- 时区：`Asia/Shanghai`
- 阈值：固定 30%

`requirement/` 对四个实现 session 只读；需要改规则时，先在独立的需求 session 中确认并递增 specVersion。
