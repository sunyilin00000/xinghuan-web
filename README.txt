# 星环终端 · 智能中枢（v2.12 高级感重构）

直接双击 index.html 即可打开。请保持本目录内所有文件在一起。

- 首屏：星环 Hero + 极简登录面板 + 「注册 / Register」入口
- 第二屏：已入驻星系（四张社团毛玻璃卡片）+「申请加入星环」
- 监控中枢默认隐藏，可通过顶部「监控中枢」、星系页底部入口，或登录后的「进入监控中枢」打开
- 入驻申请弹窗目前为前端演示，申请仅保存在本机浏览器 localStorage
- 字体来自 Google Fonts（Montserrat / Noto Sans SC），离线时自动回退系统字体
- 账号登录依赖 SCF API 网关；若从 file:// 打开受 CORS 限制，请部署到域名后使用

业务逻辑：app.js
视觉与交互：script.js
图表依赖：echarts.min.js
