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

  function fmtDuration(seconds) {
    var value = Math.max(0, Math.round(Number(seconds) || 0));
    var day = Math.floor(value / 86400);
    var hour = Math.floor((value % 86400) / 3600);
    var minute = Math.floor((value % 3600) / 60);
    if (day) return day + ' 天 ' + hour + ' 小时';
    if (hour) return hour + ' 小时 ' + minute + ' 分';
    return minute + ' 分钟';
  }

  function fmtAgo(seconds) {
    if (seconds === null || seconds === undefined) return '未知';
    var value = Math.max(0, Math.round(Number(seconds) || 0));
    if (value < 60) return value + ' 秒前';
    if (value < 3600) return Math.round(value / 60) + ' 分钟前';
    if (value < 86400) return Math.round(value / 3600) + ' 小时前';
    return Math.round(value / 86400) + ' 天前';
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
  #${MOUNT_ID} .xhfa-portrait{background:rgba(17,17,21,.85);border:1px solid rgba(255,255,255,.075);border-radius:14px;padding:12px 14px;margin-bottom:10px}
  #${MOUNT_ID} .xhfa-portrait h4{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f8ebce);display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  #${MOUNT_ID} .xhfa-portrait p{margin:4px 0;font-size:12.5px;color:var(--text,#f2f5f8);line-height:1.6}
  #${MOUNT_ID} .xhfa-portrait .xhfa-meta{font-size:11.5px;color:var(--faint,#5e6b79);margin:3px 0 6px}
  #${MOUNT_ID} .xhfa-portrait .xhfa-quote{border-left:2px solid rgba(232,201,142,.35);padding-left:8px;margin:5px 0;color:var(--muted,#92a0af);font-size:12px;line-height:1.5}
  #${MOUNT_ID} .xhfa-tag.risk-high{color:#ff8b8b;border-color:rgba(255,139,139,.5)}
  #${MOUNT_ID} .xhfa-tag.risk-medium{color:#ffc98a;border-color:rgba(255,180,90,.45)}
  #${MOUNT_ID} .xhfa-tag.risk-low{color:#86b5a0;border-color:rgba(134,181,160,.4)}
  @media (max-width:720px){ #${MOUNT_ID} .xhfa-member .xhfa-name{min-width:0} }
  `;

  function mount() {
    var page = document.getElementById('workbenchPage');
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
      '<div class="xhfa-list" id="xhfaBoxStatus"></div>' +
      '<div class="xhfa-list" id="xhfaBoxSettings" style="display:none"></div>' +
      '<div style="display:flex;justify-content:flex-end;margin-bottom:8px"><button id="xhfaBind">绑定 QQ</button></div>' +
      '<div class="xhfa-list" id="xhfaElder"><div class="xhfa-empty">被监护者 / 服务对象可以通过客厅盒子交流，不强制需要智能手机。</div></div>' +
      '<div class="xhfa-list" id="xhfaPortrait" style="display:none"></div>' +
      '<div class="xhfa-list" id="xhfaAstrbot" style="display:none"></div>' +
      '<div class="xhfa-head" style="margin:14px 0 8px"><h3 style="font-size:14px">监护者（QQ 绑定）</h3></div>' +
      '<div class="xhfa-list" id="xhfaMembers"></div>' +
      '<div class="xhfa-list" id="xhfaElderForm"></div>' +
      '<div class="xhfa-list" id="xhfaContentForm"></div>' +
      '<div class="xhfa-list" id="xhfaTasks"></div>' +
      '<div class="xhfa-list" id="xhfaSched"></div>' +
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
    function syncProgramOnly() {
      var root = document.getElementById(MOUNT_ID);
      if (!root) return;
      var org = '';
      try { org = localStorage.getItem('wbOrg') || ''; } catch (e) {}
      root.style.display = (org === 'program') ? '' : 'none';
    }
    syncProgramOnly();
    setInterval(syncProgramOnly, 1500);

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

  // 盒子状态：靠盒子服务每 45 秒上报的心跳判断，不用登服务器看日志
  function renderBoxStatus(data) {
    var box = document.getElementById('xhfaBoxStatus');
    if (!box) return;
    box.innerHTML = '';
    var s = data.box_status;
    var head = el('div', 'xhfa-head');
    head.appendChild(el('h3', null, '盒子状态'));
    head.appendChild(el('span', 'xhfa-tag ' + (s && s.online ? 'ok' : 'bad'), s ? (s.online ? '在线' : '离线') : '还没上报'));
    if (s && s.online) {
      head.appendChild(el('span', 'xhfa-sub', s.device_connected ? 'ESP32 已连接' : 'ESP32 未连接（服务在跑，等盒子联网）'));
    }
    box.appendChild(head);
    if (!s) {
      box.appendChild(el('div', 'xhfa-empty', '盒子服务还没上报状态（刚重启时等 1 分钟；一直为空说明服务没起来）'));
      return;
    }
    var facts = [];
    facts.push('服务已运行 ' + fmtDuration(s.uptime_sec));
    facts.push('上次心跳 ' + fmtAgo(s.stale_seconds));
    if (s.device_connected && s.device_addr) facts.push('盒子地址 ' + s.device_addr);
    facts.push('今日对话 ' + (s.today_user_msgs || 0) + ' 句');
    facts.push('已认人 ' + (s.named_persons || 0) + '/' + (s.persons || 0));
    facts.push('语音 ' + (s.tts === 'piper' ? '本地 Piper' : 'Edge 云端'));
    var line1 = el('div', 'xhfa-row');
    line1.appendChild(el('span', 'xhfa-body', facts.join(' · ')));
    box.appendChild(line1);

    var engines = [];
    engines.push('识别' + (s.asr_ready ? '✓' : '—'));
    engines.push('声纹' + (s.voiceprint_ready ? '✓' : '—'));
    engines.push('声音事件' + (s.sound_events ? '✓' : '关'));
    var line2 = el('div', 'xhfa-row');
    line2.appendChild(el('span', 'xhfa-tag', engines.join(' ')));
    line2.appendChild(el('span', 'xhfa-body', '最后听到：' + (s.last_voice_ts ? fmt(s.last_voice_ts * 1000) : '还没听到过')));
    if (s.awaiting_name) line2.appendChild(el('span', 'xhfa-tag ok', '正在问称呼'));
    if (s.pending_task) line2.appendChild(el('span', 'xhfa-tag qq', '任务录音中'));
    box.appendChild(line2);
  }

  // 盒子参数：工作台里在线调，盒子每 60 秒拉一次热更新
  var boxSettingsLoaded = false;

  function settingRow(label, key, value, attrs) {
    var line = el('div', 'xhfa-row');
    line.appendChild(el('span', 'xhfa-tag', label));
    var input = document.createElement('input');
    input.type = (attrs && attrs.type) || 'number';
    if (attrs && attrs.min !== undefined) input.min = attrs.min;
    if (attrs && attrs.max !== undefined) input.max = attrs.max;
    if (attrs && attrs.step !== undefined) input.step = attrs.step;
    input.value = value == null ? '' : value;
    input.setAttribute('data-key', key);
    input.style.cssText = 'width:120px;background:#060608;border:1px solid rgba(255,255,255,.12);color:#f2f5f8;border-radius:8px;padding:5px 9px;font-size:12px;font-family:inherit';
    line.appendChild(input);
    return line;
  }

  function renderBoxSettings(force) {
    var box = document.getElementById('xhfaBoxSettings');
    if (!box) return;
    box.style.display = '';
    if (boxSettingsLoaded && !force) return;
    boxSettingsLoaded = true;
    box.innerHTML = '<div class="xhfa-empty">正在读取盒子参数…</div>';
    api('/console/box/settings').then(function (res) {
      if (!res || res.code !== 0) {
        box.innerHTML = '';
        box.appendChild(el('div', 'xhfa-empty', (res && res.message) || '读取盒子参数失败'));
        return;
      }
      var data = res.data || {};
      var current = data.settings || data.applied || {};
      box.innerHTML = '';

      var head = el('div', 'xhfa-head');
      head.appendChild(el('h3', null, '盒子参数'));
      head.appendChild(el('span', 'xhfa-sub', data.box_online ? '盒子在线 · 保存后 60 秒内生效' : '盒子当前离线 · 上线后自动生效'));
      var refresh = el('button', null, '刷新');
      refresh.onclick = function () { boxSettingsLoaded = false; renderBoxSettings(true); };
      head.appendChild(refresh);
      box.appendChild(head);

      var grid = el('div');
      grid.style.cssText = 'padding:0 14px 6px';
      grid.appendChild(settingRow('主动搭话间隔(分)', 'silence_min', current.silence_min, { min: 1, max: 240 }));
      grid.appendChild(settingRow('两次搭话最小间隔(分)', 'cooldown_min', current.cooldown_min, { min: 1, max: 240 }));
      grid.appendChild(settingRow('活跃时段开始(点)', 'active_start', current.active_start, { min: 0, max: 23 }));
      grid.appendChild(settingRow('活跃时段结束(点)', 'active_end', current.active_end, { min: 1, max: 24 }));
      grid.appendChild(settingRow('语速(%)', 'tts_rate', current.tts_rate, { type: 'text' }));
      grid.appendChild(settingRow('麦克风灵敏度', 'rms_threshold', current.rms_threshold, { min: 50, max: 5000, step: 10 }));
      grid.appendChild(settingRow('静音判定块数', 'silence_chunks', current.silence_chunks, { min: 10, max: 300 }));
      grid.appendChild(settingRow('声纹相似度阈值', 'voice_match', current.voice_match, { min: 0.3, max: 0.95, step: 0.01 }));
      box.appendChild(grid);

      var saveRow = el('div', 'xhfa-row');
      var save = el('button', 'xhfa-save', '保存到盒子');
      var state = el('span', 'xhfa-meta', '');
      save.onclick = function () {
        var settings = {};
        grid.querySelectorAll('input[data-key]').forEach(function (input) {
          settings[input.getAttribute('data-key')] = input.value.trim();
        });
        save.disabled = true;
        state.textContent = '保存中…';
        api('/console/box/settings', { settings: settings }).then(function (r) {
          save.disabled = false;
          if (r && r.code === 0) {
            state.textContent = '已保存，等盒子下一次心跳（≤60 秒）生效';
            setTimeout(function () { boxSettingsLoaded = false; renderBoxSettings(true); }, 1500);
          } else {
            state.textContent = (r && r.message) || '保存失败';
          }
        });
      };
      saveRow.appendChild(save);
      saveRow.appendChild(state);
      box.appendChild(saveRow);

      var applied = data.applied;
      if (applied) {
        var summary = '盒子当前生效：'
          + '主动搭话 ' + (applied.silence_min != null ? applied.silence_min : '-') + ' 分'
          + ' · 冷却 ' + (applied.cooldown_min != null ? applied.cooldown_min : '-') + ' 分'
          + ' · 时段 ' + (applied.active_start != null ? applied.active_start : '-') + '-' + (applied.active_end != null ? applied.active_end : '-') + ' 点'
          + ' · 语速 ' + (applied.tts_rate || '-')
          + ' · 灵敏度 ' + (applied.rms_threshold != null ? applied.rms_threshold : '-')
          + ' · 静音 ' + (applied.silence_chunks != null ? applied.silence_chunks : '-')
          + ' · 声纹 ' + (applied.voice_match != null ? applied.voice_match : '-');
        box.appendChild(el('div', 'xhfa-meta', summary));
      } else {
        box.appendChild(el('div', 'xhfa-meta', '还没收到盒子回传的生效值（等一次心跳即可）'));
      }
    });
  }

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
      var unbind = el('button', null, '解绑');
      unbind.onclick = function () {
        if (!confirm('解除这个 QQ 的绑定？')) return;
        api('/family/member/delete', { id: row.id }).then(function (r) {
          if (r && r.code === 0) load(); else err((r && r.message) || '解绑失败');
        });
      };
      line.appendChild(unbind);
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

  var RELATIONS = [['son', '儿子'], ['daughter', '女儿'], ['grandson', '孙子'], ['granddaughter', '孙女'], ['spouse', '配偶'], ['caregiver', '护工'], ['other', '其他'], ['custom', '自定义…']];

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
    head.appendChild(el('span', 'xhfa-sub', '成员、关系与生物识别状态，可自定义'));
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
    var elderSel = selectBox([['', '（不指定对象）']].concat(elders.map(function (e) { return [e._id, e.call || e.name]; })), '');
    var add = el('button', 'xhfa-save', '添加人员');
    add.onclick = function () {
      if (!name.value.trim()) { err('请填写姓名'); return; }
      var relationValue = relSel.value;
      if (relationValue === 'custom') {
        var custom = prompt('输入这个人的身份名称（比如：外甥、邻居、学生）');
        if (custom == null) return;
        custom = custom.trim().slice(0, 20);
        if (!custom) { err('身份名称不能为空'); return; }
        relationValue = custom;
      }
      api('/people/save', { name: name.value.trim(), relation: relationValue, elder_id: elderSel.value }).then(function (r) {
        if (r && r.code === 0) renderPeople(); else err((r && r.message) || '添加失败');
      });
    };
    form.appendChild(name); form.appendChild(relSel); form.appendChild(elderSel); form.appendChild(add);
    box.appendChild(form);
  }

  var logFilter = '';
  var portraitLoaded = false;
  // AstrBot WebUI 的公网 HTTPS 入口（服务器 Caddy 反代 127.0.0.1:6185）
  var ASTRBOT_URL = (window.XINGHUAN_ASTRBOT_URL || 'https://cloud1-d6gagyei397d315ca-1521583267.ap-shanghai.app.tcloudbase.com/');

  function loadAstrbotFrame() {
    var holder = document.getElementById('xhfaAstrbotFrame');
    if (!holder) return;
    holder.innerHTML = '';
    var frame = document.createElement('iframe');
    frame.src = ASTRBOT_URL;
    frame.style.cssText = 'width:100%;height:100%;border:0;background:#fff';
    frame.setAttribute('allow', 'clipboard-read; clipboard-write');
    frame.setAttribute('referrerpolicy', 'no-referrer');
    holder.appendChild(frame);
  }

  // AstrBot 面板：只有超级管理员能看（服务端另有人工入口限制）
  function renderAstrbot(visible) {
    var box = document.getElementById('xhfaAstrbot');
    if (!box) return;
    box.style.display = visible ? '' : 'none';
    if (!visible || box.getAttribute('data-ready')) return;
    box.setAttribute('data-ready', '1');
    box.innerHTML = '';
    var head = el('div', 'xhfa-head');
    head.appendChild(el('h3', null, 'AstrBot 面板'));
    head.appendChild(el('span', 'xhfa-sub', '机器人配置 / 插件 / 日志（首次需用 AstrBot 账号登录）'));
    var open = el('button', null, '打开面板');
    var popup = document.createElement('a');
    popup.href = ASTRBOT_URL;
    popup.target = '_blank';
    popup.rel = 'noopener';
    popup.textContent = '新窗口打开';
    popup.style.cssText = 'font-size:12px;color:var(--muted,#92a0af)';
    head.appendChild(open);
    head.appendChild(popup);
    box.appendChild(head);
    var holder = el('div');
    holder.id = 'xhfaAstrbotFrame';
    holder.style.cssText = 'height:70vh;min-height:480px;border:1px solid rgba(255,255,255,.08);border-radius:12px;overflow:hidden;background:#0b0b0f';
    holder.appendChild(el('div', 'xhfa-empty', '点「打开面板」加载；如果一直白屏，说明服务器 443 还没放行，或浏览器拦了第三方 Cookie，请用「新窗口打开」。'));
    box.appendChild(holder);
    open.onclick = loadAstrbotFrame;
  }

  // 心理画像：只对超级管理员本人（孙一琳）开放，服务端也会再校验一次
  function renderPortrait(force) {
    var box = document.getElementById('xhfaPortrait');
    if (!box) return;
    box.style.display = '';
    if (!force && portraitLoaded) return;
    portraitLoaded = true;
    box.innerHTML = '<div class="xhfa-empty">正在整理画像…（首次或重新分析需要几秒）</div>';
    api('/console/portrait', force ? { refresh: true } : {}).then(function (res) {
      if (!res || res.code !== 0) {
        box.innerHTML = '';
        box.appendChild(el('div', 'xhfa-empty', (res && res.message) || '画像加载失败'));
        return;
      }
      var data = res.data || {};
      box.innerHTML = '';
      var head = el('div', 'xhfa-head');
      head.appendChild(el('h3', null, '心理画像'));
      head.appendChild(el('span', 'xhfa-sub', '仅孙一琳本人可见 · 陪伴观察，不是医学诊断'));
      var again = el('button', null, '重新分析');
      again.onclick = function () { portraitLoaded = false; renderPortrait(true); };
      head.appendChild(again);
      box.appendChild(head);

      if (data.overall) box.appendChild(el('p', 'xhfa-meta', data.overall));
      var people = data.people || [];
      if (!people.length) {
        box.appendChild(el('div', 'xhfa-empty', '还没有足够的盒子/QQ 对话可以画像'));
      }
      people.forEach(function (person) {
        var card = el('div', 'xhfa-portrait');
        var title = el('h4');
        title.appendChild(document.createTextNode(person.name || '家人'));
        var riskText = person.risk === 'high' ? '需要关注' : (person.risk === 'medium' ? '留意一下' : '平稳');
        title.appendChild(el('span', 'xhfa-tag risk-' + (person.risk || 'low'), riskText));
        card.appendChild(title);

        var meta = [];
        if (person.msgs) meta.push('记录 ' + person.msgs + ' 句');
        if (person.quiet_days !== null && person.quiet_days !== undefined) {
          meta.push(person.quiet_days === 0 ? '今天说过话' : '已经 ' + person.quiet_days + ' 天没说话');
        }
        if (person.active_hours && person.active_hours.length) {
          meta.push('常在 ' + person.active_hours.join('、') + ' 点说话');
        }
        if (person.topics && person.topics.length) meta.push('常聊 ' + person.topics.join('、'));
        if (meta.length) card.appendChild(el('div', 'xhfa-meta', meta.join(' · ')));

        if (person.summary) card.appendChild(el('p', null, person.summary));
        if (person.mood_word) card.appendChild(el('p', null, '情绪：' + person.mood_word));
        if (person.need) card.appendChild(el('p', null, '在意：' + person.need));
        if (person.care) card.appendChild(el('p', null, '可以这样关心：' + person.care));
        if (person.risk_reason) card.appendChild(el('p', 'xhfa-meta', '提示：' + person.risk_reason));
        (person.samples || []).slice(0, 3).forEach(function (text) {
          card.appendChild(el('div', 'xhfa-quote', text));
        });
        box.appendChild(card);
      });

      var alerts = data.alerts || [];
      if (alerts.length) {
        var alertCard = el('div', 'xhfa-portrait');
        alertCard.appendChild(el('h4', null, '最近的告警'));
        alerts.slice(0, 5).forEach(function (alert) {
          alertCard.appendChild(el('div', 'xhfa-quote', '[' + fmt(alert.created_at) + '] ' + (alert.text || '')));
        });
        box.appendChild(alertCard);
      }
      box.appendChild(el('div', 'xhfa-meta', '更新于 ' + fmt(data.generated_at) +
        (data.ai_used ? ' · 已用模型润色' : (data.ai_enabled ? ' · 模型暂不可用，规则分析' : ' · 规则分析'))));
    }).catch(function () {
      box.innerHTML = '';
      box.appendChild(el('div', 'xhfa-empty', '画像连接失败'));
    });
  }

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
    var privBtn = el('button', logFilter === 'qq_private' ? 'xhfa-save' : null, '私聊');
    all.onclick = function () { logFilter = ''; renderLogs(); };
    privBtn.onclick = function () { logFilter = 'qq_private'; renderLogs(); };
    boxBtn.onclick = function () { logFilter = 'box'; renderLogs(); };
    qqBtn.onclick = function () { logFilter = 'qq_group'; renderLogs(); };
    head.appendChild(all); head.appendChild(boxBtn); head.appendChild(qqBtn); head.appendChild(privBtn);
    box.appendChild(head);
    if (!rows.length) { box.appendChild(el('div', 'xhfa-empty', '还没有记录')); return; }
    rows.slice(-40).reverse().forEach(function (m) {
      var line = el('div', 'xhfa-row');
      var srcLabel = m.source === 'box' ? '盒子' : (m.source === 'qq_private' ? '私聊' : '群聊');
      line.appendChild(el('span', 'xhfa-tag ' + (m.source === 'box' ? 'ok' : 'qq'), srcLabel));
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


  async function renderSched() {
    var box = document.getElementById('xhfaSched');
    if (!box) return;
    var res = await api('/schedule/list');
    var items = (res && res.data && res.data.items) || [];
    box.innerHTML = '';
    var head = el('div', 'xhfa-head');
    head.appendChild(el('h3', null, '定时消息'));
    head.appendChild(el('span', 'xhfa-sub', '发到盒子 / 群聊 / 私聊'));
    box.appendChild(head);
    var labels = { box: '盒子', group: '群聊', private: '私聊' };
    items.forEach(function (it) {
      var line = el('div', 'xhfa-row');
      line.appendChild(el('span', 'xhfa-tag ' + (it.channel === 'box' ? 'ok' : 'qq'), labels[it.channel] || it.channel));
      line.appendChild(el('span', 'xhfa-body', (it.text || '') + ' · ' + fmt(it.due_at) + ' · ' + (it.repeat || 'once') + ' · ' + (it.status || '')));
      var del = el('button', null, '删除');
      del.onclick = function () { api('/schedule/delete', { id: it._id }).then(function () { renderSched(); }); };
      line.appendChild(del);
      box.appendChild(line);
    });
    var form = el('div', 'xhfa-row');
    var ch = selectBox([['box', '盒子'], ['group', '群聊'], ['private', '私聊']], 'box');
    var text = textInput('要发送的内容');
    var due = document.createElement('input'); due.type = 'datetime-local';
    due.style.cssText = 'background:#060608;border:1px solid rgba(255,255,255,.12);color:#f2f5f8;border-radius:8px;padding:4px 8px;font-size:12px;font-family:inherit';
    var rep = selectBox([['once', '一次'], ['daily', '每天'], ['weekly', '每周']], 'once');
    var add = el('button', 'xhfa-save', '添加');
    add.onclick = function () {
      var v = text.value.trim();
      if (!v) { err('请输入内容'); return; }
      var when = due.value ? new Date(due.value).getTime() : Date.now();
      api('/schedule/save', { channel: ch.value, text: v, due_at: when, repeat: rep.value }).then(function (r) {
        if (r && r.code === 0) { text.value = ''; renderSched(); } else err((r && r.message) || '添加失败');
      });
    };
    form.appendChild(ch); form.appendChild(text); form.appendChild(due); form.appendChild(rep); form.appendChild(add);
    box.appendChild(form);
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
      if (!me || me.code !== 0) {
        var root = document.getElementById(MOUNT_ID);
        if (root) root.style.display = 'none';
        return;
      }
      var who = document.getElementById('xhfaWho');
      if (who) who.textContent = (me.data.name || '') + ' · ' + (me.data.level === 'owner' ? '超级管理员' : '管理员');
      return api('/console/data').then(function (payload) {
        if (!payload || payload.code !== 0) { err((payload && payload.message) || '加载失败'); return; }
        clearErr();
        var data = payload.data || {};
        renderStats(data);
        renderBoxStatus(data);
        renderMembers(data);
        renderBox(data);
        renderChat(data);
        renderElders();
        renderPeople();
        renderLogs();
        renderSched();
        renderTasks(data);
        renderRecordings(data);
        if (me.data.portrait) {
          renderPortrait(false);
        } else {
          var portraitBox = document.getElementById('xhfaPortrait');
          if (portraitBox) portraitBox.style.display = 'none';
        }
        renderAstrbot(me.data.level === 'owner');
        renderBoxSettings(me.data.level === 'owner');
        if (me.data.level !== 'owner') {
          var settingsBox = document.getElementById('xhfaBoxSettings');
          if (settingsBox) settingsBox.style.display = 'none';
        }
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
