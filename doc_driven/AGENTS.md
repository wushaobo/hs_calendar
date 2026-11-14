# 方案：doc_driven（到岗会疯）

> 当前 session 只实现本目录，不修改 `requirement/` 或其他方案目录。
> 不写服务端、不做机器人、不做第三方平台集成。

## 1. 开始前按顺序读

1. 本文件
2. `../AGENTS.md`
3. `../requirement/README.md`
4. `../requirement/data-model.md`
5. `../requirement/features.md`
6. `../requirement/journeys.md` 的「doc_driven」一节
7. `../requirement/conventions.md`
8. `../requirement/holidays.json`
9. `../requirement/test-cases.json`

## 2. 方案范围与运行模型

- 手机 AI app + skill 包 + 资料库；单用户、对话式。
- skill 包（云端沙箱只读）：`hs-calendar/SKILL.md`、`references/rules.md`、
  `data/holidays.json`。
- 资料库（可读写）：`records.csv`；skill 指挥 AI agent 通过 app 文件工具读写。
- 业务口径以 `references/rules.md` 为准；流程、模板、错误处理以 `SKILL.md` 为准。
  本文件只引用，不复述。
- 不写服务端、不做机器人/多用户/提醒/推送/导出/云同步；不绑定具体 app 的专有格式。

## 3. 交付物与落位

| 路径 | 角色 | 读写 | 说明 |
|---|---|---|---|
| `hs-calendar/SKILL.md` | skill 入口 | 包内只读 | 流程、指令、模板、错误处理 |
| `hs-calendar/references/rules.md` | 业务规则 | 包内只读 | 唯一业务口径 |
| `hs-calendar/data/holidays.json` | 节假日配置 | 包内只读 | 记录 dataVersion |
| `records.csv` | 上传模板 | 本目录文件 | 仅表头；上传到资料库后成为运行数据 |
| `README.md` | 人类使用说明 | 不交付 | 安装、使用、备份、限制 |
| `verification.md` | 验证记录 | 不交付 | 12 用例 + 流程用例 |
| `AGENTS.md` | 本文件 | 不交付 | session 入口 |

“不交付”指不把文件上传到 AI app，仅保留在仓库。

硬性约束：

- skill 包内不得出现 `records.csv`。
- 运行时 `records.csv` 只在资料库，不在仓库或 skill 包。
- 不要求用户手动复制、保存、替换 CSV；写入通过 app 文件工具完成。
- 文件按名称 `records.csv` 和表头识别；不使用相对/绝对路径或“同目录”。

## 4. 不可越界

- `requirement/` 只读；不改其他方案目录。
- 不写服务端、不做机器人、不做多用户、不做提醒/推送/导出、不做云同步。
- 不建第二个数据文件；不把聊天内容当作数据源。
- 不引入 app 专有格式；skill 和文档必须可移植。
- 不修改 skill 包内文件。
- 通用 session 规则见 `../AGENTS.md`；本文件只写 doc_driven 特有约束。

## 5. 实现约定

- `SKILL.md` 只做流程与文案渲染；公式、状态码、回复结构以 `rules.md` 为准。
- 数据文件契约以 `rules.md` 第 8.1 节为准，不在本文件复述。
- 用户可见错误文案与回复模板以 `SKILL.md` 第 10、11、12 节为准，不在本文件复述。
- 写入必须通过 app 资料库文件工具，并在写后回读确认；写失败明确报错，不要求
  用户手工保存。
- 版本常量权威是 `rules.md` 第 1 节与 `holidays.json`；README 第 2 节只是快照。

## 6. 修改与验证

1. 先读 `requirement/` 与 `hs-calendar/references/rules.md`。
2. 修改 skill 包内容；保持 `rules.md` 为唯一业务口径。
3. 跑 `../requirement/test-cases.json` 的 12 条用例。
4. 更新 `verification.md` 与 README 的版本/变更记录。
5. 若规则变更，按 `../AGENTS.md` 的流程先在需求 session 确认并递增 specVersion；
   不要只改 `rules.md`。
6. 确认未改 `requirement/` 或其他方案目录。

## 7. 完成定义

- skill 包 3 文件齐全，包内无 `records.csv`。
- 12 条黄金用例通过；证据在 `verification.md`。
- 手机 AI app 中能用短指令完成：查看本月、记录到岗/请假、取消、查历史。
- 写入通过 app 资料库文件工具；写失败能明确报错，不要求用户手工保存。
- README 覆盖：上传、首次确认、日常使用、数据与备份、更新节假日、测试、版本、
  已知限制。
- 未修改 `requirement/` 或其他方案目录。

## 8. 文档入口

- `README.md`：人类使用说明。
- `hs-calendar/SKILL.md`：运行时行为、指令、模板、错误处理。
- `hs-calendar/references/rules.md`：唯一业务口径。
- `verification.md`：验证证据。
- `../AGENTS.md`：跨方案 session 约定。
