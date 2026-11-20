/* ============================================================================
 * 星屿 · Telescope Garden —— 学习资源入口
 * 作品：Telescope Garden 1.0.0 · 作者 7uanm · 开源公开（GNU GPL v3.0）
 * 本文件只负责入口卡片、浏览器版启动与安装包下载，程序本体与美术资源版权归 7uanm
 * ==========================================================================*/
(function () {
  'use strict';
  if (window.Xingyu) return;

  var CFG = window.XINGYU_CONFIG || {};
  var AUTHOR = CFG.author || '7uanm';
  var REPO = CFG.repo || 'https://github.com/i7uanm/TelescopeGarden';
  var RELEASE = CFG.release || 'https://github.com/i7uanm/TelescopeGarden/releases/tag/v1.0.0';
  var VERSION = CFG.version || '1.0.0';

  /* 浏览器版（真 Godot Web 导出）：webBuild 走站内目录，否则用 webUrl */
  var WEB_PATH = CFG.webBuild === true ? 'xingyu/web/index.html' : (CFG.webUrl || '');
  var HAS_WEB = !!WEB_PATH;
  /* 安装包：对象存储/CDN 绝对地址或站内相对路径；留空则回落官方发布页 */
  var PKG = CFG.packageUrl || CFG.localPackage || '';
  var PKG_SIZE = CFG.packageSize || CFG.localPackageSize || '';
  var SHA = CFG.sha256 || '';
  var MIRROR = CFG.mirrorUrl || '';

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function buildCard() {
    var host = $('resourcesPage');
    if (!host || $('xyCard')) return;

    /* ---- 按钮组：能在线玩就给在线玩，其次给下载 ---- */
    var actions = [];
    if (HAS_WEB) {
      actions.push('<button type="button" class="xy-btn xy-btn-primary" id="xyPlay">在浏览器里直接玩</button>');
    }
    if (PKG) {
      actions.push('<a class="xy-btn' + (HAS_WEB ? '' : ' xy-btn-primary') + '" id="xyLaunch" href="' + PKG + '" download>下载完整版' + (PKG_SIZE ? '（' + PKG_SIZE + '）' : '') + '</a>');
    } else if (!HAS_WEB) {
      actions.push('<a class="xy-btn xy-btn-primary" id="xyLaunch" href="' + RELEASE + '" target="_blank" rel="noopener noreferrer">前往官方下载</a>');
    } else {
      actions.push('<a class="xy-btn" id="xyLaunch" href="' + RELEASE + '" target="_blank" rel="noopener noreferrer">下载桌面版</a>');
    }
    if (MIRROR) actions.push('<a class="xy-btn" href="' + MIRROR + '" target="_blank" rel="noopener noreferrer">备用镜像</a>');
    actions.push('<a class="xy-btn" href="' + RELEASE + '" target="_blank" rel="noopener noreferrer">官方发布页</a>');
    actions.push('<a class="xy-btn" href="' + REPO + '" target="_blank" rel="noopener noreferrer">源码仓库</a>');

    /* ---- 说明文字 ---- */
    var note;
    if (HAS_WEB) {
      note = '浏览器版是原版工程的 Web 导出（Godot 4.7.2，单线程 WebAssembly），加载后即为完整游戏；无需安装。';
    } else if (PKG) {
      note = '解压后双击 TelescopeGarden-1.0.0.exe 运行，保留同目录的 native 文件夹；无需安装 Godot、Python 或 Blender，离线可用。';
    } else {
      note = '从 7uanm 官方发布页下载' + (PKG_SIZE ? '（' + PKG_SIZE + '）' : '') + '，解压后双击 TelescopeGarden-1.0.0.exe 运行，保留同目录的 native 文件夹。';
    }
    if (SHA) note += '　SHA-256 <code class="xy-sha" id="xySha" title="' + SHA + '">' + SHA.slice(0, 16) + '…</code>';

    var card = el('div', 'xy-card');
    card.id = 'xyCard';
    card.innerHTML = [
      '<div class="xy-visual">',
      '  <img src="xingyu/assets/scenes.jpg" alt="星屿 · Telescope Garden 实机画面：上海阳台的白天、阿里高原的夜晚、堪培拉天台的白天" loading="lazy" />',
      '  <span class="xy-visual-tag">实机画面</span>',
      '</div>',
      '<div class="xy-body">',
      '  <div class="xy-eyebrow">TELESCOPE GARDEN · 星屿 <span class="xy-ver">v' + VERSION + '</span>' + (HAS_WEB ? ' <span class="xy-ver xy-ver-web">浏览器可玩</span>' : '') + '</div>',
      '  <h3 class="xy-title">在桌面上，留一片星空</h3>',
      '  <p class="xy-desc">Windows 桌面天文摆件与观测模拟。挑一套喜欢的望远镜，选一处城市天台、山间平台或公路停靠点，看它在昼夜交替中开盖、转向、跟踪、中天翻转，再安静归位。完整版，非精简版。</p>',
      '  <div class="xy-credit">',
      '    <span class="xy-credit-avatar">7</span>',
      '    <span class="xy-credit-text">由 <b>' + AUTHOR + '</b> 提供 · 开源公开作品 · <a href="' + REPO + '" target="_blank" rel="noopener noreferrer">源码</a> · <a href="' + RELEASE + '" target="_blank" rel="noopener noreferrer">发布页</a></span>',
      '  </div>',
      '  <ul class="xy-facts">',
      '    <li><b>设备</b>EQ6 / EQ5 / AM5N / AM3N 赤道仪；折射、牛顿、施卡、马卡主镜（76SAP / 200PDS / D60 / 50SAW / 71 / 70APO / FF70 / SQA85）；相机、导星、滤镜轮、电调焦、控制盒、支撑配件自由组合，默认 OAG 导星</li>',
      '    <li><b>观测</b>自动观测、中天翻转、限位与归位；太阳低于 18°、目标高于 5° 才成像，每帧 60 秒模拟曝光；DSS2 巡天参考图</li>',
      '    <li><b>天空</b>M1–M110 与 80 个精选目标共 190 个，方位／高度／升落由地点与时间计算；日月位置、月相、全天星图、岁差修正</li>',
      '    <li><b>场景</b>北京 / 上海 / 武汉 / 阿里 / 阿塔卡马 / 堪培拉 × 六类地台，36 种组合；堪培拉自动处理夏令时；360° 环绕背景可旋转缩放</li>',
      '    <li><b>桌面</b>四档画质、15/30/60/120 FPS 上限、背景透明度、置顶、鼠标穿透、系统托盘、信息框开关、中英即时切换</li>',
      '    <li><b>存档</b>设备与偏好存于 %APPDATA%\\TelescopeGarden\\garden.json，含 garden.json.bak 备份，跨版本兼容</li>',
      '  </ul>',
      '  <div class="xy-actions">',
      '    ' + actions.join('\n    '),
      '  </div>',
      '  <p class="xy-note">' + note + '</p>',
      '</div>'
    ].join('\n');

    host.appendChild(card);

    var play = $('xyPlay');
    if (play) play.addEventListener('click', openWeb);

    var launch = $('xyLaunch');
    if (launch && PKG) {
      launch.addEventListener('click', function () {
        var n = card.querySelector('.xy-note');
        if (n && !n.dataset.busy) {
          n.dataset.busy = '1';
          n.insertAdjacentHTML('afterbegin', '<span class="xy-dl">正在准备下载…（' + (PKG_SIZE || '约 355 MB') + '，请保持页面开启）</span> ');
        }
      });
    }
  }

  /* ------------------------------------------------------ 浏览器版全屏层 */
  var mounted = false;
  function buildOverlay() {
    if ($('xyRoot')) return;
    var root = el('div', 'xy-root');
    root.id = 'xyRoot';
    root.innerHTML = [
      '<div class="xy-shell">',
      '  <header class="xy-top">',
      '    <div class="xy-brand"><span class="xy-brand-mark"></span>',
      '      <span class="xy-brand-text"><b>星屿 · Telescope Garden</b><i>由 ' + AUTHOR + ' 提供 · 开源公开</i></span>',
      '    </div>',
      '    <div class="xy-top-right">',
      '      <span class="xy-pill" id="xyPill">加载中</span>',
      '      <button type="button" class="xy-icon-btn" id="xyFull" title="全屏">⤢</button>',
      '      <button type="button" class="xy-icon-btn" id="xyClose" title="关闭">✕</button>',
      '    </div>',
      '  </header>',
      '  <div class="xy-frame-wrap" id="xyWrap">',
      '    <div class="xy-loading"><div class="xy-spin"></div><p>正在载入星屿引擎…（首次约 385 MB，之后走缓存）</p></div>',
      '  </div>',
      '</div>'
    ].join('\n');
    document.body.appendChild(root);
    $('xyClose').addEventListener('click', closeWeb);
    $('xyFull').addEventListener('click', function () {
      var w = $('xyWrap');
      if (!document.fullscreenElement) { if (w.requestFullscreen) w.requestFullscreen(); }
      else if (document.exitFullscreen) document.exitFullscreen();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.body.classList.contains('xy-locked')) closeWeb();
    });
  }

  function openWeb() {
    if (!HAS_WEB) return;
    buildOverlay();
    $('xyRoot').classList.add('show');
    document.body.classList.add('xy-locked');
    if (mounted) return;
    mounted = true;
    var wrap = $('xyWrap');
    var frame = el('iframe', 'xy-frame');
    frame.src = WEB_PATH;
    frame.setAttribute('allow', 'fullscreen; autoplay; gamepad; xr-spatial-tracking');
    frame.setAttribute('title', '星屿 · Telescope Garden');
    frame.addEventListener('load', function () {
      var ld = wrap.querySelector('.xy-loading');
      if (ld) ld.remove();
      var pill = $('xyPill');
      if (pill) pill.textContent = '运行中';
    });
    wrap.appendChild(frame);
  }

  function closeWeb() {
    var root = $('xyRoot');
    if (root) root.classList.remove('show');
    document.body.classList.remove('xy-locked');
    /* 关闭即卸载引擎，释放显存（下次打开重新加载） */
    if (mounted) {
      var wrap = $('xyWrap');
      var frame = wrap && wrap.querySelector('iframe');
      if (frame) frame.remove();
      if (wrap) wrap.insertAdjacentHTML('beforeend', '<div class="xy-loading"><div class="xy-spin"></div><p>已停止 · 再次打开会重新载入引擎</p></div>');
      mounted = false;
    }
  }

  window.Xingyu = { open: openWeb, close: closeWeb, config: CFG, version: 'entry-3', hasWeb: HAS_WEB };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildCard);
  else buildCard();
})();
