/* 星屿 · Telescope Garden —— 入口配置
 * 作品：Telescope Garden 1.0.0 · 作者 7uanm · 开源公开（GNU GPL v3.0）
 *
 * webUrl   浏览器版地址：整个 Godot Web 导出目录（index.html 等）放在哪里。
 *          · 与站点同目录：'xingyu/web/index.html'
 *          · 对象存储/CDN：'https://你的存储域名/xingyu/web/index.html'
 *          留空则卡片不提供「浏览器直接玩」，只保留下载入口。
 *
 * webBuild 设为 true 时，按站点内的 xingyu/web/index.html 加载（忽略 webUrl）。
 *
 * packageUrl 下载按钮的目标地址（对象存储绝对地址或站内相对路径）；
 *            留空则回落到 7uanm 的官方发布页。
 * mirrorUrl  备用镜像（网盘等），留空不显示。
 * sha256     官方校验值，卡片上公示，方便下载后核对。 */
window.XINGYU_CONFIG = {
  author: '7uanm',
  repo: 'https://github.com/i7uanm/TelescopeGarden',
  release: 'https://github.com/i7uanm/TelescopeGarden/releases/tag/v1.0.0',
  version: '1.0.0',

  webUrl: 'xingyu/web/index.html',
  webBuild: false,

  packageUrl: '',
  packageSize: '355 MB',
  sha256: '9365aa8d903e9a1c0eb9826ee8e7ac2ec60f9d76a6e4e418717c53766bf7c4be',
  mirrorUrl: ''
};

