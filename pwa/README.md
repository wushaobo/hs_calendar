# 到岗会疯 · PWA

个人到岗率追踪工具的手机 PWA：`当月到岗天数 ÷ 当月工作日天数 ≥ 30%`，随时回答「本月已到岗几天、还需几天」。

纯静态单页应用，无后端、无账号、无云同步；数据只保存在当前设备的 IndexedDB。可安装到手机主屏，离线可用。

## 版本

| 项 | 值 |
|---|---|
| 展示名 / 短名 | 到岗会疯 / 到岗 |
| 技术标识 | `hs_calendar` |
| specVersion | `1` |
| holiday dataVersion | `2026.1` |
| 时区 | `Asia/Shanghai` |
| 阈值 | 固定 `0.30` |
| 语言 | `zh-CN` |

## 功能

- 月历查看当前月，首屏显示：已到岗 A 天 / 工作日 W 天、占比、达标所需天数、还需天数、剩余可用工作日、是否来得及。
- 点工作日（今天及以前，含调休补班日）→ 底部操作单选择「清除 / 到岗 / 请假」，即时刷新统计；点操作单外区域关闭。
- 到岗与请假互斥；同一天后写覆盖前值；不处理半天假。
- 左右箭头或日历横向滑动切换月份；历史月可修改，未来月只读且不展示到岗统计。
- 当前月未来工作日可预排请假（操作单只有「清除 / 请假」）；未来月份仍只读。
- 公休假、周末、调休补班日由打包的 `holidays.json` + 程序计算；调休补班日可正常记录。
- 失效记录（节假日配置变化导致记录不再落在工作日）会在统计卡下方提示，可逐条清除，不自动删除。
- PWA：manifest + service worker，离线打开、添加到主屏。
- 无登录、无多人、无提醒/推送、无导出/同步、无桌面端布局。

## 目录

```text
pwa/
├── public/                       # 可直接拖到 Netlify 的完整静态站点
└── tools/
    ├── make_icons.py             # 一次性生成图标，不参与运行时
    └── verify-cases.mjs          # 零依赖验收脚本：跑 test-cases.json 12 条
```

## 本地预览

Service Worker 需要安全上下文（`localhost` 或 HTTPS），**不能直接双击 `index.html` 用 `file://` 打开**。

在 `pwa/` 目录执行：

```bash
python3 -m http.server 4173 --directory public
```

浏览器打开 <http://localhost:4173/>。手机预览可用同一局域网 IP，但非 HTTPS 下 Service Worker 不会注册（页面本身仍可运行）。

## 测试

### 黄金用例（12 条）

```bash
cd pwa
node tools/verify-cases.mjs
```

脚本读取 `../requirement/test-cases.json`，逐条比对 `expected` 的全部字段，并附带时区、跨年、半向上舍入、未来月、失效记录、`W0=0` 等补充断言。只使用 Node 内置模块，不引入 Jest/Vitest 等测试框架，不参与部署。

### 手动验收清单

1. 打开即当前月；顶部显示已到岗、工作日、占比、达标需、还需、剩余工作日。
2. 点今天及以前的工作日 → 操作单 → 到岗/请假/清除，日期格与统计即时更新。
3. 点当前月未来工作日 → 操作单只有「清除 / 请假」；点未来月份日期 → 「未来日期不可记录」；点周末/公休假 → 「非工作日不可记录」。
4. 调休补班日（2026-02-14、2026-02-28）显示「班」且可标记。
5. 切到历史月可修改，不显示「剩余工作日 / 来得及」。
6. 切到未来月只读，统计卡显示「未来月份，暂不可记录」。
7. 同日重复标记直接覆盖；清除后记录消失。
8. 在 DevTools → Application → IndexedDB 手工写入一条周末记录，刷新后出现「失效记录」提示，可清除。
9. DevTools → Application → Service Workers → Offline，刷新仍可打开、可记录，IndexedDB 数据保留。
10. Chrome Manifest 面板无错误、可安装；iOS Safari「添加到主屏幕」后 standalone 打开。
11. 360×640、390×844 下页面无横向/纵向滚动；控制台可执行
    `document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight` 验证。
12. 操作单只有「清除 / 到岗 / 请假」三个按钮，没有取消；点操作单外区域关闭。操作成功不弹 toast；未来/非工作日 toast 显示在日历下方，不遮挡日期格。
13. 当前月预排未来请假后：日期格显示「假」、L+1、W/need 更新、剩余可用工作日扣除该天；未来到岗仍不可标记。

## 部署到 Netlify（免费子域名）

### 方式：Netlify CLI

1. 在 `pwa/` 目录执行：
   ```bash
   npx --yes netlify-cli@latest login
   npx --yes netlify-cli@latest sites:list
   ```
2. 如果已有 `hs-calendar` 站点，记下它的 Site ID；否则创建：
   ```bash
   npx --yes netlify-cli@latest sites:create --name hs-calendar
   ```
   `hs-calendar` 被占用时，先和用户确认 fallback 名称，不要静默换名。本项目实际使用 `hs-calendar-339`，以 [DEPLOY.md](DEPLOY.md) 为准。
3. 用同一个 Site ID 部署：
   ```bash
   npx --yes netlify-cli@latest deploy --prod --dir=public --site <SITE_ID>
   ```
4. 站点保持 **Public**，不要开启 Password protection。
5. Site ID、URL 和重新部署命令记录在 [DEPLOY.md](DEPLOY.md)；后续必须用同一个 Site ID，保持同一站点/URL/origin，IndexedDB 记录才能延续。

`public/_headers` 对拖拽和 CLI 部署都生效：`sw.js` 不缓存、`index.html` 不缓存、manifest MIME、CSP 与基础安全头。

## 数据位置与备份

- 业务数据：IndexedDB 数据库 `hs_calendar`，对象仓库：
  - `day_records`：`{date, status, updated_at}`，主键 `date`
  - `holidays`：`{date, name}`
  - `workday_overrides`：`{date, name}`
- 不使用 localStorage 存业务数据；也不做 localStorage 降级。
- 数据只在当前浏览器/设备；**清除站点数据、卸载 PWA、换设备都会丢失记录**，没有云同步或导出。
- 查看方式：桌面 Chrome DevTools → Application → IndexedDB → `hs_calendar`；手机端无法直接查看。

## 更新节假日数据

1. 用新版 `../requirement/holidays.json` 覆盖 `public/data/holidays.json`，更新 README 的 `holiday dataVersion`。
2. 递增 `public/sw.js` 顶部的 `CACHE` 版本（例如 `hs-calendar-v2`），确保已安装的 PWA 拿到新资源。
3. 重新部署。启动时应用会用新 JSON 覆盖 IndexedDB 中的节假日表，不会动 `day_records`。
4. 若配置变化让已有记录不再落在工作日，应用会提示「失效记录」，由用户逐条清除或在新工作日补录。

## 实现口径与取舍

- 公式主体按 `../requirement/conventions.md`：
  - `W0` = 当月工作日集合大小；`W = max(0, W0 - L)`；`need = (3W + 9) // 10`；`remain = max(0, need - A)`；`rate = roundHalfUp(A / W × 100, 1)`。
  - `S` = 今天（含）到月末的工作日数，再扣除当前月已预排的未来请假日期数；仅当前月；今天的请假不扣；`feasible = S >= remain`。
  - 状态优先级：`data_error → no_need → qualified → below_target_ended / too_late → needs_days`。
- 当前月未来工作日允许预排请假；未来请假立即计入 L/W/need，未来到岗/非工作日/未来月记录仍为失效记录；未来月份仍只读。
- 操作成功后不弹底部 toast；底部 toast 只用于未来/非工作日、保存失败、SW 更新。日历底部预留约 56px，toast 显示在日历下方，不遮挡日期格。
- 这是 PWA-only 偏离：`requirement/` 写「未来日期不可记录」「未来月份只读」「S=工作日数」；本方案允许当前月未来工作日请假并扣 S，requirement 不改，后续需求 session 可统一。
- 日期一律以 `YYYY-MM-DD` 存储、`MM/DD` 展示（零填充）；跨年时补年份。所有日期运算集中在 `public/js/dates.js`，固定 `Asia/Shanghai`。
- 记录字段使用 `updated_at`（ISO-8601 UTC），与 `conventions.md` 对齐；月度统计输出仍只包含契约字段。
- 状态文案「还需 N 天」与「还差 N 天」等义；主界面沿用 journeys 的「还需」。
- 历史月以月历日期格（勾/假/班）作为日期明细，不额外做文字列表。
- 未来月不产出统计对象，只显示日历与「未来月份，暂不可记录」。
- 打开始终当前月，不记忆上次浏览月份。
- 月历显示以周日为第一列（日、一、二、三、四、五、六）；工作日统计仍按周一至周五；`requirement/` 的「周一为一周第一天」规则待后续需求 session 统一。

## 已知限制

- 节假日数据只预置 **2026 全年**；2027 待补。查看无数据年份会显示「数据待补」，该年份按「周一至周五为工作日」计算，调休可能不准。
- IndexedDB 不可用（部分无痕模式、存储被禁用）时进入只读错误态，不降级 localStorage。
- iOS/Safari 长期不用的站点可能被系统清理本地数据；无导出/备份能力。
- 设备系统时间错误会导致「今天」错误；本应用只负责按 `Asia/Shanghai` 换算时区。
- Netlify 在中国大陆的访问速度和稳定性不保证；这是部署目标本身的限制。
- 无深色模式、无桌面端布局、无多用户/登录、无提醒/推送、无数据导出。
- 修改任何 `public/` 静态资源后，必须递增 `sw.js` 的 `CACHE` 版本，否则已安装的 PWA 仍会读旧缓存。

## 需求来源

业务规则、字段契约、黄金用例以 `../requirement/` 为准（specVersion `1`）。本目录只读该目录，不修改其中任何文件，也不修改其他方案目录。
