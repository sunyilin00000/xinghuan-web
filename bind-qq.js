/* 星环中枢 · 绑定 QQ 前端组件（无需构建）
 *
 * 用法：在 index.html 的 </body> 前加一行
 *   <script src="bind-qq.js" defer></script>
 *
 * 依赖：index.html 里已有的 window.XINGHUAN_API，以及登录后写入的
 *       localStorage['hub_token']（站内现有逻辑）。
 */
(function () {
  'use strict';

  // 独立云函数时，在 index.html 里先设置 window.XINGHUAN_BIND_API；
  // 没有则回落到主站 SCF（方案 A 合并在主函数里的情况）。
  var API = (window.XINGHUAN_BIND_API || window.XINGHUAN_API || '').replace(/\/+$/, '');
  if (!API) return;

  var POLL_MS = 3000;
  var POLL_MAX = 200; // 10 分钟

  function token() {
    try { return localStorage.getItem('hub_token') || ''; } catch (e) { return ''; }
  }

  function post(path, body) {
    return fetch(API + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    }).then(function (r) { return r.json(); });
  }

  function el(tag, style, text) {
    var node = document.createElement(tag);
    if (style) node.setAttribute('style', style);
    if (text != null) node.textContent = text;
    return node;
  }

  var pill = null;
  var overlay = null;

  function toast(msg) {
    var t = el('div',
      'position:fixed;left:50%;bottom:96px;transform:translateX(-50%);z-index:99999;' +
      'background:rgba(20,20,24,.94);color:#f2e8d5;padding:10px 18px;border-radius:10px;' +
      'font:14px/1.5 system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.35)',
      msg);
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  }

  function closeModal() {
    if (overlay) { overlay.remove(); overlay = null; }
  }

  function openModal() {
    if (!token()) { toast('请先登录星环中枢'); return; }
    closeModal();

    overlay = el('div',
      'position:fixed;inset:0;z-index:99998;background:rgba(8,8,10,.62);' +
      'display:flex;align-items:center;justify-content:center;padding:20px');
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });

    var card = el('div',
      'width:min(420px,92vw);background:#17171b;color:#efe6d2;border:1px solid rgba(214,183,116,.35);' +
      'border-radius:16px;padding:22px 22px 18px;font:14px/1.7 system-ui,-apple-system,"Segoe UI",sans-serif;' +
      'box-shadow:0 24px 60px rgba(0,0,0,.5)');
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    card.appendChild(el('h3', 'margin:0 0 6px;font-size:17px;font-weight:600;color:#e9d9ae', '绑定 QQ'));

    var status = el('p', 'margin:0 0 14px;color:#b9b2a4;font-size:13px', '正在检查绑定状态…');
    card.appendChild(status);

    var codeBox = el('div',
      'display:none;text-align:center;margin:6px 0 10px;padding:14px;border-radius:12px;' +
      'background:rgba(214,183,116,.08);border:1px dashed rgba(214,183,116,.4)');
    var codeEl = el('div',
      'font:600 34px/1.2 ui-monospace,Consolas,monospace;letter-spacing:.22em;color:#f3d99b', '');
    codeBox.appendChild(codeEl);
    card.appendChild(codeBox);

    var hint = el('p', 'margin:0 0 16px;color:#b9b2a4;font-size:13px;display:none',
      '打开手机 QQ，私聊机器人发送：');
    var cmd = el('div',
      'display:none;font:13px/1.6 ui-monospace,Consolas,monospace;background:#0f0f12;' +
      'border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:8px 10px;color:#dfe6ff;margin:0 0 16px');
    card.appendChild(hint);
    card.appendChild(cmd);

    var actions = el('div', 'display:flex;gap:10px;justify-content:flex-end');
    var closeBtn = el('button',
      'padding:8px 16px;border-radius:9px;border:1px solid rgba(255,255,255,.16);' +
      'background:transparent;color:#ded6c6;cursor:pointer;font-size:13px', '关闭');
    closeBtn.onclick = closeModal;
    actions.appendChild(closeBtn);
    card.appendChild(actions);

    var timer = null, tries = 0;

    function stopPolling() { if (timer) { clearInterval(timer); timer = null; } }

    function renderBound(data) {
      stopPolling();
      codeBox.style.display = 'none';
      hint.style.display = 'none';
      cmd.style.display = 'none';
      status.textContent = '已绑定：' + (data.platform === 'qq_official' ? 'QQ 官方机器人' : (data.platform || 'QQ')) +
        '（' + (data.openid_mask || '') + '）';
      status.style.color = '#b7d7a8';
      if (data.bound_at) {
        var when = new Date(data.bound_at);
        if (!isNaN(when)) status.textContent += '\n绑定时间：' + when.toLocaleString('zh-CN');
      }
      toast('QQ 绑定成功');
    }

    function startPolling() {
      tries = 0;
      timer = setInterval(function () {
        tries += 1;
        if (tries > POLL_MAX) {
          stopPolling();
          status.textContent = '验证码可能已过期，请关闭后重新打开获取新验证码。';
          status.style.color = '#e0b3a6';
          return;
        }
        post('/bot/bind/status', { token: token() }).then(function (r) {
          if (r && r.code === 0 && r.data && r.data.bound) renderBound(r.data);
        }).catch(function () {});
      }, POLL_MS);
    }

    post('/bot/bind/status', { token: token() }).then(function (r) {
      if (r && r.code === 0 && r.data && r.data.bound) { renderBound(r.data); return; }

      return post('/bot/bind/ticket', { token: token() }).then(function (res) {
        if (!res || res.code !== 0 || !res.data || !res.data.code) {
          status.textContent = (res && res.message) || '获取验证码失败，请稍后再试。';
          status.style.color = '#e0b3a6';
          return;
        }
        var c = res.data.code;
        var mins = Math.round((res.data.expires_in || 600) / 60);
        status.textContent = '在手机 QQ 里私聊机器人完成绑定';
        codeBox.style.display = 'block';
        codeEl.textContent = c;
        hint.style.display = 'block';
        cmd.style.display = 'block';
        cmd.textContent = '/绑定 ' + c;
        cmd.dataset.code = c;
        hint.textContent = '打开手机 QQ，私聊机器人发送下面这条（' + mins + ' 分钟内有效）：';
        startPolling();
      });
    }).catch(function () {
      status.textContent = '连接星环服务失败，请稍后再试。';
      status.style.color = '#e0b3a6';
    });

    overlay._stop = stopPolling;
  }

  // 不再显示右下角浮标：绑定入口已放进控制台「QQ 家庭助手」面板
    window.XHBind = { open: openModal, close: closeModal };
})();
