/* ============================================================
   星环终端 · 智能中枢 — 视觉引擎 v3.0
   原生 Canvas 星空 / 吸积盘 + 平滑滚动 + 视差 + 入场编排
   不依赖任何第三方动画库
   ============================================================ */
(() => {
  'use strict';

  const doc = document;
  const root = doc.documentElement;
  const TAU = Math.PI * 2;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const clamp = (v, min, max) => v < min ? min : v > max ? max : v;
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  const starCanvas = doc.getElementById('starfield');
  const ringCanvas = doc.getElementById('ringCanvas');
  const ringStage = doc.getElementById('ringStage');
  const hero = doc.getElementById('hero');
  const heroContent = doc.getElementById('heroContent');
  const scrollCue = doc.getElementById('scrollCue');
  const topbar = doc.getElementById('topbar');
  const progressBar = doc.getElementById('scrollProgressBar');
  const cursorGlow = doc.getElementById('cursorGlow');
  const deck = doc.getElementById('deck');
  const heroUserName = doc.getElementById('heroUserName');
  const heroUserMeta = doc.getElementById('heroUserMeta');
  const heroAccess = doc.querySelector('.hero-access');
  const navButtons = Array.from(doc.querySelectorAll('[data-scroll]'));
  const partners = doc.getElementById('partners');
  const consoleNavButton = doc.querySelector('[data-console]');
  const navHeroButton = doc.querySelector('[data-scroll="#hero"]');
  const navPartnersButton = doc.querySelector('[data-scroll="#partners"]');
  const applyButton = doc.getElementById('applyButton');
  const registerButton = doc.getElementById('registerButton');
  const footerConsoleButton = doc.getElementById('footerConsoleButton');
  const joinModal = doc.getElementById('joinModal');
  const joinForm = doc.getElementById('joinForm');
  const joinFormView = doc.getElementById('joinFormView');
  const joinSuccess = doc.getElementById('joinSuccess');
  const joinClose = doc.getElementById('joinClose');
  const joinDone = doc.getElementById('joinDone');
  const joinRef = doc.getElementById('joinRef');
  const joinOrg = doc.getElementById('joinOrg');
  const joinName = doc.getElementById('joinName');
  const joinContact = doc.getElementById('joinContact');
  const joinIntro = doc.getElementById('joinIntro');

  if (!starCanvas || !ringCanvas) return;

  /* =========================================================
     0. 通用小工具
     ========================================================= */
  const getMaxScroll = () => Math.max(0, root.scrollHeight - window.innerHeight);

  let heroHeightCache = window.innerHeight;
  function measureHero() {
    heroHeightCache = hero ? hero.offsetHeight : window.innerHeight;
  }

  function throttleRaf(fn) {
    let queued = false;
    return function throttled() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        fn();
      });
    };
  }

  /* =========================================================
     1. 星空粒子
     ========================================================= */
  const starState = {
    ctx: starCanvas.getContext('2d'),
    w: 0,
    h: 0,
    dpr: 1,
    stars: [],
    meteor: null,
    nextMeteor: 5
  };

  function makeStars() {
    const area = starState.w * starState.h;
    const total = clamp(Math.round(area / 7200), 100, 280);
    const stars = [];
    for (let i = 0; i < total; i += 1) {
      const depth = Math.random();
      const z = 0.12 + depth * 0.88;
      const big = Math.random() > 0.91;
      const tintRoll = Math.random();
      stars.push({
        x: Math.random() * starState.w,
        y: Math.random() * starState.h,
        depth,
        z,
        r: big
          ? 1.15 + depth * 1.35 + Math.random() * 0.8
          : 0.2 + depth * 0.7 + Math.random() * 0.3,
        phase: Math.random() * TAU,
        twinkle: 0.3 + Math.random() * 1.8,
        tint: tintRoll < 0.12 ? 'warm' : tintRoll < 0.2 ? 'violet' : 'cool',
        baseAlpha: 0.16 + depth * 0.62,
        big
      });
    }
    starState.stars = stars;
  }

  function resizeStars() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    starState.w = window.innerWidth;
    starState.h = window.innerHeight;
    starState.dpr = dpr;
    starCanvas.width = Math.round(starState.w * dpr);
    starCanvas.height = Math.round(starState.h * dpr);
    starCanvas.style.width = starState.w + 'px';
    starCanvas.style.height = starState.h + 'px';
    starState.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    makeStars();
  }

  function drawStars(time, dt) {
    const { ctx, w, h } = starState;
    if (!w || !h) return;
    const scroll = window.scrollY || 0;
    ctx.clearRect(0, 0, w, h);

    for (let i = 0; i < starState.stars.length; i += 1) {
      const s = starState.stars[i];
      // Z 轴景深：远处星星几乎不随页面移动，近处星星有轻微位移
      const depthPower = Math.pow(s.depth, 2.4);
      const shift = scroll * (0.0025 + depthPower * 0.072);
      let y = (s.y - shift) % h;
      if (y < 0) y += h;
      const drift = time * (0.06 + depthPower * 1.65);
      let x = (s.x + drift) % w;
      if (x < 0) x += w;

      const breath = 0.5 + 0.5 * Math.sin(time * s.twinkle + s.phase);
      const alpha = s.baseAlpha * (0.36 + breath * 0.64);
      const radius = s.r * (0.9 + breath * 0.14);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = s.tint === 'warm'
        ? 'rgba(255,226,188,1)'
        : s.tint === 'violet'
          ? 'rgba(203,193,255,1)'
          : 'rgba(211,225,255,1)';
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, TAU);
      ctx.fill();

      if (s.big) {
        ctx.globalAlpha = alpha * 0.16;
        ctx.beginPath();
        ctx.arc(x, y, radius * 4.8, 0, TAU);
        ctx.fill();
      }
    }

    // 偶尔划过的流星
    if (!reduceMotion) {
      if (!starState.meteor && time > starState.nextMeteor) {
        starState.meteor = {
          x: w * (0.08 + Math.random() * 0.7),
          y: h * (0.04 + Math.random() * 0.42),
          born: time,
          duration: 0.9 + Math.random() * 0.6,
          length: 110 + Math.random() * 150,
          angle: 0.32 + Math.random() * 0.22
        };
      }
      const m = starState.meteor;
      if (m) {
        const p = (time - m.born) / m.duration;
        if (p >= 1) {
          starState.meteor = null;
          starState.nextMeteor = time + 7 + Math.random() * 12;
        } else {
          const fade = Math.sin(Math.PI * p);
          const headX = m.x + p * 260;
          const headY = m.y + p * 150;
          const tailX = headX - Math.cos(m.angle) * m.length;
          const tailY = headY - Math.sin(m.angle) * m.length;
          const grad = ctx.createLinearGradient(headX, headY, tailX, tailY);
          grad.addColorStop(0, 'rgba(255,244,220,' + (0.85 * fade).toFixed(3) + ')');
          grad.addColorStop(0.25, 'rgba(235,205,160,' + (0.3 * fade).toFixed(3) + ')');
          grad.addColorStop(1, 'rgba(235,205,160,0)');
          ctx.globalAlpha = 1;
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(headX, headY);
          ctx.lineTo(tailX, tailY);
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  /* =========================================================
     2. 吸积盘（Canvas 3D 粒子）
     ========================================================= */
  const ringState = {
    ctx: ringCanvas.getContext('2d'),
    w: 0,
    h: 0,
    dpr: 1,
    particles: [],
    sprites: [],
    tilt: 0.34,
    cam: 1
  };

  const SPRITE_COLORS = [
    '255,246,228', // 白热
    '255,224,178', // 暖金
    '255,196,118', // 金色
    '255,158,84',  // 琥珀
    '205,222,255'  // 冷蓝星尘
  ];

  function makeSprite(rgb) {
    const c = doc.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.10, 'rgba(' + rgb + ',0.98)');
    grad.addColorStop(0.26, 'rgba(' + rgb + ',0.5)');
    grad.addColorStop(0.55, 'rgba(' + rgb + ',0.12)');
    grad.addColorStop(1, 'rgba(' + rgb + ',0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    return c;
  }

  function makeParticles(size) {
    const inner = size * 0.105;
    const outer = size * 0.445;
    const total = size < 720 ? 520 : 880;
    const particles = [];
    for (let i = 0; i < total; i += 1) {
      const rNorm = Math.pow(Math.random(), 1.35);
      const radius = inner + rNorm * (outer - inner);
      // 螺旋纹理：一部分粒子分布在若干条旋臂上
      let angle;
      if (Math.random() < 0.42) {
        const arm = Math.floor(Math.random() * 14) / 14 * TAU;
        angle = arm + (1 - rNorm) * 2.6 + (Math.random() - 0.5) * 0.16;
      } else {
        angle = Math.random() * TAU;
      }
      let spriteIndex;
      if (rNorm < 0.16) spriteIndex = 0;
      else if (rNorm < 0.42) spriteIndex = Math.random() < 0.35 ? 0 : 1;
      else if (rNorm < 0.72) spriteIndex = Math.random() < 0.18 ? 1 : 2;
      else spriteIndex = Math.random() < 0.12 ? 2 : 3;
      if (Math.random() < 0.035) spriteIndex = 4;

      particles.push({
        angle,
        radius,
        rNorm,
        speed: (0.085 + (1 - rNorm) * 0.24) * (0.985 + Math.random() * 0.03),
        size: (1.3 + (1 - rNorm) * 2.6) * (0.62 + Math.random() * 0.85),
        alpha: 0.26 + (1 - rNorm) * 0.55 + Math.random() * 0.16,
        spriteIndex
      });
    }
    return particles;
  }

  function resizeRing() {
    const cssSize = Math.max(
      ringStage.clientWidth || 0,
      ringCanvas.clientWidth || 0,
      320
    );
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    ringState.w = cssSize;
    ringState.h = cssSize;
    ringState.dpr = dpr;
    ringCanvas.width = Math.round(cssSize * dpr);
    ringCanvas.height = Math.round(cssSize * dpr);
    ringState.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ringState.cam = cssSize * 2.15;
    ringState.sprites = SPRITE_COLORS.map(makeSprite);
    ringState.particles = makeParticles(cssSize);
    if (reduceMotion) drawRing(0);
  }

  function drawCore(ctx, cx, cy, size) {
    const R = size * 0.092;

    // 中心外辉光
    const halo = ctx.createRadialGradient(cx, cy, R * 0.5, cx, cy, R * 3.4);
    halo.addColorStop(0, 'rgba(255,214,150,0.32)');
    halo.addColorStop(0.28, 'rgba(255,178,96,0.15)');
    halo.addColorStop(0.62, 'rgba(210,130,58,0.05)');
    halo.addColorStop(1, 'rgba(160,90,30,0)');
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 3.4, 0, TAU);
    ctx.fill();

    // 光子环
    ctx.save();
    const photon = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
    photon.addColorStop(0, 'rgba(255,248,232,0.95)');
    photon.addColorStop(0.42, 'rgba(255,218,160,0.85)');
    photon.addColorStop(0.72, 'rgba(255,178,96,0.55)');
    photon.addColorStop(1, 'rgba(255,236,204,0.9)');
    ctx.strokeStyle = photon;
    ctx.lineWidth = Math.max(1.1, size * 0.0019);
    ctx.shadowColor = 'rgba(255,206,140,0.9)';
    ctx.shadowBlur = size * 0.022;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.035, 0, TAU);
    ctx.stroke();
    ctx.restore();

    // 事件视界
    ctx.globalCompositeOperation = 'source-over';
    const horizon = ctx.createRadialGradient(
      cx - R * 0.3, cy - R * 0.34, R * 0.08,
      cx, cy, R
    );
    horizon.addColorStop(0, '#000000');
    horizon.addColorStop(0.72, '#000000');
    horizon.addColorStop(0.94, '#030303');
    horizon.addColorStop(1, '#0a0805');
    ctx.fillStyle = horizon;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.985, 0, TAU);
    ctx.fill();

    // 引力透镜弧光
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(255,206,148,0.18)';
    ctx.lineWidth = Math.max(0.8, size * 0.0014);
    ctx.beginPath();
    ctx.ellipse(cx, cy - R * 1.12, R * 2.15, R * 0.66, 0, Math.PI * 1.04, Math.PI * 1.96);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,224,180,0.1)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + R * 1.12, R * 2.15, R * 0.66, 0, Math.PI * 0.04, Math.PI * 0.96);
    ctx.stroke();
    ctx.restore();
  }

  function drawDiskHalf(ctx, cx, cy, size, time, near) {
    const tiltSin = Math.sin(ringState.tilt);
    const tiltCos = Math.cos(ringState.tilt);
    const cam = ringState.cam;
    const particles = ringState.particles;
    const sprites = ringState.sprites;

    for (let i = 0; i < particles.length; i += 1) {
      const p = particles[i];
      const angle = p.angle + time * p.speed;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const x3 = p.radius * cosA;
      const z3 = p.radius * sinA;
      const y3 = z3 * tiltSin;
      const zz = z3 * tiltCos;

      if (near ? zz < 0 : zz >= 0) continue;

      const persp = cam / (cam - zz);
      const sx = cx + x3 * persp;
      const sy = cy + y3 * persp;
      const doppler = clamp(0.74 + 0.5 * sinA, 0.48, 1.28);
      const sparkle = 0.82 + 0.18 * Math.sin(time * 1.7 + p.angle * 5.3);
      const alpha = clamp(p.alpha * doppler * sparkle * (near ? 1 : 0.78), 0, 1);
      const drawSize = p.size * persp * 3.15;

      ctx.globalAlpha = alpha;
      ctx.drawImage(
        sprites[p.spriteIndex],
        sx - drawSize / 2,
        sy - drawSize / 2,
        drawSize,
        drawSize
      );
    }
  }

  function drawRing(time) {
    const { ctx, w, h } = ringState;
    if (!w || !h || !ringState.sprites.length) return;
    const cx = w / 2;
    const cy = h / 2;
    ctx.clearRect(0, 0, w, h);

    // 盘面远景底光
    ctx.globalCompositeOperation = 'source-over';
    const ambient = ctx.createRadialGradient(cx, cy, w * 0.02, cx, cy, w * 0.5);
    ambient.addColorStop(0, 'rgba(255,190,118,0.10)');
    ambient.addColorStop(0.38, 'rgba(232,158,84,0.045)');
    ambient.addColorStop(0.72, 'rgba(180,110,50,0.015)');
    ambient.addColorStop(1, 'rgba(120,70,30,0)');
    ctx.fillStyle = ambient;
    ctx.beginPath();
    ctx.arc(cx, cy, w * 0.5, 0, TAU);
    ctx.fill();

    // 后半圈
    ctx.globalCompositeOperation = 'lighter';
    drawDiskHalf(ctx, cx, cy, w, time, false);

    // 黑洞本体
    ctx.globalAlpha = 1;
    drawCore(ctx, cx, cy, w);

    // 前半圈
    ctx.globalCompositeOperation = 'lighter';
    drawDiskHalf(ctx, cx, cy, w, time, true);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  /* =========================================================
     3. 平滑滚动（原生阻尼，无需 Lenis）
     ========================================================= */
  const smooth = {
    target: window.scrollY || 0,
    current: window.scrollY || 0,
    running: false,
    last: 0
  };

  function startSmooth() {
    if (smooth.running) return;
    smooth.running = true;
    smooth.last = 0;
    requestAnimationFrame(stepSmooth);
  }

  function stepSmooth(now) {
    const dt = smooth.last ? Math.min((now - smooth.last) / 1000, 0.1) : 0.016;
    smooth.last = now;
    const diff = smooth.target - smooth.current;
    if (Math.abs(diff) < 0.45) {
      smooth.current = smooth.target;
      window.scrollTo(0, Math.round(smooth.current));
      smooth.running = false;
      return;
    }
    // 与帧率无关的阻尼：低帧率下自动加大步长，避免“滚不到底”
    const factor = 1 - Math.pow(1 - 0.115, dt * 60);
    smooth.current += diff * factor;
    window.scrollTo(0, smooth.current);
    requestAnimationFrame(stepSmooth);
  }

  function smoothTo(y, immediate) {
    const max = getMaxScroll();
    smooth.target = clamp(y, 0, max);
    if (immediate || reduceMotion) {
      smooth.current = smooth.target;
      window.scrollTo(0, Math.round(smooth.current));
      return;
    }
    smooth.current = window.scrollY;
    startSmooth();
  }

  function addWheelDelta(delta) {
    const max = getMaxScroll();
    if (!smooth.running) {
      smooth.current = window.scrollY;
      smooth.target = window.scrollY;
    }
    smooth.target = clamp(smooth.target + delta, 0, max);
    if (reduceMotion) {
      smooth.current = smooth.target;
      window.scrollTo(0, Math.round(smooth.current));
      return;
    }
    startSmooth();
  }

  function getScrollableAncestor(target) {
    let el = target instanceof Element ? target : null;
    while (el && el !== doc.body && el !== doc.documentElement) {
      const style = window.getComputedStyle(el);
      const overflowY = style.overflowY;
      if ((overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
          el.scrollHeight > el.clientHeight + 2) {
        return el;
      }
      el = el.parentElement;
    }
    return null;
  }

  function hasBlockingOverlay() {
    return Boolean(doc.querySelector('.moss-alert.show, .ueg-modal.show, .join-modal.open, .modal.open'));
  }

  function onWheel(event) {
    if (event.ctrlKey || event.defaultPrevented) return;
    if (hasBlockingOverlay()) return;
    const delta = event.deltaMode === 1
      ? event.deltaY * 18
      : event.deltaMode === 2
        ? event.deltaY * window.innerHeight
        : event.deltaY;
    if (!delta) return;

    const inner = getScrollableAncestor(event.target);
    if (inner) {
      const atTop = inner.scrollTop <= 0.5;
      const atBottom = inner.scrollTop + inner.clientHeight >= inner.scrollHeight - 0.5;
      // 内部列表还能滚时交给原生；到达边界后把滚动手势交还给页面
      if (!((delta < 0 && atTop) || (delta > 0 && atBottom))) return;
    }

    event.preventDefault();
    addWheelDelta(delta);
  }

  if (!reduceMotion) {
    window.addEventListener('wheel', onWheel, { passive: false });
  }

  window.addEventListener('keydown', (event) => {
    if (hasBlockingOverlay()) return;
    const target = event.target;
    if (target instanceof HTMLElement &&
        (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) {
      return;
    }
    const page = window.innerHeight * 0.88;
    let handled = true;
    switch (event.key) {
      case 'PageDown':
        addWheelDelta(page);
        break;
      case 'PageUp':
        addWheelDelta(-page);
        break;
      case 'End':
        smoothTo(getMaxScroll());
        break;
      case 'Home':
        smoothTo(0);
        break;
      default:
        handled = false;
    }
    if (handled && !reduceMotion) event.preventDefault();
  }, { passive: false });

  window.addEventListener('touchstart', () => {
    if (smooth.running) {
      smooth.running = false;
      smooth.target = smooth.current = window.scrollY;
    }
  }, { passive: true });

  /* =========================================================
     3.5 监控中枢显隐 & 顶部导航状态
     ========================================================= */
  function updateNavActive() {
    const y = window.scrollY || 0;
    const consoleMode = doc.body.classList.contains('console-mode');
    const partnerTop = partners ? partners.offsetTop : heroHeightCache;
    const switchLine = Math.max(80, partnerTop - window.innerHeight * 0.48);
    const deckTop = deck && consoleMode ? deck.offsetTop : Infinity;
    const consoleActive = consoleMode && y > deckTop - window.innerHeight * 0.55;

    if (navHeroButton) {
      navHeroButton.classList.toggle('active', !consoleActive && y < switchLine);
    }
    if (navPartnersButton) {
      navPartnersButton.classList.toggle('active', !consoleActive && y >= switchLine);
    }
    if (consoleNavButton) {
      consoleNavButton.classList.toggle('active', consoleActive);
    }
  }

  function openConsole(tab) {
    doc.body.classList.add('console-mode');
    if (tab) {
      const tabButton = doc.querySelector('.page-tab[data-tab="' + tab + '"]');
      if (tabButton) tabButton.click();
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (deck) scrollToElement(deck, 18);
        window.dispatchEvent(new Event('resize'));
        window.setTimeout(() => window.dispatchEvent(new Event('resize')), 420);
        updateNavActive();
      });
    });
  }

  /* =========================================================
     4. 滚动视差 & 顶部状态
     ========================================================= */
  const applyScrollFX = throttleRaf(() => {
    const y = window.scrollY || 0;
    const heroHeight = heroHeightCache || window.innerHeight;
    const p = clamp(y / Math.max(1, heroHeight * 1.05), 0, 1);
    const eased = easeOutCubic(p);

    if (ringStage) {
      if (!reduceMotion) {
        ringStage.style.transform =
          'translate3d(-50%, -50%, 0) translateY(' + (eased * 96).toFixed(2) + 'px) ' +
          'scale(' + (1 - p * 0.21).toFixed(4) + ')';
      }
      ringStage.style.opacity = String(clamp(1 - p * 1.12, 0, 1));
    }

    if (heroContent) {
      if (!reduceMotion) {
        heroContent.style.transform =
          'translate3d(0, ' + (-eased * 64).toFixed(2) + 'px, 0)';
      }
      heroContent.style.opacity = String(clamp(1 - p * 1.42, 0, 1));
      heroContent.style.pointerEvents = p > 0.72 ? 'none' : '';
    }

    if (scrollCue) {
      scrollCue.style.opacity = String(clamp(1 - p * 3.2, 0, 1));
      scrollCue.style.transform = 'translate3d(-50%, ' + (p * 18).toFixed(2) + 'px, 0)';
    }

    if (topbar) topbar.classList.toggle('is-scrolled', y > 36);
    doc.body.classList.toggle('has-scrolled', y > 36);

    const max = getMaxScroll();
    if (progressBar) {
      progressBar.style.transform = 'scaleX(' + (max > 0 ? clamp(y / max, 0, 1) : 0) + ')';
    }

    if (navButtons.length || consoleNavButton) {
      updateNavActive();
    }
  });

  window.addEventListener('scroll', () => {
    if (!smooth.running) {
      smooth.current = smooth.target = window.scrollY;
    }
    applyScrollFX();
  }, { passive: true });

  /* =========================================================
     5. 指针光晕
     ========================================================= */
  const cursor = { x: 0, y: 0, tx: 0, ty: 0, visible: false };

  if (finePointer && cursorGlow) {
    window.addEventListener('pointermove', (event) => {
      cursor.tx = event.clientX;
      cursor.ty = event.clientY;
      if (!cursor.visible) {
        cursor.visible = true;
        cursor.x = cursor.tx;
        cursor.y = cursor.ty;
        cursorGlow.classList.add('is-visible');
      }
      if (reduceMotion || !cursorGlow) {
        cursorGlow.style.transform =
          'translate3d(' + (event.clientX - 300).toFixed(2) + 'px, ' + (event.clientY - 300).toFixed(2) + 'px, 0)';
      }
    }, { passive: true });
    window.addEventListener('pointerleave', () => {
      cursor.visible = false;
      cursorGlow.classList.remove('is-visible');
    });
  }

  function updateCursor() {
    if (!cursor.visible || !cursorGlow) return;
    cursor.x += (cursor.tx - cursor.x) * 0.12;
    cursor.y += (cursor.ty - cursor.y) * 0.12;
    cursorGlow.style.transform =
      'translate3d(' + (cursor.x - 300).toFixed(2) + 'px, ' + (cursor.y - 300).toFixed(2) + 'px, 0)';
  }

  /* =========================================================
     6. 入场编排
     ========================================================= */
  function setupReveal() {
    if (reduceMotion) return;
    const selectors = [
      '.partners-head', '.partner-grid', '.partners-cta',
      '.deck-head', '.deck-rail', '.page-tabs', '.identity-strip',
      '.stats-grid > .stat-card', '.workspace-grid > .panel',
      '.ppt-panel', '.classroom-board', '.classroom-side > .classroom-block',
      '.resources-page', '.res-card', '.console-page', '.console-strip'
    ];
    const nodes = [];
    selectors.forEach((selector) => {
      doc.querySelectorAll(selector).forEach((node) => nodes.push(node));
    });
    nodes.forEach((node, index) => {
      node.classList.add('xr');
      node.style.setProperty('--xr-delay', ((index % 6) * 55) + 'ms');
    });
    if (!('IntersectionObserver' in window)) {
      nodes.forEach((node) => node.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.04 });
    nodes.forEach((node) => io.observe(node));
  }

  /* =========================================================
     7. 页面交互：锚点 / 顶部导航 / 登录态
     ========================================================= */
  function scrollToElement(el, offset) {
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - (offset || 0);
    smoothTo(top);
  }

  function revealLoginForm() {
    doc.body.classList.remove('is-authed');
    if (heroAccess) heroAccess.setAttribute('aria-hidden', 'true');
    if (window.scrollY > 80) smoothTo(0);
    const panel = doc.querySelector('.login-panel');
    if (panel) {
      panel.classList.remove('is-pulse');
      void panel.offsetWidth;
      panel.classList.add('is-pulse');
      window.setTimeout(() => panel.classList.remove('is-pulse'), 1600);
    }
  }

  function setAuthedUI(user) {
    doc.body.classList.add('is-authed');
    const name = (user && (user.name || user.username)) || '成员';
    if (heroUserName) heroUserName.textContent = name;
    if (heroUserMeta) {
      const parts = [];
      if (user && user.department) parts.push(user.department);
      parts.push(user && user.role === 'admin' ? '管理员权限' : '成员身份');
      parts.push('数据通道已开启');
      heroUserMeta.textContent = parts.join(' · ');
    }
    if (heroAccess) heroAccess.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => {
      measureHero();
      applyScrollFX();
    });
  }

  window.XHLanding = {
    onLoginScreen: revealLoginForm,
    onLoginSuccess: setAuthedUI,
    scrollToHero: () => smoothTo(0),
    scrollToDeck: () => openConsole()
  };

  doc.querySelectorAll('[data-scroll]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = doc.querySelector(btn.dataset.scroll);
      scrollToElement(target, 0);
    });
  });

  if (consoleNavButton) {
    consoleNavButton.addEventListener('click', () => openConsole());
  }

  if (footerConsoleButton) {
    footerConsoleButton.addEventListener('click', () => openConsole());
  }

  if (scrollCue) {
    scrollCue.addEventListener('click', (event) => {
      event.preventDefault();
      scrollToElement(partners, 0);
    });
  }

  const enterConsoleButton = doc.getElementById('enterConsoleButton');
  if (enterConsoleButton) {
    enterConsoleButton.addEventListener('click', () => openConsole());
  }

  const openResourcesButton = doc.getElementById('openResourcesButton');
  if (openResourcesButton) {
    openResourcesButton.addEventListener('click', () => openConsole('resources'));
  }

  // 兜底：即使 app.js 未主动通知，也从身份标题推断登录态
  const identityTitle = doc.getElementById('identityTitle');
  if (identityTitle) {
    const observer = new MutationObserver(() => {
      const text = identityTitle.textContent || '';
      if (text.startsWith('欢迎')) {
        const name = text.replace(/^欢迎[，,]\s*/, '').trim();
        if (!doc.body.classList.contains('is-authed')) setAuthedUI({ name });
      }
    });
    observer.observe(identityTitle, { childList: true, characterData: true, subtree: true });
  }

  /* =========================================================
     7.5 入驻申请弹窗
     ========================================================= */
  let lastJoinFocus = null;

  function resetJoinState() {
    if (joinForm) joinForm.reset();
    if (joinFormView) joinFormView.hidden = false;
    if (joinSuccess) joinSuccess.hidden = true;
    [joinOrg, joinName, joinContact, joinIntro].forEach((field) => {
      if (field) field.classList.remove('is-invalid');
    });
  }

  function openJoinModal() {
    if (!joinModal) return;
    lastJoinFocus = doc.activeElement;
    resetJoinState();
    joinModal.classList.add('open');
    joinModal.setAttribute('aria-hidden', 'false');
    doc.body.classList.add('join-open');
    smooth.running = false;
    smooth.target = smooth.current = window.scrollY;
    const focusJoin = () => {
      if (!joinModal.classList.contains('open') || !joinOrg) return;
      try { joinOrg.focus({ preventScroll: true }); } catch (error) { joinOrg.focus(); }
    };
    requestAnimationFrame(focusJoin);
    window.setTimeout(focusJoin, 140);
    window.setTimeout(focusJoin, 480);
  }

  function closeJoinModal() {
    if (!joinModal) return;
    joinModal.classList.remove('open');
    joinModal.setAttribute('aria-hidden', 'true');
    doc.body.classList.remove('join-open');
    if (lastJoinFocus && typeof lastJoinFocus.focus === 'function') {
      try { lastJoinFocus.focus({ preventScroll: true }); } catch (error) { lastJoinFocus.focus(); }
    }
  }

  if (applyButton) applyButton.addEventListener('click', openJoinModal);
  if (registerButton) registerButton.addEventListener('click', openJoinModal);
  if (joinClose) joinClose.addEventListener('click', closeJoinModal);
  if (joinDone) joinDone.addEventListener('click', closeJoinModal);

  if (joinModal) {
    joinModal.addEventListener('click', (event) => {
      if (event.target === joinModal) closeJoinModal();
    });
    joinModal.addEventListener('keydown', (event) => {
      if (event.key !== 'Tab' || !joinModal.classList.contains('open')) return;
      const focusable = Array.from(joinModal.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]'
      )).filter((el) => el.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && doc.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && doc.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  }

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && joinModal && joinModal.classList.contains('open')) {
      closeJoinModal();
    }
  });

  if (joinForm) {
    joinForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const fields = [
        { el: joinOrg, value: joinOrg ? joinOrg.value.trim() : '' },
        { el: joinName, value: joinName ? joinName.value.trim() : '' },
        { el: joinContact, value: joinContact ? joinContact.value.trim() : '' }
      ];
      const missing = fields.find((field) => !field.value);
      if (missing) {
        if (missing.el) {
          missing.el.classList.add('is-invalid');
          missing.el.focus({ preventScroll: true });
          window.setTimeout(() => missing.el.classList.remove('is-invalid'), 1400);
        }
        return;
      }

      const ref = 'XH-' + Date.now().toString(36).toUpperCase().slice(-6) + '-' + Math.floor(Math.random() * 90 + 10);
      const entry = {
        organization: fields[0].value,
        name: fields[1].value,
        contact: fields[2].value,
        intro: joinIntro ? joinIntro.value.trim() : '',
        ref,
        at: new Date().toISOString()
      };
      try {
        const raw = window.localStorage.getItem('xinghuan_partner_applications');
        const list = raw ? JSON.parse(raw) : [];
        list.push(entry);
        window.localStorage.setItem('xinghuan_partner_applications', JSON.stringify(list.slice(-30)));
      } catch (error) {
        console.warn('[星环] 入驻申请本地记录失败', error);
      }

      if (joinRef) joinRef.textContent = ref;
      if (joinFormView) joinFormView.hidden = true;
      if (joinSuccess) joinSuccess.hidden = false;
      if (joinDone) joinDone.focus({ preventScroll: true });
    });
  }

  [joinOrg, joinName, joinContact].forEach((field) => {
    if (!field) return;
    field.addEventListener('input', () => field.classList.remove('is-invalid'));
    field.addEventListener('change', () => field.classList.remove('is-invalid'));
  });

  /* =========================================================
     8. 尺寸变化
     ========================================================= */
  const handleResize = throttleRaf(() => {
    const vmin = Math.min(window.innerWidth, window.innerHeight);
    const ringNeedsResize = handleResize.lastVmin !== vmin;
    handleResize.lastVmin = vmin;
    resizeStars();
    if (ringNeedsResize) resizeRing();
    measureHero();
    applyScrollFX();
    if (!reduceMotion) drawStars(performance.now() / 1000, 0);
    if (reduceMotion) drawRing(0);
  });
  handleResize.lastVmin = Math.min(window.innerWidth, window.innerHeight);

  window.addEventListener('resize', handleResize, { passive: true });
  if (doc.fonts && doc.fonts.ready) {
    doc.fonts.ready.then(() => {
      measureHero();
      applyScrollFX();
    });
  }

  /* =========================================================
     9. 主循环
     ========================================================= */
  let last = performance.now();
  let elapsed = 0;

  function loop(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    elapsed += dt;

    if (!doc.hidden) {
      drawStars(elapsed, dt);
      if (!reduceMotion && (window.scrollY || 0) < heroHeightCache * 1.1) {
        drawRing(elapsed);
      }
      updateCursor();
    }
    requestAnimationFrame(loop);
  }

  measureHero();
  resizeStars();
  resizeRing();
  setupReveal();
  applyScrollFX();
  drawStars(0, 0);
  drawRing(0);

  if (!reduceMotion) requestAnimationFrame(loop);
})();
