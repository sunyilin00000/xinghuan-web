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
      '<div class="xhfa-list" id="xhfaElder"><div class="xhfa-empty">被监护者通过客厅盒子交流，不需要智能手机，也不需要绑定 QQ。</div></div>' +
      '<div class="xhfa-head" style="margin:14px 0 8px"><h3 style="font-size:14px">监护者（QQ 绑定）</h3></div>' +
      '<div class="xhfa-list" id="xhfaMembers"></div>' +
      '<div class="xhfa-list" id="xhfaElderForm"></div>' +
      '<div class="xhfa-list" id="xhfaContentForm"></div>' +
      '<div class="xhfa-list" id="xhfaTasks"></div>' +
      '<div class="xhfa-list" id="xhfaLogs"></div>' +
      '<div class="xhfa-list" id="xhfaRecordings"></div>' +
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
      line.appendChild(el('span', 'xhfa-tag ok', '监护者'));
      line.appendChild(el('span', 'xhfa-name', row.nickname || '家人'));
      line.appendChild(el('span', 'xhfa-body', row.openid_mask || ''));
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
        api('/family/member/save', { id: row.id, role: 'child', dailyEnabled: check.checked, dailyTime: time.value })
          .then(function (r) { if (r && r.code === 0) load(); else err((r && r.message) || '保存失败'); });
      };
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


  function fieldLine(label, value, placeholder, area) {
    var line = el('div', 'xhfa-row');
    line.appendChild(el('span', 'xhfa-tag', label));
    var field = area ? document.createElement('textarea') : document.createElement('input');
    if (area) field.rows = 3; else field.type = 'text';
    field.value = value == null ? '' : value;
    field.placeholder = placeholder || '';
    field.style.cssText = 'flex:1;min-width:120px;background:#060608;border:1px solid rgba(255,255,255,.12);color:#f2f5f8;border-radius:8px;padding:5px 9px;font-size:12px;font-family:inherit';
    line.appendChild(field);
    return { line: line, field: field };
  }

  function renderElder(data) {
    var box = document.getElementById('xhfaElderForm');
    if (!box) return;
    box.innerHTML = '';
    var e = data.elder || {};
    var head = el('div', 'xhfa-head');
    head.appendChild(el('h3', null, '被监护者'));
    head.appendChild(el('span', 'xhfa-sub', '客厅盒子，不需要智能手机'));
    box.appendChild(head);
    var values = {};
    [['name', '称呼', '例如：爷爷'], ['age', '年龄', ''], ['wake', '起床', '07:00'], ['sleep', '睡觉', '21:30'], ['likes', '喜欢', '下棋、听戏'], ['dislikes', '不喜欢', ''], ['notes', '备注', '']].forEach(function (item) {
      var f = fieldLine(item[1], e[item[0]] || '', item[2]);
      values[item[0]] = f.field;
      box.appendChild(f.line);
    });
    var save = el('button', 'xhfa-save', '保存档案');
    box.appendChild(save);
    save.onclick = function () {
      var elder = {};
      Object.keys(values).forEach(function (k) { elder[k] = values[k].value.trim(); });
      api('/elder/save', { elder: elder }).then(function (r) {
        if (r && r.code === 0) { err('已保存'); setTimeout(load, 600); } else err((r && r.message) || '保存失败');
      });
    };
  }

  function renderContent(data) {
    var box = document.getElementById('xhfaContentForm');
    if (!box) return;
    box.innerHTML = '';
    var c = data.content || {};
    var head = el('div', 'xhfa-head');
    head.appendChild(el('h3', null, '盒子内容'));
    head.appendChild(el('span', 'xhfa-sub', '盒子对老人说什么'));
    box.appendChild(head);
    var greeting = fieldLine('开场白', c.greeting || '', '例如：爷爷，今天感觉怎么样？', true);
    var topics = fieldLine('话题库', c.topics || '', '每行一个话题', true);
    var persona = fieldLine('语气', c.persona || '', '例如：温和、慢一点、像家人', true);
    var times = fieldLine('每日次数', c.dailyTimes || '', '例如：09:00,15:00,20:00');
    box.appendChild(greeting.line); box.appendChild(topics.line); box.appendChild(persona.line); box.appendChild(times.line);
    var save = el('button', 'xhfa-save', '保存内容');
    box.appendChild(save);
    save.onclick = function () {
      var content = {
        greeting: greeting.field.value.trim(),
        topics: topics.field.value.trim(),
        persona: persona.field.value.trim(),
        dailyTimes: times.field.value.trim()
      };
      api('/elder/save', { content: content }).then(function (r) {
        if (r && r.code === 0) { err('已保存'); setTimeout(load, 600); } else err((r && r.message) || '保存失败');
      });
    };
  }

  function renderTasks(data) {
    var box = document.getElementById('xhfaTasks');
    if (!box) return;
    box.innerHTML = '';
    var head = el('div', 'xhfa-head');
    head.appendChild(el('h3', null, '任务'));
    head.appendChild(el('span', 'xhfa-sub', '让盒子问老人、并录音存档'));
    box.appendChild(head);
    var list = data.tasks || [];
    list.forEach(function (task) {
      var line = el('div', 'xhfa-row');
      line.appendChild(el('span', 'xhfa-tag ' + (task.status === 'done' ? 'ok' : ''), task.status === 'done' ? '已完成' : '待办'));
      line.appendChild(el('span', 'xhfa-body', task.text || ''));
      if (task.require_recording) line.appendChild(el('span', 'xhfa-tag', '必录音'));
      var done = el('button', null, '完成');
      done.onclick = function () { api('/task/complete', { id: task._id }).then(function () { load(); }); };
      var del = el('button', null, '删除');
      del.onclick = function () { if (confirm('删除任务？')) api('/task/delete', { id: task._id }).then(function () { load(); }); };
      line.appendChild(done); line.appendChild(del);
      box.appendChild(line);
    });
    var form = el('div', 'xhfa-row');
    var text = document.createElement('input');
    text.type = 'text'; text.placeholder = '任务内容，例如：问问爷爷今天吃了什么';
    text.style.cssText = 'flex:1;min-width:160px;background:#060608;border:1px solid rgba(255,255,255,.12);color:#f2f5f8;border-radius:8px;padding:5px 9px;font-size:12px;font-family:inherit';
    var due = document.createElement('input');
    due.type = 'datetime-local';
    due.style.cssText = 'background:#060608;border:1px solid rgba(255,255,255,.12);color:#f2f5f8;border-radius:8px;padding:4px 8px;font-size:12px;font-family:inherit';
    var rec = document.createElement('label');
    rec.style.cssText = 'display:inline-flex;align-items:center;gap:4px;font-size:12px;color:#92a0af';
    var chk = document.createElement('input'); chk.type = 'checkbox'; chk.checked = true;
    rec.appendChild(chk); rec.appendChild(document.createTextNode('必须录音'));
    var add = el('button', 'xhfa-save', '添加任务');
    add.onclick = function () {
      var value = text.value.trim();
      if (!value) { err('请输入任务内容'); return; }
      api('/task/save', { text: value, due_at: due.value ? new Date(due.value).getTime() : 0, require_recording: chk.checked }).then(function (r) {
        if (r && r.code === 0) { text.value = ''; load(); } else err((r && r.message) || '添加失败');
      });
    };
    form.appendChild(text); form.appendChild(due); form.appendChild(rec); form.appendChild(add);
    box.appendChild(form);
  }

  function renderRecordings(data) {
    var box = document.getElementById('xhfaRecordings');
    if (!box) return;
    box.innerHTML = '';
    var head = el('div', 'xhfa-head');
    head.appendChild(el('h3', null, '录音'));
    head.appendChild(el('span', 'xhfa-sub', '任务期间的录音，点击播放'));
    box.appendChild(head);
    var list = data.recordings || [];
    if (!list.length) { box.appendChild(el('div', 'xhfa-empty', '还没有录音')); return; }
    list.forEach(function (rec) {
      var line = el('div', 'xhfa-row');
      line.appendChild(el('span', 'xhfa-tag', fmt(rec.created_at)));
      line.appendChild(el('span', 'xhfa-body', rec.text || '（无转写）'));
      var play = el('button', null, '播放');
      play.onclick = function () {
        api('/recording/url', { id: rec._id }).then(function (r) {
          if (r && r.code === 0 && r.data.url) new Audio(r.data.url).play(); else err((r && r.message) || '无法获取录音');
        });
      };
      line.appendChild(play);
      box.appendChild(line);
    });
  }


  function selectBox(options, value) {
    var sel = document.createElement('select');
    sel.style.cssText = 'background:#060608;border:1px solid rgba(255,255,255,.12);color:#f2f5f8;border-radius:8px;padding:5px 8px;font-size:12px;font-family:inherit';
    options.forEach(function (opt) {
      var o = document.createElement('option');
      o.value = opt[0]; o.textContent = opt[1];
      if (opt[0] === value) o.selected = true;
      sel.appendChild(o);
    });
    return sel;
  }

  function textInput(placeholder) {
    var input = document.createElement('input');
    input.type = 'text'; input.placeholder = placeholder || '';
    input.style.cssText = 'flex:1;min-width:90px;background:#060608;border:1px solid rgba(255,255,255,.12);color:#f2f5f8;border-radius:8px;padding:5px 9px;font-size:12px;font-family:inherit';
    return input;
  }

  var RELATIONS = [['son', '儿子'], ['daughter', '女儿'], ['grandson', '孙子'], ['granddaughter', '孙女'], ['spouse', '配偶'], ['caregiver', '护工'], ['other', '其他']];

  async function renderElders() {
    var box = document.getElementById('xhfaElderForm');
    if (!box) return;
    var res = await api('/elder/list');
    var elders = (res && res.data && res.data.elders) || [];
    box.innerHTML = '';
    var head = el('div', 'xhfa-head');
    head.appendChild(el('h3', null, '被监护者'));
    head.appendChild(el('span', 'xhfa-sub', '客厅盒子，不需要智能手机'));
    box.appendChild(head);
    elders.forEach(function (e) {
      var line = el('div', 'xhfa-row');
      line.appendChild(el('span', 'xhfa-tag ok', e.call || e.name || '未命名'));
      line.appendChild(el('span', 'xhfa-body', [e.age ? e.age + '岁' : '', e.room, e.wake, e.sleep].filter(Boolean).join(' · ') || '未填写详细信息'));
      var del = el('button', null, '删除');
      del.onclick = function () {
        if (!confirm('删除该被监护者？')) return;
        api('/elder/delete', { id: e._id }).then(function () { renderElders(); });
      };
      line.appendChild(del);
      box.appendChild(line);
    });
    var form = el('div', 'xhfa-row');
    var call = textInput('称呼，例如：爷爷');
    var age = textInput('年龄');
    var room = textInput('房间');
    var wake = textInput('起床 07:00');
    var sleep = textInput('睡觉 21:30');
    var likes = textInput('喜欢 / 忌讳');
    var add = el('button', 'xhfa-save', '添加被监护者');
    add.onclick = function () {
      if (!call.value.trim()) { err('请填写称呼'); return; }
      api('/elder/create', { call: call.value.trim(), name: call.value.trim(), age: age.value.trim(), room: room.value.trim(), wake: wake.value.trim(), sleep: sleep.value.trim(), likes: likes.value.trim() }).then(function (r) {
        if (r && r.code === 0) renderElders(); else err((r && r.message) || '添加失败');
      });
    };
    form.appendChild(call); form.appendChild(age); form.appendChild(room); form.appendChild(wake); form.appendChild(sleep); form.appendChild(likes); form.appendChild(add);
    box.appendChild(form);
  }

  async function renderPeople() {
    var box = document.getElementById('xhfaContentForm');
    if (!box) return;
    var eldersRes = await api('/elder/list');
    var elders = (eldersRes && eldersRes.data && eldersRes.data.elders) || [];
    var res = await api('/people/list');
    var people = (res && res.data && res.data.people) || [];
    box.innerHTML = '';
    var head = el('div', 'xhfa-head');
    head.appendChild(el('h3', null, '人员与关系'));
    head.appendChild(el('span', 'xhfa-sub', '家人 / 护工，以及生物识别状态'));
    box.appendChild(head);
    people.forEach(function (p) {
      var line = el('div', 'xhfa-row');
      line.appendChild(el('span', 'xhfa-tag', p.name || ''));
      var rel = (RELATIONS.filter(function (r) { return r[0] === p.relation; })[0] || [p.relation, p.relation || '']);
      var elderHit = elders.filter(function (e) { return e._id === p.elder_id; })[0] || {}; line.appendChild(el('span', 'xhfa-body', rel[1] + (elderHit.call ? ' · ' + elderHit.call : '')));
      line.appendChild(el('span', 'xhfa-tag ' + (p.voice_status === 'enrolled' ? 'ok' : ''), '声纹' + (p.voice_status === 'enrolled' ? '✓' : '—')));
      line.appendChild(el('span', 'xhfa-tag', '人脸—'));
      line.appendChild(el('span', 'xhfa-tag', '指纹—'));
      var del = el('button', null, '删除');
      del.onclick = function () { if (confirm('删除该人员？')) api('/people/delete', { id: p._id }).then(function () { renderPeople(); }); };
      line.appendChild(del);
      box.appendChild(line);
    });
    var form = el('div', 'xhfa-row');
    var name = textInput('姓名');
    var relSel = selectBox(RELATIONS, 'son');
    var elderSel = selectBox([['', '（不指定老人）']].concat(elders.map(function (e) { return [e._id, e.call || e.name]; })), '');
    var add = el('button', 'xhfa-save', '添加人员');
    add.onclick = function () {
      if (!name.value.trim()) { err('请填写姓名'); return; }
      api('/people/save', { name: name.value.trim(), relation: relSel.value, elder_id: elderSel.value }).then(function (r) {
        if (r && r.code === 0) renderPeople(); else err((r && r.message) || '添加失败');
      });
    };
    form.appendChild(name); form.appendChild(relSel); form.appendChild(elderSel); form.appendChild(add);
    box.appendChild(form);
  }

  var logFilter = '';

  async function renderLogs() {
    var box = document.getElementById('xhfaLogs');
    if (!box) return;
    var res = await api('/family/messages', { source: logFilter });
    var rows = (res && res.data && res.data.messages) || [];
    box.innerHTML = '';
    var head = el('div', 'xhfa-head');
    head.appendChild(el('h3', null, '聊天记录'));
    var all = el('button', logFilter === '' ? 'xhfa-save' : null, '全部');
    var boxBtn = el('button', logFilter === 'box' ? 'xhfa-save' : null, '盒子');
    var qqBtn = el('button', logFilter === 'qq_group' ? 'xhfa-save' : null, '群聊');
    all.onclick = function () { logFilter = ''; renderLogs(); };
    boxBtn.onclick = function () { logFilter = 'box'; renderLogs(); };
    qqBtn.onclick = function () { logFilter = 'qq_group'; renderLogs(); };
    head.appendChild(all); head.appendChild(boxBtn); head.appendChild(qqBtn);
    box.appendChild(head);
    if (!rows.length) { box.appendChild(el('div', 'xhfa-empty', '还没有记录')); return; }
    rows.slice(-40).reverse().forEach(function (m) {
      var line = el('div', 'xhfa-row');
      line.appendChild(el('span', 'xhfa-tag ' + (m.source === 'box' ? 'ok' : 'qq'), m.source === 'box' ? '盒子' : '群聊'));
      var text = m.corrected_text ? m.corrected_text : (m.content || '');
      var body = el('span', 'xhfa-body', (m.person_name || '') + '：' + text);
      if (m.corrected_text) body.appendChild(el('span', 'xhfa-tag ok', '已修正'));
      line.appendChild(body);
      line.appendChild(el('span', 'xhfa-time', fmt(m.ts)));
      if (m.audio_file_id) {
        var play = el('button', null, '播放');
        play.onclick = function () {
          api('/family/message/audio', { id: m._id }).then(function (r) {
            if (r && r.code === 0 && r.data.url) new Audio(r.data.url).play();
            else err((r && r.message) || '没有录音');
          });
        };
        line.appendChild(play);
      }
      if (m.source === 'box') {
        var fix = el('button', null, '修正');
        fix.onclick = function () {
          var value = prompt('修正识别结果（原：' + (m.content || '') + '）', m.corrected_text || m.content || '');
          if (value == null) return;
          api('/family/message/correct', { id: m._id, corrected_text: value.trim() }).then(function (r) {
            if (r && r.code === 0) renderLogs(); else err((r && r.message) || '修正失败');
          });
        };
        line.appendChild(fix);
      }
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
        renderElders();
        renderPeople();
        renderLogs();
        renderTasks(data);
        renderRecordings(data);
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
