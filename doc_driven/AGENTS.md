# 方案：doc_driven（到岗会疯）

> 当前 session 只实现本目录，不修改 `requirement/` 或其他方案目录。
> 本方案不写服务端、不做机器人、不做第三方平台集成；用手机 AI app + 预置文档 + 一个通用 skill 替代传统程序。

## 1. 方案定位

doc_driven 把「程序」拆成可被手机 AI app 读取和执行的文档：

- **记录 CSV**：到岗/请假数据，一天一行，可增删改查。
- **公休假 JSON**：只读配置，复制自 `../requirement/holidays.json`。
- **规则 MD**：业务口径、公式、字段、日期规则、验收示例。
- **skill**：把用户的短指令映射为固定操作，固定处理流程和回复格式。
- **README**：如何把文件加载到手机 AI app、如何备份、如何更新节假日。

目标：用户在手机 AI app 里用尽量短的输入完成查看和增删改；skill 承担「程序」的角色。
文档和 skill 不依赖任何具体 AI app 的专有格式、工具名或记忆机制。

## 2. 开始前按顺序读

1. 本文件
2. `../AGENTS.md`
3. `../requirement/README.md`
4. `../requirement/data-model.md`
5. `../requirement/features.md`
6. `../requirement/journeys.md` 的「doc_driven」一节
7. `../requirement/conventions.md`
8. `../requirement/holidays.json`
9. `../requirement/test-cases.json`

## 3. 交付物

| 文件 | 作用 | 备注 |
|---|---|---|
| `records.csv` | 记录数据 | 表头 + 数据行；字段与 DayRecord 对齐 |
| `holidays.json` | 公休假与调休配置 | 只读；复制 `requirement/holidays.json`，记录 dataVersion |
| `rules.md` | 规则说明 | 自包含，供 AI app 读取；不依赖仓库路径 |
| `skill.md` | 通用 skill / 系统提示 | 短指令、意图识别、处理流程、回复模板、错误处理 |
| `README.md` | 使用说明 | 加载、备份、更新节假日、已知限制 |
| `AGENTS.md` | 本文件 | 方案入口 |

文件名和目录结构可在实现时调整，但必须保持「数据文件 + 规则文件 + skill + 使用说明」的分工。

## 4. 职责分工

- `rules.md`：唯一业务口径来源。公式、工作日集合、CSV/JSON 字段、状态码、日期规则、验收示例。
- `skill.md`：程序替代。读取规则和数据，识别短指令意图，执行增删改，按固定模板回复；不重新定义业务规则，只引用 `rules.md`。
- `README.md`：人类使用说明。如何把文件放进 AI app 的会话/项目，如何开始一次对话，如何备份/更新。
- `records.csv` / `holidays.json`：数据与配置。skill 不得把记录写到别的文件。

## 5. skill 设计要求

- 短指令 + 自然语言双通道；具体指令表在实现时确定。
- 每次回答前读取 `rules.md`、`records.csv`、`holidays.json`；不依赖上一次对话的记忆。
- 写入规则：同一日期只保留一行；状态只能 `on_site` / `leave`；写后按日期排序；保留表头。
- 计算严格按 `rules.md`；不得自创公式或状态码。
- 回复固定模板：统计 + 日期明细；历史月不展示「是否来得及」。
- 错误固定文案：未来日期 / 非工作日 / 日期格式错误 / 缺少文件 / CSV 格式错误 / 数据异常。
- 如果当前 AI app 不能直接写文件：输出变更行或完整 CSV，让用户替换；不要假装已经写入。
- 不绑定具体 AI app：不使用某家 app 的专有工具名、卡片格式或记忆机制。
- 不把聊天内容当作唯一数据源；CSV 才是记录的唯一来源。

## 6. 实现步骤

1. 复制 `../requirement/holidays.json` 为 `holidays.json`，保持只读。
2. 创建 `records.csv`，至少包含表头 `date,status,updatedAt`；空表即可，格式由 `rules.md` 说明。
3. 写 `rules.md`：从 requirement 文档提炼成自包含规则；包含公式、工作日集合、CSV/JSON schema、状态码、日期规则、2–3 个算例。
4. 写 `skill.md`：按第 5 节设计；短指令表、意图映射、文件读写流程、回复模板、错误处理。
5. 写 `README.md`：加载方式、使用流程、备份、更新节假日、已知限制。
6. 用 `../requirement/test-cases.json` 的 12 个用例手动/模拟跑一遍 skill；确认 CSV 变更和回复一致。
7. 检查不依赖任何特定 AI app。

## 7. 不可越界

- `requirement/` 只读；不改其他方案目录。
- 不写服务端、不做机器人、不做多用户、不做提醒/推送。
- 不把数据发到外部服务；不做云同步。
- 不引入 app 专有格式；skill 和文档必须可移植。

## 8. 完成定义

- 五个文件齐全：`records.csv`、`holidays.json`、`rules.md`、`skill.md`、`README.md`。
- 12 个黄金用例通过（手动模拟即可）。
- 手机 AI app 中能用短指令完成：查看本月、记录到岗/请假、取消、查历史。
- skill 能处理「不能写文件」的降级路径。
- README 说明清楚如何加载、备份、更新节假日。
- 未修改 `requirement/` 或其他方案目录。
