/* 星环 AI · 全局浮动窗（每页可见 + 可拖拽） */
(function () {
  'use strict';
  var style = document.createElement('style');
  style.textContent = `
  #hubAiFloat[hidden]{display:flex !important;}
  #hubAiDrawer{
    top:auto;left:auto;right:24px;bottom:96px;
    width:min(380px,92vw);height:min(560px,72vh);
    border-radius:18px;border:1px solid rgba(124,199,255,.25);
    box-shadow:0 24px 70px rgba(0,0,0,.62);
    transform:translateY(10px);opacity:0;pointer-events:none;
    transition:opacity .18s ease, transform .18s ease;overflow:hidden;
  }
  #hubAiDrawer.open{transform:none;opacity:1;pointer-events:auto;}
  #hubAiHead{cursor:grab;touch-action:none;user-select:none;}
  #hubAiHead.dragging{cursor:grabbing;}
  `;
  document.head.appendChild(style);

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  ready(function () {
    var drawer = document.getElementById('hubAiDrawer');
    var head = document.getElementById('hubAiHead');
    var floatBtn = document.getElementById('hubAiFloat');
    if (!drawer || !head) return;

    var pos = null;
    try { pos = JSON.parse(localStorage.getItem('hubAiPos') || 'null'); } catch (e) { pos = null; }

    function clamp(x, y) {
      var rect = drawer.getBoundingClientRect();
      var w = rect.width || 380;
      var h = rect.height || 560;
      return [
        Math.min(Math.max(8, x), Math.max(8, window.innerWidth - w - 8)),
        Math.min(Math.max(8, y), Math.max(8, window.innerHeight - h - 8))
      ];
    }

    function place(x, y) {
      drawer.style.left = x + 'px';
      drawer.style.top = y + 'px';
      drawer.style.right = 'auto';
      drawer.style.bottom = 'auto';
    }

    if (pos) place(pos.x, pos.y);

    drawer.addEventListener('transitionend', function () {
      if (pos) place(pos.x, pos.y);
    });

    head.addEventListener('pointerdown', function (event) {
      if (event.target.closest('button')) return;
      event.preventDefault();
      var rect = drawer.getBoundingClientRect();
      var offsetX = event.clientX - rect.left;
      var offsetY = event.clientY - rect.top;
      head.classList.add('dragging');

      function move(ev) {
        var c = clamp(ev.clientX - offsetX, ev.clientY - offsetY);
        place(c[0], c[1]);
      }

      function up() {
        head.classList.remove('dragging');
        head.removeEventListener('pointermove', move);
        head.removeEventListener('pointerup', up);
        head.removeEventListener('pointercancel', up);
        var r = drawer.getBoundingClientRect();
        pos = { x: r.left, y: r.top };
        try { localStorage.setItem('hubAiPos', JSON.stringify(pos)); } catch (e) {}
      }

      try { head.setPointerCapture(event.pointerId); } catch (e) {}
      head.addEventListener('pointermove', move);
      head.addEventListener('pointerup', up);
      head.addEventListener('pointercancel', up);
    });

    head.addEventListener('dblclick', function (event) {
      if (event.target.closest('button')) return;
      try { localStorage.removeItem('hubAiPos'); } catch (e) {}
      pos = null;
      drawer.style.left = '';
      drawer.style.top = '';
      drawer.style.right = '';
      drawer.style.bottom = '';
    });

    window.addEventListener('resize', function () {
      if (!pos) return;
      var c = clamp(pos.x, pos.y);
      place(c[0], c[1]);
    });

    if (floatBtn) {
      floatBtn.addEventListener('click', function () {
        try {
          if (!localStorage.getItem('hub_token')) {
            var box = document.getElementById('hubAiMsgs');
            if (box) {
              var node = document.createElement('div');
              node.className = 'ai-msg bot';
              node.textContent = '请先登录后再使用星环 AI。';
              box.appendChild(node);
              box.scrollTop = box.scrollHeight;
            }
          }
        } catch (e) {}
      }, true);
    }
  });
})();
