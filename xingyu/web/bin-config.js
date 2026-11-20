/* 星屿 · Telescope Garden —— 大文件来源
 *
 * 现状：主资源包已放在腾讯云 COS。
 *   桶      xinghuan-1521583267（南京 ap-nanjing）
 *   对象    星屿-index.pck
 *   权限    公有读 + CORS（GET/HEAD，Origin *）
 *   校验    364,361,508 字节，与引擎声明一致；文件头 GDPC
 *
 * 外壳（index.html / index.js / index.wasm / 音频 worklet，共约 38 MB）随站点托管；
 * 只有 347.5 MB 的 pck 走桶。音频 worklet 必须与页面同源，所以不能把整个目录丢进桶。
 *
 * 想换文件位置，只改下面这一行即可。注意中文文件名要按 UTF-8 百分号编码。 */

window.XY_PCK_URL = 'https://xinghuan-1521583267.cos.ap-nanjing.myqcloud.com/%E6%98%9F%E5%B1%BF-index.pck';

/* 备选写法：给一个目录，自动拼 /index.pck（文件名得是 ASCII 的 index.pck）
 * window.XY_PCK_BASE = 'https://xinghuan-1521583267.cos.ap-nanjing.myqcloud.com'; */
