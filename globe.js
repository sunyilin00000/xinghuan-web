/* ============================================================================
 * 星环运营中枢 · 3D 地球态势屏（v2.45）
 * 纯 Canvas 正射投影手写 3D 地球，零外部依赖
 * 数据说明：指标/变动/预警为演示用示例数据；入驻社团仅列真实已入驻组织
 * ==========================================================================*/
(function () {
  'use strict';

  /* ---------------- 数据：入驻社团（真实，不虚构） ---------------- */
  var ORGS = [
    { id: 'ouc_astro',   name: '海大天协',   region: '华东', city: '青岛', lat: 36.07, lon: 120.38, members: 86, changes: 5, risk: 12 },
    { id: 'ouc_bio',     name: '海大生科协', region: '华东', city: '青岛', lat: 36.11, lon: 120.30, members: 64, changes: 3, risk: 8 },
    { id: 'ouc_outdoor', name: '海大户协',   region: '华东', city: '青岛', lat: 36.02, lon: 120.46, members: 52, changes: 2, risk: 6 },
    { id: 'nku_astro',   name: '南开天协',   region: '华北', city: '天津', lat: 39.13, lon: 117.20, members: 58, changes: 4, risk: 15 }
  ];

  var FEED = [
    { org: '海大天协',   type: '升职', text: '1 名成员被设为主管（示例）',     time: '昨天' },
    { org: '南开天协',   type: '调动', text: '主管理员发起权限调整（示例）',   time: '1 小时前' },
    { org: '海大生科协', type: '加入', text: '2 名新成员注册（示例）',         time: '3 小时前' },
    { org: '海大户协',   type: '加入', text: '1 名新成员注册（示例）',         time: '昨天' },
    { org: '海大天协',   type: '加入', text: '3 名新成员注册（示例）',         time: '2 天前' }
  ];

  var ALERTS = [
    { id: 'a1', level: '中', org: '南开天协', title: '管理员长期未登录', desc: '主管理员账号 15 天未登录（示例数据）', time: '2 小时前' },
    { id: 'a2', level: '低', org: '海大户协', title: '声纹未注册比例偏高', desc: '声纹未注册成员占比偏高，课堂收音覆盖率下降（示例数据）', time: '昨天' }
  ];

  var METRICS = {
    orgs:    { label: '入驻社团', unit: '个', max: 4 },
    members: { label: '成员规模', unit: '人', max: 100 },
    changes: { label: '人员变动', unit: '人次', max: 8 },
    risk:    { label: '风险指数', unit: '分', max: 20 }
  };
  var REGIONS = ['全部', '华北', '华东'];

  /* ---------------- 状态 ---------------- */
  var curMetric = 'orgs';
  var curRegion = '全部';
  var selectedId = null;
  var rotY = -1.95, tiltX = -0.38, zoom = 1;
  var dragging = false, lastX = 0, lastY = 0, autoSpin = true;
  var sweepA = 0, dashOff = 0, pulseT = 0;
  var stars = [];

  var canvas, ctx, tip, detail, DPR = 1;

  function val(o) {
    if (curMetric === 'orgs') return 1;
    if (curMetric === 'members') return o.members;
    if (curMetric === 'changes') return o.changes;
    return o.risk;
  }
  function metricMax() { return METRICS[curMetric].max; }
  function inRegion(o) { return curRegion === '全部' || o.region === curRegion; }
  function nodeColor(o) {
    if (!inRegion(o)) return 'rgba(110,140,180,0.30)';
    if (curMetric === 'risk') {
      var t = Math.min(1, o.risk / 20);
      if (t > 0.66) return '#ff7b7b';
      if (t > 0.33) return '#ffd166';
      return '#3ddc97';
    }
    return o.id === selectedId ? '#ffffff' : '#4fd8ff';
  }
  function selectedOrg() {
    for (var i = 0; i < ORGS.length; i++) if (ORGS[i].id === selectedId) return ORGS[i];
    return null;
  }

  /* ---------------- 3D 投影 ---------------- */
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
      var a = 0.12 + 0.5 * (0.5 + 0.5 * Math.sin(pulseT * st.s + st.p));
      ctx.globalAlpha = a;
      ctx.fillRect(st.x, st.y, st.r, st.r);
    }
    ctx.globalAlpha = 1;

    /* 大气层（两层辉光） */
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

    /* 明暗交界（右侧阴影月牙，增强体积感） */
    var sh = ctx.createRadialGradient(cx + R * 0.55, cy + R * 0.15, R * 0.2, cx + R * 0.55, cy + R * 0.15, R * 1.05);
    sh.addColorStop(0, 'rgba(2,6,14,0.55)');
    sh.addColorStop(0.65, 'rgba(2,6,14,0.25)');
    sh.addColorStop(1, 'rgba(2,6,14,0)');
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = sh;
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    ctx.restore();

    /* 雷达扫描扇面 */
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
    sweepA += 0.012;
    var sweepLen = Math.PI / 3.2;
    if (ctx.createConicGradient) {
      var cg = ctx.createConicGradient(sweepA, cx, cy);
      cg.addColorStop(0, 'rgba(80,220,255,0.28)');
      cg.addColorStop(sweepLen / (Math.PI * 2), 'rgba(80,220,255,0)');
      cg.addColorStop(1, 'rgba(80,220,255,0)');
      ctx.fillStyle = cg;
      ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    }
    /* 扫描线（扇面边缘） */
    ctx.strokeStyle = 'rgba(120,235,255,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    var ex = cx + Math.cos(sweepA) * R, ey = cy + Math.sin(sweepA) * R;
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.restore();

    /* 经纬网格（霓虹青，加亮） */
    ctx.lineWidth = 0.7;
    ctx.strokeStyle = 'rgba(95,190,255,0.20)';
    var lat, lon, p, prev;
    for (lat = -60; lat <= 60; lat += 30) {
      ctx.beginPath(); prev = null;
      for (lon = -180; lon <= 180; lon += 5) {
        p = project(lat, lon, R, cx, cy);
        if (p.z > 0.02) { if (prev) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }
        else ctx.moveTo(NaN, NaN);
        prev = p.z > 0.02 ? p : null;
      }
      ctx.stroke();
    }
    for (lon = -180; lon < 180; lon += 30) {
      ctx.beginPath(); prev = null;
      for (lat = -85; lat <= 85; lat += 4) {
        p = project(lat, lon, R, cx, cy);
        if (p.z > 0.02) { if (prev) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }
        else ctx.moveTo(NaN, NaN);
        prev = p.z > 0.02 ? p : null;
      }
      ctx.stroke();
    }

    /* 节点 */
    var visible = [];
    ORGS.forEach(function (o) {
      o._p = project(o.lat, o.lon, R, cx, cy);
      if (o._p.z > 0) visible.push(o);
    });

    /* 连线：弧线 + 流动虚线 */
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

    /* 节点本体 + 脉冲环 */
    pulseT += 0.03;
    visible.forEach(function (o) {
      var active = inRegion(o);
      var size = active ? 3.5 + 8 * (val(o) / metricMax()) : 2.5;
      var c = nodeColor(o);
      /* 脉冲环 */
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
      /* 光晕 */
      var gl = ctx.createRadialGradient(o._p.x, o._p.y, 0, o._p.x, o._p.y, size * 3.4);
      gl.addColorStop(0, c);
      gl.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = active ? 0.4 : 0.1;
      ctx.beginPath(); ctx.arc(o._p.x, o._p.y, size * 3.4, 0, Math.PI * 2);
      ctx.fillStyle = gl; ctx.fill();
      ctx.globalAlpha = active ? 1 : 0.45;
      /* 本体 */
      ctx.beginPath(); ctx.arc(o._p.x, o._p.y, size, 0, Math.PI * 2);
      ctx.fillStyle = c; ctx.fill();
      ctx.beginPath(); ctx.arc(o._p.x, o._p.y, size, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 0.8; ctx.stroke();
      /* 选中环 */
      if (o.id === selectedId) {
        ctx.beginPath(); ctx.arc(o._p.x, o._p.y, size + 7, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.4; ctx.stroke();
      }
      /* 标签 */
      if (active) {
        ctx.font = '11px "PingFang SC","Microsoft YaHei",sans-serif';
        ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 4;
        ctx.fillStyle = 'rgba(225,242,255,0.95)';
        ctx.fillText(o.name, o._p.x + size + 6, o._p.y + 4);
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;
    });

    /* HUD 角标 */
    ctx.font = '10px ui-monospace,Consolas,monospace';
    ctx.fillStyle = 'rgba(140,220,255,0.65)';
    ctx.fillText('METRIC  ' + METRICS[curMetric].label, 14, 20);
    ctx.fillText('REGION  ' + curRegion, 14, 34);
    ctx.fillText('NODES   ' + ORGS.filter(inRegion).length, 14, 48);
    var lonNow = ((-rotY * 180 / Math.PI) % 360 + 360) % 360 - 180;
    ctx.fillStyle = 'rgba(140,220,255,0.45)';
    ctx.fillText('LON ' + lonNow.toFixed(1) + '°', w - 74, h - 12);
  }

  /* ---------------- 面板 ---------------- */
  function renderStats() {
    var list = ORGS.filter(inRegion);
    var members = 0, changes = 0, risk = 0, high = 0;
    list.forEach(function (o) { members += o.members; changes += o.changes; risk += o.risk; });
    ALERTS.forEach(function (a) { if (a.level === '高') high++; });
    var m = METRICS[curMetric];
    var mainVal = curMetric === 'orgs' ? list.length : curMetric === 'members' ? members : curMetric === 'changes' ? changes : Math.round(risk / Math.max(1, list.length));
    var regionCount = {};
    ORGS.forEach(function (o) { regionCount[o.region] = 1; });
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

  function renderFeed() {
    document.getElementById('opsFeedList').innerHTML = FEED.map(function (f) {
      var cls = f.type === '退出' ? 'exit' : f.type === '升职' || f.type === '调动' ? 'up' : 'in';
      return '<div class="ops-feed-item"><span class="ops-tag ' + cls + '">' + f.type + '</span>' +
        '<div><b>' + f.org + '</b><p>' + f.text + '</p></div><time>' + f.time + '</time></div>';
    }).join('');
  }

  function renderAlerts() {
    document.getElementById('opsAlertList').innerHTML = ALERTS.map(function (a) {
      return '<div class="ops-alert-item lv-' + a.level + '" data-org="' + a.org + '">' +
        '<span class="ops-lv">' + a.level + '</span><div><b>' + a.title + '</b><p>' + a.org + ' · ' + a.time + '</p></div></div>';
    }).join('');
    Array.prototype.forEach.call(document.querySelectorAll('.ops-alert-item'), function (el) {
      el.onclick = function () {
        var a = null;
        ALERTS.forEach(function (x) { if (x.org === el.dataset.org && !a) a = x; });
        var org = null;
        ORGS.forEach(function (o) { if (o.name === el.dataset.org) org = o; });
        if (org) selectedId = org.id;
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
      '<div class="ops-org-head"><span class="ops-org-dot"></span><div><h3>' + org.name + '</h3><p>' + org.region + ' · ' + org.city + '</p></div></div>' +
      '<div class="ops-kv"><div><p>成员规模</p><b>' + org.members + ' 人</b></div><div><p>本月变动</p><b>' + org.changes + ' 人次</b></div><div><p>风险指数</p><b class="' + (org.risk > 13 ? 'danger' : '') + '">' + org.risk + ' 分</b></div></div>' +
      (alert ? '<div class="ops-alert-detail lv-' + alert.level + '"><span class="ops-lv">' + alert.level + '</span><div><b>' + alert.title + '</b><p>' + alert.desc + '</p><time>' + alert.time + '</time></div></div>' : '') +
      (alerts.length && !alert ? '<h4>关联预警</h4>' + alerts.map(function (a) {
        return '<div class="ops-mini-alert lv-' + a.level + '"><span class="ops-lv">' + a.level + '</span><p>' + a.title + '</p></div>';
      }).join('') : '') +
      '<p class="ops-sample-note">指标为示例数据；接入真实数据后由成员库与审计日志驱动</p>';
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
          tip.innerHTML = '<b>' + hit.name + '</b><span>' + hit.city + ' · ' + METRICS[curMetric].label + ' ' + val(hit) + METRICS[curMetric].unit + '</span>';
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
      if (hit) { selectedId = hit.id; renderDetail(hit, null); }
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
    bindGlobe(); bindControls();
    renderStats(); renderFeed(); renderAlerts(); renderDetail(null, null);
    resize();
    (function loop() {
      if (!document.hidden) {
        if (autoSpin && !dragging) rotY += 0.0022;
        drawGlobe();
      }
      requestAnimationFrame(loop);
    })();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
