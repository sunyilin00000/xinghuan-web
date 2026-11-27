/* ============================================================================
 * 星环运营中枢 · 3D 地球态势屏（v2.49）
 * 纯 Canvas 正射投影手写 3D 地球：大陆轮廓 + 真实态势数据
 * 数据来源：memberService web_org_overview（成员库 + 审计日志实时计算）
 * ==========================================================================*/
(function () {
  'use strict';

  var LAND = '000000000000000000000000000000000000000000000000000000000000000000000000,000000000000000000000000000111111100000000000000000000000000000000000000,000000001111111000000000001111111110000000000000000000000000000000000000,111111111111111111111111111111100000011100000000000000000000000000000000,111111111111111111111111111111100000011111111111111111111111111111111111,000000111111111111111111111111111001111111111111111111111111111111111111,111110111111111111111111100011000001111111111111111111111111111111111111,000000001111111111111110000000000000111110111111111111111111111111111111,000000001111111111111000000000000000011111101111111111111111101110000000,000000111111111111100000000000000111100111111110111111111111111111000000,000011111111111110000000000000000111111011111110111111111111111000000000,000011111111111000000000000000011111111111111100111111111111111000000000,000000000000111111000000110011111111111111111110111111111110010000000000,000000000000111110000011110011111111111111111110011111111111100000000000,000000000000000111110000000000011111111111111100000111111111100000000000,000000000000000111101111111110011111111111111000000111111111100000000000,000000000000000000111111111100001111111111111000000110111111000000000000,000000000000000000000111111000000111111111111110000101110111001111100000,000000000000000000000000111111111111111111111110000000011110001111100000,000000000000000000000111000011111111111111110110000000011110000000000000,000000000000000000000111110011111111111111110010000000000011111111100000,000000000000000000000001110111111111111111100010000000000011111111100000,000000000000000000000000001111111111111111000000000000000111111111100000,000000000000000000000000011111111111111110000000000000000111111111100000,000000000000000000000011110001111111111100000000000000000111111111100000,000000000000000000000111111000011111110000000010000000000011111111110111,000000000000000000000011111000000000000000000000000000000000000010001110,000000000000000000000111111000000000000000000000000000000000000000000000,000000000000000000000011110000000000000000000000000000000000000000000000,000000000000000000000001110000000000000000000000000000000000000000000000,000000000000000000000000011000000000000000000000000000000000000000000000,111111111111111111111111111111111111111111111111111111111111111111111111,111111111111111111111111111111111111111111111111111111111111111111111111,111111111111111111111111111111111111111111111111111111111111111111111111,111111111111111111111111111111111111111111111111111111111111111111111111,111111111111111111111111111111111111111111111111111111111111111111111111'.split(',');

  var ORGS = [];    /* 真实社团（key/name/region/city/lat/lon/members/changes/risk） */
  var FEED = [];    /* 真实人员变动（审计日志） */
  var ALERTS = [];  /* 真实风险预警（规则引擎） */
  var dataLoaded = false;

  var METRICS = {
    orgs:    { label: '入驻社团', unit: '个' },
    members: { label: '成员规模', unit: '人' },
    changes: { label: '人员变动', unit: '人次' },
    risk:    { label: '风险指数', unit: '分' }
  };
  var REGIONS = ['全部'];

  var curMetric = 'orgs';
  var curRegion = '全部';
  var selectedId = null;
  var rotY = -1.95, tiltX = -0.38, zoom = 1;
  var dragging = false, lastX = 0, lastY = 0, autoSpin = true;
  var sweepA = 0, dashOff = 0, pulseT = 0;
  var labelQueue = [], placedBoxes = [];
  var stars = [];

  var canvas, ctx, tip, detail, DPR = 1;

  function val(o) {
    if (curMetric === 'orgs') return 1;
    if (curMetric === 'members') return o.members;
    if (curMetric === 'changes') return o.changes;
    return o.risk;
  }
  function metricMax() {
    var mx = 1;
    ORGS.forEach(function (o) { mx = Math.max(mx, val(o)); });
    return curMetric === 'orgs' ? Math.max(4, ORGS.length) : Math.ceil(mx * 1.2);
  }
  function inRegion(o) { return curRegion === '全部' || o.region === curRegion; }
  function nodeColor(o) {
    if (!inRegion(o)) return 'rgba(110,140,180,0.30)';
    if (curMetric === 'risk') {
      var t = Math.min(1, o.risk / 30);
      if (t > 0.66) return '#ff7b7b';
      if (t > 0.33) return '#ffd166';
      return '#3ddc97';
    }
    return o.key === selectedId ? '#ffffff' : '#4fd8ff';
  }
  function selectedOrg() {
    for (var i = 0; i < ORGS.length; i++) if (ORGS[i].key === selectedId) return ORGS[i];
    return null;
  }

  function project(lat, lon, R, cx, cy) {
    var phi = lat * Math.PI / 180;
    var lam = lon * Math.PI / 180 + rotY;
    var x = Math.cos(phi) * Math.sin(lam);
    var y = Math.sin(phi);
    var z = Math.cos(phi) * Math.cos(lam);
    var y2 = y * Math.cos(tiltX) - z * Math.sin(tiltX);
    var z2 = y * Math.sin(tiltX) + z * Math.cos(tiltX);
    return { x: cx + R * x, y: cy - R * y2, z: z2 };
  }

  function makeStars(w, h) {
    stars = [];
    for (var i = 0; i < 140; i++) {
      stars.push({ x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.1 + 0.2, p: Math.random() * Math.PI * 2, s: 0.5 + Math.random() * 1.5 });
    }
  }

  function drawGlobe() {
    var w = canvas.clientWidth, h = canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);
    var cx = w / 2, cy = h / 2;
    var R = Math.min(w, h) * 0.40 * zoom;

    /* 背景星点 */
    ctx.fillStyle = '#cfe6ff';
    for (var i = 0; i < stars.length; i++) {
      var st = stars[i];
      ctx.globalAlpha = 0.12 + 0.5 * (0.5 + 0.5 * Math.sin(pulseT * st.s + st.p));
      ctx.fillRect(st.x, st.y, st.r, st.r);
    }
    ctx.globalAlpha = 1;

    /* 大气层 */
    var at1 = ctx.createRadialGradient(cx, cy, R * 0.96, cx, cy, R * 1.30);
    at1.addColorStop(0, 'rgba(80,180,255,0.20)');
    at1.addColorStop(0.5, 'rgba(60,140,255,0.06)');
    at1.addColorStop(1, 'rgba(60,140,255,0)');
    ctx.beginPath(); ctx.arc(cx, cy, R * 1.30, 0, Math.PI * 2);
    ctx.fillStyle = at1; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, R + 1.5, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(120,210,255,0.55)'; ctx.lineWidth = 1.4; ctx.stroke();

    /* 球体 */
    var g = ctx.createRadialGradient(cx - R * 0.38, cy - R * 0.42, R * 0.1, cx, cy, R);
    g.addColorStop(0, '#1d3358');
    g.addColorStop(0.45, '#10203c');
    g.addColorStop(0.8, '#0a1528');
    g.addColorStop(1, '#060c18');
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = g; ctx.fill();

    var sh = ctx.createRadialGradient(cx + R * 0.55, cy + R * 0.15, R * 0.2, cx + R * 0.55, cy + R * 0.15, R * 1.05);
    sh.addColorStop(0, 'rgba(2,6,14,0.55)');
    sh.addColorStop(0.65, 'rgba(2,6,14,0.25)');
    sh.addColorStop(1, 'rgba(2,6,14,0)');
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = sh;
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    ctx.restore();

    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();

    /* 雷达扫描扇面：地理锚定（随地球自转），中心留白避免“从某节点发出”的错觉 */
    sweepA += 0.012;
    var sweepScreenA = sweepA + rotY;
    if (ctx.createConicGradient) {
      var cg = ctx.createConicGradient(sweepScreenA, cx, cy);
      cg.addColorStop(0, 'rgba(80,220,255,0.18)');
      cg.addColorStop(0.09, 'rgba(80,220,255,0)');
      cg.addColorStop(1, 'rgba(80,220,255,0)');
      ctx.fillStyle = cg;
      ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    }
    ctx.strokeStyle = 'rgba(120,235,255,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(sweepScreenA) * R * 0.35, cy + Math.sin(sweepScreenA) * R * 0.35);
    ctx.lineTo(cx + Math.cos(sweepScreenA) * R, cy + Math.sin(sweepScreenA) * R);
    ctx.stroke();

    /* 全球陆地轮廓（Natural Earth 110m 真实数据，含南极洲；无行政划分） */
    if (window.WORLD_BOUNDS) {
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(140,215,255,0.55)';
      ctx.beginPath();
      window.WORLD_BOUNDS.forEach(function (ring) {
        var prevVis = false;
        for (var vi = 0; vi < ring.length; vi++) {
          var pt = ring[vi];
          var pv = project(pt[1], pt[0], R, cx, cy);
          if (pv.z > 0.02) {
            if (prevVis) ctx.lineTo(pv.x, pv.y);
            else ctx.moveTo(pv.x, pv.y);
            prevVis = true;
          } else {
            prevVis = false;
            ctx.moveTo(NaN, NaN);
          }
        }
      });
      ctx.stroke();
    } else if (LAND.length) {
      /* 兜底：手工点阵大陆 */
      for (var r = 0; r < 36; r++) {
        var row = LAND[r];
        var lat = 87.5 - r * 5;
        for (var cc = 0; cc < 72; cc++) {
          if (row.charCodeAt(cc) !== 49) continue;
          var p = project(lat, -177.5 + cc * 5, R, cx, cy);
          if (p.z <= 0.03) continue;
          ctx.globalAlpha = (0.35 + 0.4 * p.z) * 0.75;
          ctx.fillStyle = '#5fb8ff';
          ctx.fillRect(p.x - 0.9, p.y - 0.9, 1.8, 1.8);
        }
      }
      ctx.globalAlpha = 1;
    }

    /* 经纬网格 */
    ctx.lineWidth = 0.7;
    ctx.strokeStyle = 'rgba(95,190,255,0.18)';
    var lat, lon, p2, prev;
    for (lat = -60; lat <= 60; lat += 30) {
      ctx.beginPath(); prev = null;
      for (lon = -180; lon <= 180; lon += 5) {
        p2 = project(lat, lon, R, cx, cy);
        if (p2.z > 0.02) { if (prev) ctx.lineTo(p2.x, p2.y); else ctx.moveTo(p2.x, p2.y); }
        else ctx.moveTo(NaN, NaN);
        prev = p2.z > 0.02 ? p2 : null;
      }
      ctx.stroke();
    }
    for (lon = -180; lon < 180; lon += 30) {
      ctx.beginPath(); prev = null;
      for (lat = -85; lat <= 85; lat += 4) {
        p2 = project(lat, lon, R, cx, cy);
        if (p2.z > 0.02) { if (prev) ctx.lineTo(p2.x, p2.y); else ctx.moveTo(p2.x, p2.y); }
        else ctx.moveTo(NaN, NaN);
        prev = p2.z > 0.02 ? p2 : null;
      }
      ctx.stroke();
    }
    ctx.restore();

    /* 社团节点 */
    var visible = [];
    ORGS.forEach(function (o) {
      if (!o.lat && !o.lon) { o._p = null; return; }
      o._p = project(o.lat, o.lon, R, cx, cy);
      if (o._p.z > 0) visible.push(o);
    });

    dashOff -= 0.5;
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.lineDashOffset = dashOff;
    ctx.strokeStyle = 'rgba(79,216,255,0.35)';
    ctx.beginPath();
    for (var a = 0; a < visible.length; a++) {
      for (var b = a + 1; b < visible.length; b++) {
        var A = visible[a], B = visible[b];
        if (!inRegion(A) || !inRegion(B)) continue;
        var mx = (A._p.x + B._p.x) / 2, my = (A._p.y + B._p.y) / 2;
        var dx = mx - cx, dy = my - cy;
        var ml = Math.hypot(dx, dy) || 1;
        var lift = 14 + ml * 0.12;
        ctx.moveTo(A._p.x, A._p.y);
        ctx.quadraticCurveTo(mx + dx / ml * lift, my + dy / ml * lift, B._p.x, B._p.y);
      }
    }
    ctx.stroke();
    ctx.setLineDash([]);

    pulseT += 0.03;
    labelQueue = [];
    visible.forEach(function (o) {
      var active = inRegion(o);
      var size = active ? 3.5 + 8 * (val(o) / metricMax()) : 2.5;
      var c = nodeColor(o);
      if (active) {
        var ph = (pulseT * 0.6 + o.lon) % 1;
        ctx.beginPath();
        ctx.arc(o._p.x, o._p.y, size + ph * 14, 0, Math.PI * 2);
        ctx.strokeStyle = c;
        ctx.globalAlpha = 0.5 * (1 - ph);
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      var gl = ctx.createRadialGradient(o._p.x, o._p.y, 0, o._p.x, o._p.y, size * 3.4);
      gl.addColorStop(0, c);
      gl.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = active ? 0.4 : 0.1;
      ctx.beginPath(); ctx.arc(o._p.x, o._p.y, size * 3.4, 0, Math.PI * 2);
      ctx.fillStyle = gl; ctx.fill();
      ctx.globalAlpha = active ? 1 : 0.45;
      ctx.beginPath(); ctx.arc(o._p.x, o._p.y, size, 0, Math.PI * 2);
      ctx.fillStyle = c; ctx.fill();
      ctx.beginPath(); ctx.arc(o._p.x, o._p.y, size, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 0.8; ctx.stroke();
      if (o.key === selectedId) {
        ctx.beginPath(); ctx.arc(o._p.x, o._p.y, size + 7, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.4; ctx.stroke();
      }
      if (active) labelQueue.push({ o: o, x: o._p.x, y: o._p.y, size: size });
      ctx.globalAlpha = 1;
    });

    /* 标签防碰撞：重叠时自动挪位并用指引线指回节点 */
    labelQueue.sort(function (a, b) { return b.size - a.size; });
    ctx.font = '11px "PingFang SC","Microsoft YaHei",sans-serif';
    labelQueue.forEach(function (L) {
      var text = L.o.name;
      var tw = ctx.measureText(text).width;
      var th = 13;
      var cands = [
        { x: L.x + L.size + 7, y: L.y - 3, lx: L.x + L.size + 3, ly: L.y },        /* 右 */
        { x: L.x - tw - L.size - 7, y: L.y - 3, lx: L.x - L.size - 3, ly: L.y },   /* 左 */
        { x: L.x - tw / 2, y: L.y - L.size - th - 7, lx: L.x, ly: L.y - L.size - 3 }, /* 上 */
        { x: L.x - tw / 2, y: L.y + L.size + 10, lx: L.x, ly: L.y + L.size + 3 }     /* 下 */
      ];
      var placed = null;
      for (var ci = 0; ci < cands.length; ci++) {
        var c = cands[ci];
        var box = { x: c.x - 2, y: c.y - th, w: tw + 4, h: th + 4 };
        var hit = false;
        for (var bi = 0; bi < placedBoxes.length; bi++) {
          var B = placedBoxes[bi];
          if (box.x < B.x + B.w && box.x + box.w > B.x && box.y < B.y + B.h && box.y + box.h > B.y) { hit = true; break; }
        }
        if (!hit) { placed = c; placedBoxes.push(box); break; }
      }
      if (!placed) placed = cands[3];
      /* 指引线（标签挪位时画出连接线） */
      var defX = L.x + L.size + 3, defY = L.y;
      if (Math.abs(placed.lx - defX) > 2 || Math.abs(placed.ly - defY) > 2) {
        ctx.strokeStyle = 'rgba(180,230,255,0.55)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(placed.lx, placed.ly);
        ctx.lineTo(placed.x + (placed.x > L.x ? 0 : tw), placed.y - 3);
        ctx.stroke();
      }
      ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 4;
      ctx.fillStyle = 'rgba(225,242,255,0.95)';
      ctx.fillText(text, placed.x, placed.y);
      ctx.shadowBlur = 0;
    });
    placedBoxes = [];

    /* HUD */
    ctx.font = '10px ui-monospace,Consolas,monospace';
    ctx.fillStyle = 'rgba(140,220,255,0.65)';
    ctx.fillText('METRIC  ' + METRICS[curMetric].label, 14, 20);
    ctx.fillText('REGION  ' + curRegion, 14, 34);
    ctx.fillText('NODES   ' + ORGS.filter(function(o){return o._p;}).length, 14, 48);
    var lonNow = ((-rotY * 180 / Math.PI) % 360 + 360) % 360 - 180;
    ctx.fillStyle = 'rgba(140,220,255,0.45)';
    ctx.fillText('LON ' + lonNow.toFixed(1) + '°', w - 74, h - 12);
  }

  /* ---------------- 面板（真实数据） ---------------- */
  function renderStats() {
    var list = ORGS.filter(inRegion);
    var members = 0, changes = 0, risk = 0, high = 0;
    list.forEach(function (o) { members += o.members; changes += o.changes; risk += o.risk; });
    ALERTS.forEach(function (a) { if (a.level === '高') high++; });
    var m = METRICS[curMetric];
    var mainVal = curMetric === 'orgs' ? list.length : curMetric === 'members' ? members : curMetric === 'changes' ? changes : Math.round(risk / Math.max(1, list.length));
    var regionCount = {};
    ORGS.forEach(function (o) { if (o.region) regionCount[o.region] = 1; });
    var cards = [
      { k: m.label, v: mainVal + '<small>' + m.unit + '</small>' },
      { k: '覆盖地区', v: Object.keys(regionCount).length + '<small>个</small>' },
      { k: '成员总数', v: members + '<small>人</small>' },
      { k: '高风险预警', v: high + '<small>条</small>' }
    ];
    document.getElementById('opsStats').innerHTML = cards.map(function (c) {
      return '<div class="ops-stat-card"><p>' + c.k + '</p><strong>' + c.v + '</strong></div>';
    }).join('');
  }

  function fmtAgo(at) {
    var d = Date.now() - Number(at || 0);
    if (!at || d < 0) return '';
    if (d < 3600e3) return Math.max(1, Math.round(d / 60e3)) + ' 分钟前';
    if (d < 86400e3) return Math.round(d / 3600e3) + ' 小时前';
    return Math.round(d / 86400e3) + ' 天前';
  }

  function renderFeed() {
    var box = document.getElementById('opsFeedList');
    if (!FEED.length) {
      box.innerHTML = '<div class="classroom-empty compact">近 7 天暂无人员变动记录</div>';
      return;
    }
    box.innerHTML = FEED.map(function (f) {
      var cls = f.type === '退出' ? 'exit' : f.type === '升职' ? 'up' : 'in';
      return '<div class="ops-feed-item"><span class="ops-tag ' + cls + '">' + f.type + '</span>' +
        '<div><b>' + f.org + '</b><p>' + f.text + '</p></div><time>' + fmtAgo(f.at) + '</time></div>';
    }).join('');
  }

  function renderAlerts() {
    var box = document.getElementById('opsAlertList');
    if (!ALERTS.length) {
      box.innerHTML = '<div class="classroom-empty compact">当前无风险预警，各社团状态正常</div>';
      return;
    }
    box.innerHTML = ALERTS.map(function (a) {
      return '<div class="ops-alert-item lv-' + a.level + '" data-org="' + a.org + '">' +
        '<span class="ops-lv">' + a.level + '</span><div><b>' + a.title + '</b><p>' + a.org + '</p></div></div>';
    }).join('');
    Array.prototype.forEach.call(document.querySelectorAll('.ops-alert-item'), function (el) {
      el.onclick = function () {
        var a = null;
        ALERTS.forEach(function (x) { if (x.org === el.dataset.org && !a) a = x; });
        var org = null;
        ORGS.forEach(function (o) { if (o.name === el.dataset.org) org = o; });
        if (org) selectedId = org.key;
        renderDetail(org, a);
        drawGlobe();
      };
    });
  }

  function renderDetail(org, alert) {
    var box = detail;
    if (!org) {
      box.innerHTML = '<div class="ops-dim"><div class="ops-dim-mark"></div><p>点击地球节点或下方预警<br>查看社团详情与风险情报</p></div>';
      return;
    }
    var alerts = ALERTS.filter(function (a) { return a.org === org.name; });
    box.innerHTML =
      '<div class="ops-org-head"><span class="ops-org-dot"></span><div><h3>' + org.name + '</h3><p>' + (org.region || '-') + ' · ' + (org.city || org.school || '') + '</p></div></div>' +
      '<div class="ops-kv"><div><p>成员规模</p><b>' + org.members + ' 人</b></div><div><p>近7天变动</p><b>' + org.changes + ' 人次</b></div><div><p>风险指数</p><b class="' + (org.risk > 20 ? 'danger' : '') + '">' + org.risk + ' 分</b></div></div>' +
      (alert ? '<div class="ops-alert-detail lv-' + alert.level + '"><span class="ops-lv">' + alert.level + '</span><div><b>' + alert.title + '</b><p>' + alert.desc + '</p></div></div>' : '') +
      (alerts.length && !alert ? '<h4>关联预警</h4>' + alerts.map(function (a) {
        return '<div class="ops-mini-alert lv-' + a.level + '"><span class="ops-lv">' + a.level + '</span><p>' + a.title + '</p></div>';
      }).join('') : '') +
      '<p class="ops-sample-note">数据实时来自成员库与操作审计日志</p>';
  }

  /* ---------------- 真实数据加载 ---------------- */
  async function loadRealData() {
    try {
      var resp = await fetch(window.XINGHUAN_API + '/org-overview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Member-Token': localStorage.getItem('hub_token') || ''
        },
        body: '{}'
      });
      var payload = await resp.json();
      if (!payload || payload.code !== 0 || !payload.data) throw new Error((payload && payload.message) || ('HTTP ' + resp.status));
      var allowed = null;
      try {
        var partnerButtons = document.querySelectorAll('#partners [data-org]');
        if (partnerButtons.length) {
          allowed = {};
          Array.prototype.forEach.call(partnerButtons, function (b) { allowed[b.dataset.org] = true; });
        }
      } catch (e) { allowed = null; }
      var overviewRows = payload.data.orgs || [];
      var scopeRows = allowed ? overviewRows.filter(function (o) { return allowed[o.key]; }) : overviewRows;
      ORGS = scopeRows.length ? scopeRows : overviewRows;
      FEED = payload.data.feed || [];
      ALERTS = payload.data.alerts || [];
      var regions = {};
      ORGS.forEach(function (o) { if (o.region) regions[o.region] = 1; });
      REGIONS = ['全部'].concat(Object.keys(regions));
      curRegion = '全部';
      dataLoaded = true;
      selectedId = null;
      bindControls();
      renderStats(); renderFeed(); renderAlerts(); renderDetail(null, null);
      drawGlobe();
    } catch (e) {
      /* 显示真实错误原因，便于排查 */
      document.getElementById('opsStats').innerHTML = '<div class="ops-stat-card" style="grid-column:1/-1"><p>态势数据加载失败</p><strong style="font-size:12px;line-height:1.7">' + String(e.message || e).slice(0, 80) + '</strong></div>';
      document.getElementById('opsFeedList').innerHTML = '<div class="classroom-empty compact">载入失败</div>';
      document.getElementById('opsAlertList').innerHTML = '<div class="classroom-empty compact">载入失败</div>';
    }
  }

  /* ---------------- 交互 ---------------- */
  function bindGlobe() {
    canvas.addEventListener('pointerdown', function (e) {
      dragging = true; autoSpin = false; lastX = e.clientX; lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', function (e) {
      var rect = canvas.getBoundingClientRect();
      var mx = e.clientX - rect.left, my = e.clientY - rect.top;
      if (dragging) {
        rotY += (e.clientX - lastX) * 0.005;
        tiltX = Math.max(-1.1, Math.min(1.1, tiltX + (e.clientY - lastY) * 0.003));
        lastX = e.clientX; lastY = e.clientY;
        hideTip();
      } else {
        var hit = null;
        ORGS.forEach(function (o) {
          if (!o._p || o._p.z <= 0) return;
          if (Math.hypot(o._p.x - mx, o._p.y - my) < 16 && inRegion(o)) hit = o;
        });
        if (hit) {
          tip.hidden = false;
          tip.innerHTML = '<b>' + hit.name + '</b><span>' + (hit.city || '') + ' · ' + METRICS[curMetric].label + ' ' + val(hit) + METRICS[curMetric].unit + '</span>';
          tip.style.left = (mx + 14) + 'px';
          tip.style.top = (my - 10) + 'px';
          canvas.style.cursor = 'pointer';
        } else { hideTip(); canvas.style.cursor = 'grab'; }
      }
    });
    canvas.addEventListener('pointerup', function (e) {
      dragging = false;
      setTimeout(function () { autoSpin = true; }, 3000);
      var rect = canvas.getBoundingClientRect();
      var mx = e.clientX - rect.left, my = e.clientY - rect.top;
      var hit = null;
      ORGS.forEach(function (o) {
        if (!o._p || o._p.z <= 0) return;
        if (Math.hypot(o._p.x - mx, o._p.y - my) < 16 && inRegion(o)) hit = o;
      });
      if (hit) { selectedId = hit.key; renderDetail(hit, null); }
      drawGlobe();
    });
    canvas.addEventListener('wheel', function (e) {
      e.preventDefault();
      zoom = Math.max(0.7, Math.min(1.6, zoom + (e.deltaY < 0 ? 0.06 : -0.06)));
      drawGlobe();
    }, { passive: false });
  }
  function hideTip() { tip.hidden = true; }

  function bindControls() {
    document.getElementById('opsMetrics').innerHTML = Object.keys(METRICS).map(function (k) {
      return '<button class="ops-metric' + (k === curMetric ? ' active' : '') + '" data-m="' + k + '">' + METRICS[k].label + '</button>';
    }).join('');
    Array.prototype.forEach.call(document.querySelectorAll('.ops-metric'), function (b) {
      b.onclick = function () {
        curMetric = b.dataset.m;
        Array.prototype.forEach.call(document.querySelectorAll('.ops-metric'), function (x) { x.classList.toggle('active', x === b); });
        renderStats(); drawGlobe();
      };
    });
    document.getElementById('opsRegions').innerHTML = REGIONS.map(function (r) {
      return '<button class="ops-chip' + (r === curRegion ? ' active' : '') + '" data-r="' + r + '">' + r + '</button>';
    }).join('');
    Array.prototype.forEach.call(document.querySelectorAll('.ops-chip'), function (b) {
      b.onclick = function () {
        curRegion = b.dataset.r;
        Array.prototype.forEach.call(document.querySelectorAll('.ops-chip'), function (x) { x.classList.toggle('active', x === b); });
        renderStats(); drawGlobe();
      };
    });
  }

  /* ---------------- 启动 ---------------- */
  function init() {
    canvas = document.getElementById('opsGlobe');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    tip = document.getElementById('opsTip');
    detail = document.getElementById('opsDetail');
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    function resize() {
      var size = canvas.clientWidth || 520;
      canvas.width = size * DPR; canvas.height = size * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      makeStars(size, canvas.clientHeight || size);
      drawGlobe();
    }
    window.addEventListener('resize', resize);
    bindGlobe();
    bindControls();
    renderStats(); renderFeed(); renderAlerts(); renderDetail(null, null);
    resize();
    loadRealData();
    /* v2.51 性能：30fps 上限 + 面板不可见时整帧跳过（零浪费渲染） */
    var lastFrame = 0;
    (function loop(now) {
      if (!document.hidden && now - lastFrame >= 33) {
        lastFrame = now;
        if (autoSpin && !dragging) rotY += 0.0022 * ((now - (loop._p || now)) / 16.7 || 1);
        loop._p = now;
        if (canvas.clientWidth > 0) drawGlobe();
      }
      requestAnimationFrame(loop);
    })(0);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
