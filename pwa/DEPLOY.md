# Netlify 部署记录

- Site name: `hs-calendar-339`
- Site ID: `4b8c7c24-3e4c-4da5-a35b-59ada6d69023`
- URL: <https://hs-calendar-339.netlify.app>
- Netlify project: <https://app.netlify.com/projects/hs-calendar-339>
- Visibility: Public（未开启 Password protection）

## 重新部署

```bash
cd pwa
npx --yes netlify-cli@latest deploy --prod --dir=public --site 4b8c7c24-3e4c-4da5-a35b-59ada6d69023
```

## 必须注意

`hs-calendar` 子域名已被占用，经确认使用 `hs-calendar-339`。后续重新部署必须继续使用上面的 **Site ID**：

- 同一个 Site ID → 同一个站点、同一个 URL/origin；
- IndexedDB 按 origin 保存；重新部署不会清空 `hs_calendar` 数据库；
- 不要创建新站点或换站点名，否则 origin 改变，旧记录不会自动迁移。
