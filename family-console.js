/* 星环 · QQ 家庭助手面板（嵌入网站「控制台」页）
 * 依赖：window.XINGHUAN_BIND_API、localStorage.hub_token
 */
(function () {
  'use strict';
  var API = (window.XINGHUAN_BIND_API || 'https://cloud1-d6gagyei397d315ca-1521583267.ap-shanghai.app.tcloudbase.com/qqBind').replace(/\/+$/, '');
  var MOUNT_ID = 'xhFamilyAssistant';
  var pollTimer = null;

  function token() { try { return localStorage.getItem('hub_token') || ''; } catch (e) { return ''; } }

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function fmt(ts) {
    if (!ts) return '';
    var d = new Date(ts);
    return isNaN(d) ? '' : d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  }

  function api(path, body) {
    return fetch(API + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ token: token() }, body || {}))
    }).then(function (r) { return r.json(); });
  }

  var CSS = `
  #${MOUNT_ID}{margin-top:26px}
  #${MOUNT_ID} .xhfa-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px}
  #${MOUNT_ID} .xhfa-head h3{margin:0;font-size:17px;color:var(--gold-bright,#f8ebce);font-weight:600;letter-spacing:.04em}
  #${MOUNT_ID} .xhfa-head .xhfa-sub{color:var(--faint,#5e6b79);font-size:12px}
  #${MOUNT_ID} .xhfa-grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin-bottom:14px}
  #${MOUNT_ID} .xhfa-card{background:rgba(17,17,21,.85);border:1px solid rgba(255,255,255,.075);border-radius:14px;padding:14px 16px}
  #${MOUNT_ID} .xhfa-card b{display:block;font-size:24px;color:var(--gold,#e5c68d);font-weight:600}
  #${MOUNT_ID} .xhfa-card span{font-size:12px;color:var(--muted,#92a0af)}
  #${MOUNT_ID} .xhfa-list{background:rgba(17,17,21,.85);border:1px solid rgba(255,255,255,.075);border-radius:14px;overflow:hidden;margin-bottom:14px}
  #${MOUNT_ID} .xhfa-row{display:flex;gap:10px;align-items:flex-start;padding:10px 14px;border-bottom:1px solid rgba(255,255,255,.06);font-size:13px}
  #${MOUNT_ID} .xhfa-row:last-child{border-bottom:0}
  #${MOUNT_ID} .xhfa-tag{font-size:11px;padding:1px 8px;border-radius:999px;border:1px solid rgba(255,255,255,.14);color:var(--muted,#92a0af);flex:0 0 auto}
  #${MOUNT_ID} .xhfa-tag.qq{color:#ffc98a;border-color:rgba(255,180,90,.4)}
  #${MOUNT_ID} .xhfa-tag.site{color:#9fd0ff;border-color:rgba(120,170,255,.4)}
  #${MOUNT_ID} .xhfa-tag.ok{color:#86b5a0;border-color:rgba(134,181,160,.4)}
  #${MOUNT_ID} .xhfa-tag.bad{color:#ff8b8b;border-color:rgba(255,139,139,.4)}
  #${MOUNT_ID} .xhfa-body{flex:1;word-break:break-word;color:var(--text,#f2f5f8)}
  #${MOUNT_ID} .xhfa-time{color:var(--faint,#5e6b79);font-size:11px;white-space:nowrap}
  #${MOUNT_ID} .xhfa-empty{color:var(--faint,#5e6b79);font-size:13px;padding:12px 14px}
  #${MOUNT_ID} .xhfa-member{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:10px 14px;border-bottom:1px solid rgba(255,255,255,.06);font-size:13px}
  #${MOUNT_ID} .xhfa-member:last-child{border-bottom:0}
  #${MOUNT_ID} .xhfa-member .xhfa-name{min-width:100px;color:var(--gold-bright,#f8ebce)}
  #${MOUNT_ID} .xhfa-member select,#${MOUNT_ID} .xhfa-member input[type=time],#${MOUNT_ID} input[type=text]{background:#060608;border:1px solid rgba(255,255,255,.12);color:var(--text,#f2f5f8);border-radius:8px;padding:5px 9px;font-size:12px;font-family:inherit}
  #${MOUNT_ID} button{background:#17171c;color:var(--text,#f2f5f8);border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:5px 12px;cursor:pointer;font-size:12px}
  #${MOUNT_ID} button:hover{border-color:rgba(232,201,142,.4);color:var(--gold-bright,#f8ebce)}
  #${MOUNT_ID} .xhfa-error{color:#ffb3a6;font-size:12px;margin-bottom:8px;display:none}
  #${MOUNT_ID} .xhfa-error.show{display:block}
  @media (max-width:720px){ #${MOUNT_ID} .xhfa-member .xhfa-name{min-width:0} }
  `;

  function mount() {
    var page = document.getElementById('consolePage');
    if (!page) return null;
    var existing = document.getElementById(MOUNT_ID);
    if (existing) return existing;

    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    var root = document.createElement('div');
    root.id = MOUNT_ID;
    root.innerHTML =
      '<div class="xhfa-head"><h3>QQ 家庭助手</h3>' +
      '<span class="xhfa-sub">群聊/私聊问答 · 家人 · 盒子</span>' +
      '<span class="xhfa-sub" style="margin-left:auto" id="xhfaWho"></span>' +
      '<button id="xhfaRefresh">刷新</button></div>' +
      '<div class="xhfa-error" id="xhfaErr"></div>' +
      '<div class="xhfa-grid" id="xhfaStats"></div>' +
      '<div style="display:flex;justify-content:flex-end;margin-bottom:8px"><button id="xhfaBind">绑定 QQ</button></div>' +
      '<div class="xhfa-list" id="xhfaMembers"></div>' +
      '<div style="display:flex;gap:8px;margin-bottom:10px">' +
      '  <input type="text" id="xhfaBoxText" placeholder="跟妈说：记得吃药" style="flex:1;min-width:200px" />' +
      '  <button id="xhfaBoxSend">发到盒子</button>' +
      '</div>' +
      '<div class="xhfa-list" id="xhfaBox"></div>' +
      '<div class="xhfa-list" id="xhfaChat"></div>';
    page.appendChild(root);

    document.getElementById('xhfaRefresh').onclick = load;
    document.getElementById('xhfaBoxSend').onclick = sendBox;
    var bindBtn = document.getElementById('xhfaBind');
    if (bindBtn) bindBtn.onclick = function () {
      if (window.XHBind && typeof window.XHBind.open === 'function') window.XHBind.open();
      else err('绑定组件还没加载，请刷新页面');
    };
    return root;
  }

  function err(msg) {
    var box = document.getElementById('xhfaErr');
    if (!box) return;
    box.textContent = msg;
    box.classList.add('show');
  }
  function clearErr() { var b = document.getElementById('xhfaErr'); if (b) b.classList.remove('show'); }

  function renderStats(data) {
    var box = document.getElementById('xhfaStats');
    box.innerHTML = '';
    var messages = data.messages || [];
    var bindings = data.bindings || [];
    var boxMsgs = data.box_messages || [];
    var alerts = data.box_alerts || [];
    var today = new Date().toDateString();
    var todayCount = messages.filter(function (m) { return new Date(m.ts).toDateString() === today; }).length;
    var pending = boxMsgs.filter(function (b) { return b.status === 'pending' || b.status === 'processing'; }).length;
    var items = [[messages.length, '消息总数'], [todayCount, '今日消息'], [bindings.length, '绑定家人'], [pending, '待播报'], [alerts.length, '盒子告警']];
    items.forEach(function (item) {
      var card = el('div', 'xhfa-card');
      card.appendChild(el('b', null, String(item[0])));
      card.appendChild(el('span', null, item[1]));
      box.appendChild(card);
    });
  }

  function renderMembers(data) {
    var box = document.getElementById('xhfaMembers');
    box.innerHTML = '';
    var bindings = data.bindings || [];
    if (!bindings.length) {
      box.appendChild(el('div', 'xhfa-empty', '还没有家人绑定 QQ：让家人在 QQ 私聊机器人发送 /绑定 验证码'));
      return;
    }
    bindings.forEach(function (row) {
      var line = el('div', 'xhfa-member');
      line.appendChild(el('span', 'xhfa-tag ' + (row.role === 'child' ? 'ok' : ''), row.role === 'child' ? '监护者' : '被监护者'));
      line.appendChild(el('span', 'xhfa-name', row.nickname || '家人'));
      line.appendChild(el('span', 'xhfa-body', row.openid_mask || ''));
      var role = document.createElement('select');
      role.innerHTML = '<option value="elder">被监护者</option><option value="child">监护者</option>';
      role.value = row.role || 'elder';
      var daily = document.createElement('label');
      daily.style.cssText = 'display:inline-flex;align-items:center;gap:4px;font-size:12px;color:#92a0af';
      var check = document.createElement('input');
      check.type = 'checkbox';
      check.checked = Boolean(row.dailyEnabled);
      daily.appendChild(check);
      daily.appendChild(document.createTextNode('每日问候'));
      var time = document.createElement('input');
      time.type = 'time';
      time.value = row.dailyTime || '08:30';
      var save = el('button', null, '保存');
      save.onclick = function () {
        api('/family/member/save', { id: row.id, role: role.value, dailyEnabled: check.checked, dailyTime: time.value })
          .then(function (r) { if (r && r.code === 0) load(); else err((r && r.message) || '保存失败'); });
      };
      line.appendChild(role);
      line.appendChild(daily);
      line.appendChild(time);
      line.appendChild(save);
      box.appendChild(line);
    });
  }

  function renderBox(data) {
    var box = document.getElementById('xhfaBox');
    box.innerHTML = '';
    var rows = (data.box_messages || []).slice().reverse().slice(0, 8);
    if (!rows.length) { box.appendChild(el('div', 'xhfa-empty', '盒子暂无留言')); return; }
    rows.forEach(function (row) {
      var line = el('div', 'xhfa-row');
      line.appendChild(el('span', 'xhfa-tag', row.account || '网站'));
      line.appendChild(el('span', 'xhfa-body', row.text || ''));
      var status = row.status === 'done' ? '已播报' : (row.status === 'error' ? '失败' : '排队');
      line.appendChild(el('span', 'xhfa-tag ' + (row.status === 'done' ? 'ok' : (row.status === 'error' ? 'bad' : '')), status));
      line.appendChild(el('span', 'xhfa-time', fmt(row.created_at)));
      box.appendChild(line);
    });
  }

  function renderChat(data) {
    var box = document.getElementById('xhfaChat');
    box.innerHTML = '';
    var rows = (data.messages || []).slice(-10).reverse();
    if (!rows.length) { box.appendChild(el('div', 'xhfa-empty', '暂无对话')); return; }
    rows.forEach(function (row) {
      var line = el('div', 'xhfa-row');
      line.appendChild(el('span', 'xhfa-tag ' + (row.source === 'qq' ? 'qq' : 'site'), row.source === 'qq' ? 'QQ' : '网站'));
      line.appendChild(el('span', 'xhfa-body', (row.account || row.user_key || '') + '：' + (row.role === 'assistant' ? '助手 · ' : '') + (row.content || '')));
      line.appendChild(el('span', 'xhfa-time', fmt(row.ts)));
      box.appendChild(line);
    });
  }

  function sendBox() {
    var input = document.getElementById('xhfaBoxText');
    var text = input.value.trim();
    if (!text) { err('请输入留言'); return; }
    api('/box/send', { text: text }).then(function (r) {
      if (r && r.code === 0) { input.value = ''; setTimeout(load, 800); }
      else err((r && r.message) || '发送失败');
    });
  }

  function load() {
    if (!mount()) return;
    if (!token()) { err('请先登录网站'); return; }
    api('/console/me').then(function (me) {
      if (!me || me.code !== 0) { err((me && me.message) || '需要管理员权限'); return; }
      var who = document.getElementById('xhfaWho');
      if (who) who.textContent = (me.data.name || '') + ' · ' + (me.data.level === 'owner' ? '超级管理员' : '管理员');
      return api('/console/data').then(function (payload) {
        if (!payload || payload.code !== 0) { err((payload && payload.message) || '加载失败'); return; }
        clearErr();
        var data = payload.data || {};
        renderStats(data);
        renderMembers(data);
        renderBox(data);
        renderChat(data);
      });
    }).catch(function () { err('连接失败'); });
  }

  function start() {
    if (!mount()) return;
    load();
    if (!pollTimer) pollTimer = setInterval(load, 15000);
  }

  // 网站是单页切换，控制台页显示时再挂载
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
  setInterval(function () { if (document.getElementById('consolePage') && !document.getElementById(MOUNT_ID)) start(); }, 3000);
})();
