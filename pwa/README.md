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
- 点工作日（今天及以前，含调休补班日）→ 底部操作单选择「到岗 / 请假 / 清除 / 取消」，即时刷新统计。
- 到岗与请假互斥；同一天后写覆盖前值；不处理半天假。
- 左右箭头或日历横向滑动切换月份；历史月可修改，未来月只读且不展示到岗统计。
- 公休假、周末、调休补班日由打包的 `holidays.json` + 程序计算；调休补班日可正常记录。
- 失效记录（节假日配置变化导致记录不再落在工作日）会在统计卡下方提示，可逐条清除，不自动删除。
- PWA：manifest + service worker，离线打开、添加到主屏。
- 无登录、无多人、无提醒/推送、无导出/同步、无桌面端布局。

## 目录

```text
pwa/
├── public/                       # 可直接拖到 Netlify 的完整静态站点
│   ├── index.html
│   ├── manifest.webmanifest
│   ├── sw.js
│   ├── _headers                  # /sw.js 不缓存，manifest MIME
│   ├── css/app.css
│   ├── js/
│   │   ├── dates.js              # 全部日期工具（唯一日期计算入口）
│   │   ├── stats.js              # 工作日集合 + 月度统计纯函数
│   │   ├── db.js                 # IndexedDB 封装 + 节假日播种
│   │   └── app.js                # 状态、渲染、交互、SW 注册
│   ├── data/holidays.json        # 从 ../requirement/holidays.json 复制
│   └── icons/
│       ├── icon-192.png
│       ├── icon-512.png
│       ├── icon-maskable-512.png
│       ├── apple-touch-icon-180.png
│       └── favicon-32.png
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
3. 点未来日期 → 「未来日期不可记录」；点周末/公休假 → 「非工作日不可记录」。
4. 调休补班日（2026-02-14、2026-02-28）显示「班」且可标记。
5. 切到历史月可修改，不显示「剩余工作日 / 来得及」。
6. 切到未来月只读，统计卡显示「未来月份，暂不可记录」。
7. 同日重复标记直接覆盖；清除后记录消失。
8. 在 DevTools → Application → IndexedDB 手工写入一条周末记录，刷新后出现「失效记录」提示，可清除。
9. DevTools → Application → Service Workers → Offline，刷新仍可打开、可记录，IndexedDB 数据保留。
10. Chrome Manifest 面板无错误、可安装；iOS Safari「添加到主屏幕」后 standalone 打开。
11. 360×640、390×844 下页面无横向/纵向滚动；控制台可执行
    `document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight` 验证。

## 部署到 Netlify（免费子域名）

### 方式 A：拖拽部署（最快）

1. 登录 Netlify，打开 <https://app.netlify.com/drop>。
2. 把 `pwa/public/` **整个目录**拖进去（不是 `pwa/`，也不要只拖 `index.html`）。
3. 等待部署完成，得到一个 `https://<随机名>.netlify.app` 地址。
4. 在站点设置里确认可见性为 **Public**（不要开启 Password protection / 密码保护）。
5. 手机浏览器打开该地址，可「添加到主屏幕」。

### 方式 B：连接 Git 仓库

1. Netlify → Add new site → Import an existing project，选择本仓库。
2. **Base directory** 填 `pwa`（必须；仓库根目录不是站点根目录）。
3. Build command 留空；Publish directory 为 `public`（`netlify.toml` 已声明）。
4. 部署后在站点设置中确认可见性为 **Public**，未开启密码保护。
5. 得到免费 `*.netlify.app` 地址。

`public/_headers` 会为拖拽部署和 Git 部署同时设置：`sw.js` 不缓存、`index.html` 不缓存、manifest MIME、CSP 与基础安全头。

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

- 公式严格按 `../requirement/conventions.md`：
  - `W0` = 当月工作日集合大小；`W = max(0, W0 - L)`；`need = (3W + 9) // 10`；`remain = max(0, need - A)`；`rate = roundHalfUp(A / W × 100, 1)`。
  - `S` = 今天（含）到月末的工作日数，仅当前月；`feasible = S >= remain`。
  - 状态优先级：`data_error → no_need → qualified → below_target_ended / too_late → needs_days`。
- 日期一律以 `YYYY-MM-DD` 存储、`MM/DD` 展示（零填充）；跨年时补年份。所有日期运算集中在 `public/js/dates.js`，固定 `Asia/Shanghai`。
- 记录字段使用 `updated_at`（ISO-8601 UTC），与 `conventions.md` 对齐；月度统计输出仍只包含契约字段。
- 状态文案「还需 N 天」与「还差 N 天」等义；主界面沿用 journeys 的「还需」。
- 历史月以月历日期格（勾/假/班）作为日期明细，不额外做文字列表。
- 未来月不产出统计对象，只显示日历与「未来月份，暂不可记录」。
- 打开始终当前月，不记忆上次浏览月份。

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
