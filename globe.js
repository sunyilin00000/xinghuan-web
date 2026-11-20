/* ============================================================================
 * 星环运营中枢 · 3D 地球态势屏（v2.44）
 * 纯 Canvas 正射投影手写 3D 地球，零外部依赖
 * 数据说明：本页所有社团、人员、预警均为「示例数据」，仅用于演示布局与交互
 * ==========================================================================*/
(function () {
  'use strict';

  /* ---------------- 示例数据（明确标注，非真实数据） ---------------- */
  var ORGS = [
    { id: 'ouc_astro',   name: '海大天协',     region: '华东', city: '青岛', lat: 36.06, lon: 120.38, members: 86,  changes: 5,  risk: 12 },
    { id: 'ouc_bio',     name: '海大生科协',   region: '华东', city: '青岛', lat: 36.06, lon: 120.38, members: 64,  changes: 3,  risk: 8 },
    { id: 'ouc_outdoor', name: '海大户协',     region: '华东', city: '青岛', lat: 36.06, lon: 120.38, members: 52,  changes: 2,  risk: 6 },
    { id: 'nku_astro',   name: '南开天协',     region: '华北', city: '天津', lat: 39.13, lon: 117.20, members: 58,  changes: 4,  risk: 15 },
    { id: 'buaa_astro',  name: '北航天协',     region: '华北', city: '北京', lat: 39.98, lon: 116.35, members: 73,  changes: 6,  risk: 21 },
    { id: 'sjtu_astro',  name: '上交天文协会', region: '华东', city: '上海', lat: 31.23, lon: 121.47, members: 91,  changes: 7,  risk: 18 },
    { id: 'nju_astro',   name: '南大天文协会', region: '华东', city: '南京', lat: 32.06, lon: 118.78, members: 67,  changes: 2,  risk: 9 },
    { id: 'sysu_astro',  name: '中大天文协会', region: '华南', city: '广州', lat: 23.13, lon: 113.26, members: 49,  changes: 3,  risk: 11 },
    { id: 'scu_astro',   name: '川大天文协会', region: '西南', city: '成都', lat: 30.57, lon: 104.07, members: 61,  changes: 8,  risk: 27 },
    { id: 'xdu_astro',   name: '西电天文协会', region: '西北', city: '西安', lat: 34.13, lon: 108.84, members: 44,  changes: 1,  risk: 5 },
    { id: 'whu_astro',   name: '武大天文协会', region: '华中', city: '武汉', lat: 30.59, lon: 114.31, members: 70,  changes: 4,  risk: 14 },
    { id: 'hit_astro',   name: '哈工大天协',   region: '东北', city: '哈尔滨', lat: 45.80, lon: 126.53, members: 55, changes: 2, risk: 7 }
  ];

  var FEED = [
    { org: '川大天文协会', type: '升职',   text: '1 名主管被任命（示例）', time: '10 分钟前' },
    { org: '北航天协',     type: '加入',   text: '3 名新成员注册（示例）', time: '32 分钟前' },
    { org: '南开天协',     type: '调动',   text: '主管理员发起权限调整（示例）', time: '1 小时前' },
    { org: '上交天文协会', type: '退出',   text: '1 名成员注销账号（示例）', time: '2 小时前' },
    { org: '南大天文协会', type: '加入',   text: '2 名新成员注册（示例）', time: '3 小时前' },
    { org: '海大天协',     type: '升职',   text: '1 名成员被设为主管（示例）', time: '昨天' },
    { org: '武大天文协会', type: '调动',   text: '2 名成员更换所属部门（示例）', time: '昨天' },
    { org: '中大天文协会', type: '加入',   text: '4 名新成员注册（示例）', time: '2 天前' }
  ];

  var ALERTS = [
    { id: 'a1', level: '高', org: '川大天文协会', title: '职位调动频繁', desc: '7 天内主管理员变更 2 次，存在权限管理风险（示例数据）', time: '12 分钟前' },
    { id: 'a2', level: '中', org: '北航天协',     title: '新成员激增',   desc: '单日注册 3 人，超过该社团历史均值（示例数据）', time: '40 分钟前' },
    { id: 'a3', level: '中', org: '南开天协',     title: '管理员长期未登录', desc: '主管理员账号 15 天未登录（示例数据）', time: '2 小时前' },
    { id: 'a4', level: '低', org: '西电天文协会', title: '声纹未注册比例偏高', desc: '42% 成员未注册声纹，课堂收音覆盖率下降（示例数据）', time: '昨天' }
  ];

  var METRICS = {
    orgs:    { label: '入驻社团', unit: '个', max: 12 },
    members: { label: '成员规模', unit: '人', max: 100 },
    changes: { label: '人员变动', unit: '人次', max: 10 },
    risk:    { label: '风险指数', unit: '分', max: 30 }
  };
  var REGIONS = ['全部', '华北', '华东', '华南', '华中', '西南', '西北', '东北'];

  /* ---------------- 状态 ---------------- */
  var curMetric = 'orgs';
  var curRegion = '全部';
  var selectedId = null;
  var rotY = -1.9, tiltX = -0.35, zoom = 1;
  var dragging = false, lastX = 0, lastY = 0, autoSpin = true;

  var canvas, ctx, tip, detail, DPR = 1;

  function val(o) {
    if (curMetric === 'orgs') return 1;
    if (curMetric === 'members') return o.members;
    if (curMetric === 'changes') return o.changes;
    return o.risk;
  }
  function metricMax() { return METRICS[curMetric].max; }
  function inRegion(o) { return curRegion === '全部' || o.region === curRegion; }

  /* 颜色：风险指数用 绿→黄→红，其余用金→冰蓝 */
  function nodeColor(o) {
    if (!inRegion(o)) return 'rgba(150,155,170,0.35)';
    if (curMetric === 'risk') {
      var t = Math.min(1, o.risk / 30);
      if (t > 0.66) return '#ff7b7b';
      if (t > 0.33) return '#e0bd7d';
      return '#86b5a0';
    }
    return o === selectedOrg() ? '#f8ebd0' : '#e6c78f';
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
    /* 绕 X 轴倾斜 */
    var y2 = y * Math.cos(tiltX) - z * Math.sin(tiltX);
    var z2 = y * Math.sin(tiltX) + z * Math.cos(tiltX);
    return { x: cx + R * x, y: cy - R * y2, z: z2 };
  }

  function drawGlobe() {
    var w = canvas.clientWidth, h = canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);
    var cx = w / 2, cy = h / 2;
    var R = Math.min(w, h) * 0.40 * zoom;

    /* 球体 */
    var g = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.15, cx, cy, R);
    g.addColorStop(0, '#17233c');
    g.addColorStop(0.55, '#0d1526');
    g.addColorStop(1, '#070b16');
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(140,170,220,0.35)'; ctx.lineWidth = 1.2; ctx.stroke();

    /* 外发光 */
    var glow = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.35);
    glow.addColorStop(0, 'rgba(120,150,220,0.10)');
    glow.addColorStop(1, 'rgba(120,150,220,0)');
    ctx.beginPath(); ctx.arc(cx, cy, R * 1.35, 0, Math.PI * 2);
    ctx.fillStyle = glow; ctx.fill();

    /* 经纬网格（只画朝前的线段） */
    ctx.lineWidth = 0.6;
    ctx.strokeStyle = 'rgba(140,170,220,0.12)';
    var lat, lon, p, prev;
    for (lat = -60; lat <= 60; lat += 30) {
      ctx.beginPath(); prev = null;
      for (lon = -180; lon <= 180; lon += 6) {
        p = project(lat, lon, R, cx, cy);
        if (p.z > 0) { if (prev) { ctx.lineTo(p.x, p.y); } else { ctx.moveTo(p.x, p.y); } }
        else { prev = null; ctx.moveTo(NaN, NaN); }
        prev = p.z > 0 ? p : null;
      }
      ctx.stroke();
    }
    for (lon = -180; lon < 180; lon += 30) {
      ctx.beginPath(); prev = null;
      for (lat = -85; lat <= 85; lat += 5) {
        p = project(lat, lon, R, cx, cy);
        if (p.z > 0) { if (prev) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }
        else ctx.moveTo(NaN, NaN);
        prev = p.z > 0 ? p : null;
      }
      ctx.stroke();
    }

    /* 节点连线（同区域内高光） */
    ctx.lineWidth = 0.8;
    var visible = [];
    ORGS.forEach(function (o) {
      var p = project(o.lat, o.lon, R, cx, cy);
      o._p = p;
      if (p.z > 0) visible.push(o);
    });
    ctx.strokeStyle = 'rgba(230,199,143,0.14)';
    ctx.beginPath();
    for (var i = 0; i < visible.length; i++) {
      for (var j = i + 1; j < visible.length; j++) {
        var a = visible[i], b = visible[j];
        if (a.city === b.city || (inRegion(a) && inRegion(b) && a.region === b.region)) {
          ctx.moveTo(a._p.x, a._p.y); ctx.lineTo(b._p.x, b._p.y);
        }
      }
    }
    ctx.stroke();

    /* 节点 */
    visible.forEach(function (o) {
      var active = inRegion(o);
      var size = active ? 3.5 + 9 * (val(o) / metricMax()) : 2.5;
      var c = nodeColor(o);
      /* 光晕 */
      var gl = ctx.createRadialGradient(o._p.x, o._p.y, 0, o._p.x, o._p.y, size * 3.2);
      gl.addColorStop(0, c); gl.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = active ? 0.35 : 0.12;
      ctx.beginPath(); ctx.arc(o._p.x, o._p.y, size * 3.2, 0, Math.PI * 2);
      ctx.fillStyle = gl; ctx.fill();
      ctx.globalAlpha = active ? 1 : 0.45;
      /* 本体 */
      ctx.beginPath(); ctx.arc(o._p.x, o._p.y, size, 0, Math.PI * 2);
      ctx.fillStyle = c; ctx.fill();
      /* 选中环 */
      if (o.id === selectedId) {
        ctx.beginPath(); ctx.arc(o._p.x, o._p.y, size + 6, 0, Math.PI * 2);
        ctx.strokeStyle = '#f8ebd0'; ctx.lineWidth = 1.4; ctx.stroke();
      }
      /* 文字标签 */
      if (active && (size > 6 || o.id === selectedId)) {
        ctx.font = '11px "PingFang SC","Microsoft YaHei",sans-serif';
        ctx.fillStyle = 'rgba(235,238,245,0.85)';
        ctx.fillText(o.name, o._p.x + size + 5, o._p.y + 4);
      }
      ctx.globalAlpha = 1;
    });
  }

  /* ---------------- 面板渲染 ---------------- */
  function renderStats() {
    var list = ORGS.filter(inRegion);
    var members = 0, changes = 0, risk = 0, high = 0;
    list.forEach(function (o) { members += o.members; changes += o.changes; risk += o.risk; });
    ALERTS.forEach(function (a) { if (a.level === '高') high++; });
    var m = METRICS[curMetric];
    var mainVal = curMetric === 'orgs' ? list.length : curMetric === 'members' ? members : curMetric === 'changes' ? changes : Math.round(risk / Math.max(1, list.length));
    var cards = [
      { k: m.label, v: mainVal + '<small>' + m.unit + '</small>' },
      { k: '覆盖地区', v: (curRegion === '全部' ? '7' : '1') + '<small>个</small>' },
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
      box.innerHTML = '<div class="ops-dim"><div class="ops-dim-mark"></div><p>点击地球节点或左侧预警<br>查看社团详情与风险情报</p></div>';
      return;
    }
    var m = METRIC_VALUES();
    var alerts = ALERTS.filter(function (a) { return a.org === org.name; });
    box.innerHTML =
      '<div class="ops-org-head"><span class="ops-org-dot"></span><div><h3>' + org.name + '</h3><p>' + org.region + ' · ' + org.city + '（示例）</p></div></div>' +
      '<div class="ops-kv"><div><p>成员规模</p><b>' + org.members + ' 人</b></div><div><p>本月变动</p><b>' + org.changes + ' 人次</b></div><div><p>风险指数</p><b class="' + (org.risk > 20 ? 'danger' : '') + '">' + org.risk + ' 分</b></div></div>' +
      (alert ? '<div class="ops-alert-detail lv-' + alert.level + '"><span class="ops-lv">' + alert.level + '</span><div><b>' + alert.title + '</b><p>' + alert.desc + '</p><time>' + alert.time + '</time></div></div>' : '') +
      (alerts.length && !alert ? '<h4>关联预警</h4>' + alerts.map(function (a) {
        return '<div class="ops-mini-alert lv-' + a.level + '"><span class="ops-lv">' + a.level + '</span><p>' + a.title + '</p></div>';
      }).join('') : '') +
      '<p class="ops-sample-note">以上为示例数据，接入真实数据后由成员库与审计日志驱动</p>';
  }
  function METRIC_VALUES() { return METRICS; }

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
        /* hover 检测 */
        var hit = null;
        ORGS.forEach(function (o) {
          if (!o._p || o._p.z <= 0) return;
          var d = Math.hypot(o._p.x - mx, o._p.y - my);
          if (d < 16 && inRegion(o)) hit = o;
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
      /* 点击选中 */
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
      drawGlobe();
    }
    window.addEventListener('resize', resize);
    bindGlobe(); bindControls();
    renderStats(); renderFeed(); renderAlerts(); renderDetail(null, null);
    resize();
    (function loop() {
      if (autoSpin && !dragging) { rotY += 0.0022; drawGlobe(); }
      requestAnimationFrame(loop);
    })();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
