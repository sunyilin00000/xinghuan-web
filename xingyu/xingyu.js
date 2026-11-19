/* ============================================================================
 * 星屿 · Telescope Garden —— 星环教学中枢 · 学习资源内嵌版
 * 3D 模型 / 星表 / 天文算法源自 Telescope Garden 1.0.0（GPL-3.0）
 * 移植要点：零网络请求（模型与星表以 base64 内嵌），双击 index.html 即可运行
 * ==========================================================================*/
(function () {
  'use strict';
  if (window.Xingyu) return;

  /* ---------------------------------------------------------------- 0. 工具 */
  var TAU = Math.PI * 2, D2R = Math.PI / 180, R2D = 180 / Math.PI;
  function fposmod(a, b) { var r = a % b; return r < 0 ? r + b : r; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function fmtDeg(v) { return (v >= 0 ? '+' : '') + v.toFixed(1) + '°'; }

  /* ------------------------------------------------------- 1. 天文计算移植 */
  /* 坐标系约定与 astronomy.gd 完全一致：球面直角坐标里 z 轴指向天极，
     (x,y,z) = (cosδcosα, cosδsinα, sinδ)；地平坐标 +X 东、+Y 天顶、-Z 北。 */
  var DATA = null;
  function ensureData() {
    if (DATA) return DATA;
    if (!window.XY_DATA) throw new Error('星表数据未加载');
    DATA = window.XY_DATA;
    return DATA;
  }

  function jd(utc) { return utc / 86400 + 2440587.5; }

  function gmst(utc) {
    var days = jd(utc) - 2451545.0;
    var t = days / 36525.0;
    return fposmod(280.46061837 + 360.98564736629 * days + 0.000387933 * t * t - t * t * t / 38710000.0, 360.0) * D2R;
  }
  function lst(utc, site) { return fposmod(gmst(utc) + site.lon * D2R, TAU); }

  function matMul(A, B) {
    var C = new Array(9);
    for (var r = 0; r < 3; r++) {
      for (var c = 0; c < 3; c++) {
        C[r * 3 + c] = A[r * 3] * B[c] + A[r * 3 + 1] * B[3 + c] + A[r * 3 + 2] * B[6 + c];
      }
    }
    return C;
  }
  function matApply(M, v) {
    return {
      x: M[0] * v.x + M[1] * v.y + M[2] * v.z,
      y: M[3] * v.x + M[4] * v.y + M[5] * v.z,
      z: M[6] * v.x + M[7] * v.y + M[8] * v.z
    };
  }
  function basisCols(c0, c1, c2) {
    return [c0.x, c1.x, c2.x, c0.y, c1.y, c2.y, c0.z, c1.z, c2.z];
  }
  function rotZ(a) { var c = Math.cos(a), s = Math.sin(a); return [c, -s, 0, s, c, 0, 0, 0, 1]; }
  function rotY(a) { var c = Math.cos(a), s = Math.sin(a); return [c, 0, s, 0, 1, 0, -s, 0, c]; }

  function precession(utc) {
    var t = (jd(utc) - 2451545.0) / 36525.0;
    var zeta = ((2306.2181 * t + 0.30188 * t * t + 0.017998 * t * t * t) / 3600.0) * D2R;
    var z = ((2306.2181 * t + 1.09468 * t * t + 0.018203 * t * t * t) / 3600.0) * D2R;
    var theta = ((2004.3109 * t - 0.42665 * t * t - 0.041833 * t * t * t) / 3600.0) * D2R;
    return matMul(matMul(rotZ(zeta), rotY(-theta)), rotZ(z));
  }

  function horizontalBasis(utc, site) {
    var L = lst(utc, site), p = site.lat * D2R;
    var sp = Math.sin(p), cp = Math.cos(p), sl = Math.sin(L), cl = Math.cos(L);
    return basisCols(
      { x: -sl, y: cp * cl, z: sp * cl },
      { x: cl, y: cp * sl, z: sp * sl },
      { x: 0, y: sp, z: -cp }
    );
  }

  function equatorial(ra, dec) {
    var cd = Math.cos(dec);
    return { x: cd * Math.cos(ra), y: cd * Math.sin(ra), z: Math.sin(dec) };
  }

  function sunEquatorial(utc) {
    var n = jd(utc) - 2451545.0;
    var meanLong = fposmod(280.460 + 0.9856474 * n, 360) * D2R;
    var anomaly = fposmod(357.528 + 0.9856003 * n, 360) * D2R;
    var longitude = meanLong + 1.915 * D2R * Math.sin(anomaly) + 0.020 * D2R * Math.sin(2 * anomaly);
    var eps = (23.439 - 0.0000004 * n) * D2R;
    return { x: Math.cos(longitude), y: Math.cos(eps) * Math.sin(longitude), z: Math.sin(eps) * Math.sin(longitude) };
  }

  function sunDistanceAu(utc) {
    var g = fposmod(357.528 + 0.9856003 * (jd(utc) - 2451545.0), 360) * D2R;
    return 1.00014 - 0.01671 * Math.cos(g) - 0.00014 * Math.cos(2 * g);
  }

  function obliquity(utc) {
    var t = (jd(utc) - 2451545.0) / 36525.0;
    return (23.43929111 - (46.8150 * t + 0.00059 * t * t - 0.001813 * t * t * t) / 3600.0) * D2R;
  }

  var MOON_RADIUS_KM = 1737.4, EARTH_RADIUS_KM = 6378.14, AU_KM = 149597870.7;

  function moonCoordinates(utc) {
    ensureData();
    var days = jd(utc) - 2451545.0, t = days / 36525.0;
    var meanLongitude = fposmod(218.3164477 + 481267.88123421 * t - 0.0015786 * t * t + t * t * t / 538841.0 - t * t * t * t / 65194000.0, 360.0);
    var elongation = fposmod(297.8501921 + 445267.1114034 * t - 0.0018819 * t * t + t * t * t / 545868.0 - t * t * t * t / 113065000.0, 360.0);
    var anomaly = fposmod(357.5291092 + 35999.0502909 * t - 0.0001536 * t * t + t * t * t / 24490000.0, 360.0);
    var lunarAnomaly = fposmod(134.9633964 + 477198.8675055 * t + 0.0087414 * t * t + t * t * t / 69699.0 - t * t * t * t / 14712000.0, 360.0);
    var argument = fposmod(93.2720950 + 483202.0175233 * t - 0.0036539 * t * t - t * t * t / 3526000.0 + t * t * t * t / 863310000.0, 360.0);
    var a1 = fposmod(119.75 + 131.849 * t, 360.0) * D2R;
    var a2 = fposmod(53.09 + 479264.290 * t, 360.0) * D2R;
    var a3 = fposmod(313.45 + 481266.484 * t, 360.0) * D2R;
    var ecc = 1.0 - 0.002516 * t - 0.0000074 * t * t;
    var d = elongation * D2R, m = anomaly * D2R, mp = lunarAnomaly * D2R, f = argument * D2R;
    var longitude = 0, distance = 0, i, row, power, weight, angle;
    var LR = DATA.moonLr, B = DATA.moonB;
    for (i = 0; i < LR.length; i++) {
      row = LR[i]; power = Math.abs(row[1]);
      weight = power === 1 ? ecc : (power === 2 ? ecc * ecc : 1.0);
      angle = row[0] * d + row[1] * m + row[2] * mp + row[3] * f;
      longitude += row[4] * weight * Math.sin(angle);
      distance += row[5] * weight * Math.cos(angle);
    }
    var latitude = 0;
    for (i = 0; i < B.length; i++) {
      row = B[i]; power = Math.abs(row[1]);
      weight = power === 1 ? ecc : (power === 2 ? ecc * ecc : 1.0);
      latitude += row[4] * weight * Math.sin(row[0] * d + row[1] * m + row[2] * mp + row[3] * f);
    }
    var lp = meanLongitude * D2R;
    longitude += 3958.0 * Math.sin(a1) + 1962.0 * Math.sin(lp - f) + 318.0 * Math.sin(a2);
    latitude += -2235.0 * Math.sin(lp) + 382.0 * Math.sin(a3) + 175.0 * Math.sin(a1 - f) + 175.0 * Math.sin(a1 + f) + 127.0 * Math.sin(lp - mp) - 115.0 * Math.sin(lp + mp);
    return { longitude: lp + (longitude / 1000000.0) * D2R, latitude: (latitude / 1000000.0) * D2R, distance: 385000.56 + distance / 1000.0 };
  }

  function moonEquatorial(utc) {
    var moon = moonCoordinates(utc), eps = obliquity(utc);
    var lo = moon.longitude, la = moon.latitude;
    var cl = Math.cos(la), sl = Math.sin(la);
    return {
      vector: {
        x: cl * Math.cos(lo),
        y: cl * Math.sin(lo) * Math.cos(eps) - sl * Math.sin(eps),
        z: cl * Math.sin(lo) * Math.sin(eps) + sl * Math.cos(eps)
      },
      distance: moon.distance
    };
  }

  function moonTopocentric(utc, site) {
    var geo = moonEquatorial(utc), lat = site.lat * D2R;
    var u = Math.atan(0.99664719 * Math.tan(lat));
    var theta = lst(utc, site);
    var obs = {
      x: Math.cos(u) * Math.cos(theta) * EARTH_RADIUS_KM,
      y: Math.cos(u) * Math.sin(theta) * EARTH_RADIUS_KM,
      z: 0.99664719 * Math.sin(u) * EARTH_RADIUS_KM
    };
    var p = {
      x: geo.vector.x * geo.distance - obs.x,
      y: geo.vector.y * geo.distance - obs.y,
      z: geo.vector.z * geo.distance - obs.z
    };
    var dist = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z);
    return { vector: { x: p.x / dist, y: p.y / dist, z: p.z / dist }, distance: dist };
  }

  function moonPhase(utc) {
    var moon = moonEquatorial(utc), sun = sunEquatorial(utc);
    var moonDistance = moon.distance, sunDistance = sunDistanceAu(utc) * AU_KM;
    var elongation = Math.acos(clamp(moon.vector.x * sun.x + moon.vector.y * sun.y + moon.vector.z * sun.z, -1, 1));
    var triangle = Math.sqrt(sunDistance * sunDistance + moonDistance * moonDistance - 2 * sunDistance * moonDistance * Math.cos(elongation));
    var phaseAngle = Math.acos(clamp((moonDistance - sunDistance * Math.cos(elongation)) / triangle, -1, 1));
    return { illumination: (1 + Math.cos(phaseAngle)) * 0.5, phaseAngle: phaseAngle, elongation: elongation };
  }

  function toHorizontal(vec, M) {
    var h = matApply(M, vec);
    return {
      alt: Math.asin(clamp(h.y, -1, 1)) * R2D,
      az: fposmod(Math.atan2(h.x, -h.z) * R2D, 360),
      dir: h
    };
  }

  function tzOffsetSeconds(utc, site) {
    var table = DATA.zones[site.tz];
    if (!table || !table.length) return Math.round(site.utcOff * 3600);
    var answer = table[0][1];
    for (var i = 0; i < table.length; i++) {
      if (table[i][0] > utc) break;
      answer = table[i][1];
    }
    return answer;
  }
  function localParts(utc, site) {
    var d = new Date((utc + tzOffsetSeconds(utc, site)) * 1000);
    return {
      date: d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate()),
      time: pad2(d.getUTCHours()) + ':' + pad2(d.getUTCMinutes())
    };
  }

  /* ------------------------------------------------------------- 2. 状态 */
  var S = {
    booted: false, open: false, loading: false,
    utcBase: Date.now() / 1000, wallBase: Date.now() / 1000, speed: 60,
    siteIndex: 0, targetIndex: 0,
    scope: 'refractor', camera: 'dslr', guideOn: true,
    frames: 0, integrationSec: 0, exposureAccum: 0,
    pointingMode: 'auto',
    slew: { az: 0, alt: 0, init: false }
  };

  function site() { return DATA.sites[S.siteIndex]; }
  function target() { return DATA.targets[S.targetIndex]; }
  function simUtc() { return S.utcBase + (Date.now() / 1000 - S.wallBase) * S.speed; }

  /* --------------------------------------------------------- 3. 三维场景 */
  var THREE = null, renderer = null, scene = null, camera = null, controls = null;
  var skyRig = null, starPoints = null, targetPoints = null, reticle = null, skyDomeMat = null;
  var rig = null, head = null, altPivot = null, otaGroup = null, platformModel = null;
  var modelData = {};
  var sunLight = null, moonLight = null, hemi = null, fillLight = null;
  var lastT = 0, chartTimer = 0, resizeBound = false;

  var SCOPE_SPEC = {
    refractor: { model: 'scope_refractor', dovetailBottom: -0.23, rearZ: 0.49, topY: 0.30 },
    sct: { model: 'scope_sct', dovetailBottom: -0.32, rearZ: 0.45, topY: 0.27 },
    newton: { model: 'scope_newton', dovetailBottom: -0.353, rearZ: 0.40, topY: 0.33 }
  };

  function base64ToBuffer(b64) {
    var bin = atob(b64), len = bin.length, bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  }

  function loadModels(cb) {
    var names = {
      platform: 'platform', mountBase: 'mountBase', mountRa: 'mountRa', mountDec: 'mountDec',
      scope_refractor: 'scopeRefractor', scope_sct: 'scopeSct', scope_newton: 'scopeNewton',
      camera_dslr: 'cameraDslr', camera_cooled: 'cameraCooled', guide: 'guide'
    };
    var keys = Object.keys(names), pending = keys.length, failed = 0;
    var loader = new THREE.GLTFLoader();
    keys.forEach(function (key) {
      var entry = window.XY_MODELS[names[key]];
      if (!entry) { failed++; if (--pending === 0) cb(failed); return; }
      loader.parse(base64ToBuffer(entry.b64), '', function (gltf) {
        modelData[key] = gltf.scene;
        if (--pending === 0) cb(failed);
      }, function (e) {
        console.error('[星屿] 模型解析失败 ' + key, e);
        failed++;
        if (--pending === 0) cb(failed);
      });
    });
  }

  function prepModel(obj) {
    obj.traverse(function (o) {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        if (o.material) {
          if (o.material.metalness !== undefined && o.material.metalness > 0.85) o.material.metalness = 0.85;
          if (o.material.roughness !== undefined && o.material.roughness < 0.18) o.material.roughness = 0.22;
        }
      }
    });
    return obj;
  }
  function cloneModel(key) {
    var src = modelData[key];
    if (!src) return null;
    return prepModel(src.clone(true));
  }

  /* 在指定父级局部坐标下量取包围盒（父级可能带旋转） */
  function localBox(obj, parent) {
    obj.updateWorldMatrix(true, true);
    var b = new THREE.Box3().setFromObject(obj);
    if (parent) {
      var m = new THREE.Matrix4().copy(parent.matrixWorld).invert();
      b.applyMatrix4(m);
    }
    return b;
  }

  function buildScene() {
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05070d, 0.018);

    skyRig = new THREE.Group();
    skyRig.matrixAutoUpdate = false;
    scene.add(skyRig);

    buildSkyDome();
    buildStars();
    buildTargetMarkers();

    hemi = new THREE.HemisphereLight(0x2a3a55, 0x090a0e, 0.45);
    scene.add(hemi);

    sunLight = new THREE.DirectionalLight(0xffe6c0, 1.2);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(2048, 2048);
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 26;
    sunLight.shadow.camera.left = -3.5;
    sunLight.shadow.camera.right = 3.5;
    sunLight.shadow.camera.top = 3.5;
    sunLight.shadow.camera.bottom = -3.5;
    sunLight.shadow.bias = -0.0007;
    sunLight.shadow.radius = 2;
    scene.add(sunLight);
    scene.add(sunLight.target);

    moonLight = new THREE.DirectionalLight(0x9fb6d8, 0);
    scene.add(moonLight);

    fillLight = new THREE.PointLight(0x6f9fd0, 0.45, 14);
    fillLight.position.set(-1.8, 1.7, 2.2);
    scene.add(fillLight);

    /* 浮空岛平台：台面 y≈0 */
    var platform = cloneModel('platform');
    if (platform) {
      platform.position.y = 0;
      platformModel = platform;
      scene.add(platform);
    }

    rig = new THREE.Group();
    rig.position.set(0.12, 0, 0.05);
    scene.add(rig);

    /* 立柱：把赤道仪抬到台面之上，保证低高度时镜筒尾端不会插进地里 */
    var PIER_H = 0.42;
    var metalMat = new THREE.MeshStandardMaterial({ color: 0x1b1f26, metalness: 0.88, roughness: 0.34 });
    var pier = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.105, PIER_H, 28, 1), metalMat);
    pier.position.y = PIER_H / 2;
    pier.castShadow = true;
    pier.receiveShadow = true;
    rig.add(pier);
    var footPlate = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.028, 32), metalMat);
    footPlate.position.y = 0.014;
    footPlate.castShadow = true;
    footPlate.receiveShadow = true;
    rig.add(footPlate);

    var stack = new THREE.Group();
    stack.position.y = PIER_H;
    rig.add(stack);

    /* 底座：底面贴在立柱顶端 */
    var baseModel = cloneModel('mountBase');
    var baseTop = 0.33;
    if (baseModel) {
      stack.add(baseModel);
      var bb = localBox(baseModel, stack);
      baseModel.position.y = -bb.min.y;
      bb = localBox(baseModel, stack);
      baseTop = bb.max.y;
    }

    head = new THREE.Group();
    head.position.y = baseTop - 0.055;
    stack.add(head);

    var raModel = cloneModel('mountRa');
    if (raModel) head.add(raModel);

    /* DEC 部件：绕 Z 转 -90°，把 +X 侧的鞍座翻到朝上 */
    altPivot = new THREE.Group();
    altPivot.position.set(0, 0, 0);
    head.add(altPivot);

    var decMount = new THREE.Group();
    decMount.rotation.z = -Math.PI / 2;
    altPivot.add(decMount);

    var decModel = cloneModel('mountDec');
    if (decModel) {
      decMount.add(decModel);
      decMount.updateWorldMatrix(true, true);
      var db = localBox(decMount, altPivot);
      /* 让鞍座顶面落在 altPivot 原点，镜筒燕尾板正好坐上去 */
      altPivot.position.y = db.max.y;
    } else {
      altPivot.position.y = 0.2;
    }

    otaGroup = new THREE.Group();
    altPivot.add(otaGroup);

    raf = requestAnimationFrame(loop);
  }

  var raf = 0;

  function buildSkyDome() {
    var geo = new THREE.SphereGeometry(70, 32, 24);
    skyDomeMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: {
        uSunDir: { value: new THREE.Vector3(0, 1, 0) },
        uTop: { value: new THREE.Color(0x05070d) },
        uBottom: { value: new THREE.Color(0x0b1018) },
        uGlow: { value: new THREE.Color(0x101a2a) }
      },
      vertexShader: [
        'varying vec3 vDir;',
        'void main() {',
        '  vDir = normalize(position);',
        '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
        '}'
      ].join('\n'),
      fragmentShader: [
        'uniform vec3 uSunDir; uniform vec3 uTop; uniform vec3 uBottom; uniform vec3 uGlow;',
        'varying vec3 vDir;',
        'void main() {',
        '  float h = clamp(vDir.y, -1.0, 1.0);',
        '  vec3 col = mix(uBottom, uTop, pow(clamp(h, 0.0, 1.0), 0.55));',
        '  float band = exp(-pow((h - 0.02) * 6.0, 2.0));',
        '  col += uGlow * band * 0.85;',
        '  float sd = max(dot(normalize(vDir), normalize(uSunDir)), 0.0);',
        '  col += uGlow * pow(sd, 8.0) * 0.6;',
        '  if (h < 0.0) col *= 0.45;',
        '  gl_FragColor = vec4(col, 1.0);',
        '}'
      ].join('\n')
    });
    var dome = new THREE.Mesh(geo, skyDomeMat);
    dome.frustumCulled = false;
    skyRig.add(dome);
  }

  /* 程序化星空：随机星 + 银河带（按银道纬度做拒绝采样） */
  function buildStars() {
    var N = 2600, M = 1500, R = 60;
    var pos = new Float32Array((N + M) * 3);
    var col = new Float32Array((N + M) * 3);
    var size = new Float32Array(N + M);

    function place(i, ra, dec, mag) {
      var v = equatorial(ra, dec);
      pos[i * 3] = v.x * R; pos[i * 3 + 1] = v.y * R; pos[i * 3 + 2] = v.z * R;
      var bv = Math.random();
      var c = bv < 0.12 ? [0.74, 0.84, 1.0] : (bv > 0.86 ? [1.0, 0.84, 0.64] : [0.96, 0.97, 1.0]);
      col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
      var bright = clamp((6.0 - mag) / 6.0, 0, 1);
      size[i] = 0.7 + bright * 2.6 * (0.6 + Math.random() * 0.7);
    }

    for (var i = 0; i < N; i++) {
      var ra = Math.random() * TAU;
      var dec = Math.asin(2 * Math.random() - 1);
      place(i, ra, dec, 0.2 + Math.pow(Math.random(), 2.6) * 6.0);
    }

    /* 银道坐标 → 赤道坐标：拒绝采样保留 |b| 小的样本 */
    var aGP = 192.85948 * D2R, dGP = 27.12825 * D2R;
    var count = 0, guard = 0;
    while (count < M && guard < M * 60) {
      guard++;
      var ra2 = Math.random() * TAU;
      var dec2 = Math.asin(2 * Math.random() - 1);
      var b = Math.asin(clamp(
        Math.sin(dec2) * Math.sin(dGP) + Math.cos(dec2) * Math.cos(dGP) * Math.cos(ra2 - aGP), -1, 1));
      var lim = 0.14 * (0.35 + Math.random() * 0.65);
      if (Math.abs(b) > lim) continue;
      place(N + count, ra2, dec2, 4.6 + Math.random() * 1.7);
      count++;
    }

    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));

    var mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
      uniforms: { uPR: { value: Math.min(window.devicePixelRatio || 1, 2) }, uOpacity: { value: 1 } },
      vertexShader: [
        'attribute float aSize; attribute vec3 aColor;',
        'varying vec3 vColor; varying float vSize;',
        'uniform float uPR;',
        'void main() {',
        '  vColor = aColor; vSize = aSize;',
        '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
        '  gl_PointSize = aSize * uPR * 1.7;',
        '  gl_Position = projectionMatrix * mv;',
        '}'
      ].join('\n'),
      fragmentShader: [
        'varying vec3 vColor; uniform float uOpacity;',
        'void main() {',
        '  vec2 d = gl_PointCoord - vec2(0.5);',
        '  float r = length(d);',
        '  if (r > 0.5) discard;',
        '  float a = smoothstep(0.5, 0.0, r);',
        '  gl_FragColor = vec4(vColor * a, a * uOpacity);',
        '}'
      ].join('\n')
    });
    starPoints = new THREE.Points(geo, mat);
    starPoints.frustumCulled = false;
    skyRig.add(starPoints);
  }

  /* 190 个真实目标 */
  function buildTargetMarkers() {
    var list = DATA.targets, R = 58;
    var pos = new Float32Array(list.length * 3);
    var col = new Float32Array(list.length * 3);
    var palette = {
      galaxy: [0.68, 0.78, 1.0],
      nebula: [1.0, 0.64, 0.70],
      cluster: [1.0, 0.87, 0.60],
      other: [0.66, 0.92, 0.80]
    };
    list.forEach(function (t, i) {
      var v = equatorial(t.ra * D2R, t.dec * D2R);
      pos[i * 3] = v.x * R; pos[i * 3 + 1] = v.y * R; pos[i * 3 + 2] = v.z * R;
      var c = palette[t.cat] || palette.other;
      col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
    });
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    targetPoints = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.62, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false, fog: false
    }));
    targetPoints.frustumCulled = false;
    skyRig.add(targetPoints);

    reticle = new THREE.Mesh(
      new THREE.SphereGeometry(0.85, 14, 10),
      new THREE.MeshBasicMaterial({ color: 0xebe0cc, wireframe: true, transparent: true, opacity: 0.5, fog: false })
    );
    reticle.visible = false;
    skyRig.add(reticle);
  }

  function rebuildOTA() {
    if (!otaGroup) return;
    while (otaGroup.children.length) otaGroup.remove(otaGroup.children[0]);

    var spec = SCOPE_SPEC[S.scope] || SCOPE_SPEC.refractor;
    var scope = cloneModel(spec.model);
    if (!scope) return;
    scope.position.set(0, -spec.dovetailBottom, 0);
    otaGroup.add(scope);

    var cam = cloneModel(S.camera === 'cooled' ? 'camera_cooled' : 'camera_dslr');
    if (cam) {
      cam.position.set(0, -spec.dovetailBottom, spec.rearZ + 0.12);
      cam.rotation.y = Math.PI;
      otaGroup.add(cam);
    }

    if (S.guideOn) {
      var g = cloneModel('guide');
      if (g) {
        g.position.set(0.03, -spec.dovetailBottom + spec.topY + 0.19, 0.08);
        otaGroup.add(g);
      }
    }
  }

  /* 镜筒前镜片在 -Z：head 绕 Y = -方位角，altPivot 绕 X = +高度角 */
  function setPointing(azDeg, altDeg) {
    if (!head || !altPivot) return;
    head.rotation.y = -azDeg * D2R;
    altPivot.rotation.x = clamp(altDeg, -4, 89) * D2R;
  }

  /* ------------------------------------------------------------- 4. 主循环 */
  function loop(t) {
    raf = requestAnimationFrame(loop);
    var dt = lastT ? Math.min((t - lastT) / 1000, 0.1) : 0.016;
    lastT = t;
    try { tick(dt); } catch (e) { console.error('[星屿] 帧错误', e); }
    if (renderer && scene && camera) renderer.render(scene, camera);
  }

  function lerpAngle(a, b, f) {
    var d = ((b - a + 540) % 360) - 180;
    return fposmod(a + d * Math.min(f, 1), 360);
  }

  function tick(dt) {
    var utc = simUtc(), st = site();
    var Mh = horizontalBasis(utc, st);
    var Msky = matMul(Mh, precession(utc));

    skyRig.matrix.set(
      Msky[0], Msky[1], Msky[2], 0,
      Msky[3], Msky[4], Msky[5], 0,
      Msky[6], Msky[7], Msky[8], 0,
      0, 0, 0, 1
    );
    skyRig.matrixWorldNeedsUpdate = true;

    var sunH = toHorizontal(sunEquatorial(utc), Mh);
    var moonH = toHorizontal(moonTopocentric(utc, st).vector, Mh);
    var phase = moonPhase(utc);
    updateSkyLook(sunH, moonH, phase);

    var tgt = target();
    var tH = tgt ? toHorizontal(equatorial(tgt.ra * D2R, tgt.dec * D2R), Msky) : null;

    if (tH) {
      var canTrack = tH.alt > 5;
      if (!S.slew.init) { S.slew.az = tH.az; S.slew.alt = Math.max(tH.alt, 0); S.slew.init = true; }

      if (S.pointingMode === 'parked') {
        S.slew.az = lerpAngle(S.slew.az, 0, dt * 2.5);
        S.slew.alt += (0 - S.slew.alt) * Math.min(dt * 2.5, 1);
      } else if (canTrack) {
        S.slew.az = lerpAngle(S.slew.az, tH.az, dt * 2.5);
        S.slew.alt += (tH.alt - S.slew.alt) * Math.min(dt * 2.5, 1);
      }
      setPointing(S.slew.az, S.slew.alt);

      reticle.visible = true;
      reticle.position.set(tH.dir.x * 56, tH.dir.y * 56, tH.dir.z * 56);

      if (S.pointingMode !== 'parked' && canTrack && sunH.alt < -18) {
        S.exposureAccum += dt * S.speed;
        while (S.exposureAccum >= 60) {
          S.exposureAccum -= 60;
          S.frames += 1;
          S.integrationSec += 60;
        }
      }
    }

    updateHud(utc, st, tH, sunH, moonH, phase);

    chartTimer += dt;
    if (chartTimer > 0.4) {
      chartTimer = 0;
      try { drawChart(utc, st, Msky, sunH, moonH); } catch (e) { /* 忽略画布异常 */ }
    }
    if (controls) controls.update();
  }

  function updateSkyLook(sunH, moonH, phase) {
    if (!skyDomeMat) return;
    var sunAlt = sunH.alt;
    var day = clamp((sunAlt + 4) / 14, 0, 1);
    var night = clamp((-sunAlt - 2) / 10, 0, 1);

    var zenith = new THREE.Color(0x05070d);
    var horizon = new THREE.Color(0x0a0f18);
    var glow = new THREE.Color(0x0d1626);

    if (day > 0) {
      zenith.lerp(new THREE.Color(0x2b4d76), day * 0.9);
      horizon.lerp(new THREE.Color(0x7c8f9f), day * 0.82);
      glow.lerp(new THREE.Color(0x9c7848), day * 0.85);
    }
    if (sunAlt > -18 && sunAlt < 8) {
      var tw = 1 - Math.abs(sunAlt + 5) / 13;
      horizon.lerp(new THREE.Color(0x8d5030), tw * 0.72);
      glow.lerp(new THREE.Color(0xb0703c), tw * 0.9);
    }
    if (night > 0) {
      zenith.lerp(new THREE.Color(0x04060b), night * 0.9);
      horizon.lerp(new THREE.Color(0x070b12), night * 0.9);
    }

    skyDomeMat.uniforms.uTop.value.copy(zenith);
    skyDomeMat.uniforms.uBottom.value.copy(horizon);
    skyDomeMat.uniforms.uGlow.value.copy(glow);
    skyDomeMat.uniforms.uSunDir.value.set(sunH.dir.x, sunH.dir.y, -sunH.dir.z);

    var sunI = clamp((sunAlt + 2) / 10, 0, 1);
    sunLight.intensity = 0.12 + sunI * 2.6;
    sunLight.position.set(sunH.dir.x * 11, Math.max(sunH.dir.y, 0.04) * 11, sunH.dir.z * 11);
    sunLight.color.setHSL(0.085, 0.30 + 0.35 * (1 - sunI), 0.60 + 0.22 * sunI);

    var moonI = clamp(moonH.alt / 28, 0, 1) * phase.illumination * (1 - sunI);
    moonLight.intensity = moonI * 0.6;
    moonLight.position.set(moonH.dir.x * 11, Math.max(moonH.dir.y, 0.04) * 11, moonH.dir.z * 11);

    hemi.intensity = 0.16 + sunI * 0.6;
    hemi.color.setHSL(0.58, 0.32, 0.20 + sunI * 0.36);
    hemi.groundColor.setHSL(0.07, 0.12, 0.04 + sunI * 0.07);

    if (starPoints) starPoints.material.uniforms.uOpacity.value = 0.10 + night * 0.9;
    if (targetPoints) targetPoints.material.opacity = 0.20 + night * 0.7;
    if (scene) scene.fog.color.setHSL(0.58, 0.22, 0.025 + sunI * 0.13);
    if (fillLight) fillLight.intensity = 0.18 + sunI * 0.4;
  }

  /* ---------------------------------------------------------------- 5. HUD */
  var hudEls = {};
  function updateHud(utc, st, tH, sunH, moonH, phase) {
    var lp = localParts(utc, st);
    if (hudEls.localTime) hudEls.localTime.textContent = lp.date + ' ' + lp.time;
    if (hudEls.lst) hudEls.lst.textContent = (lst(utc, st) * R2D / 15).toFixed(2) + ' h';
    if (hudEls.siteName) hudEls.siteName.textContent = st.name + ' · ' + st.lat.toFixed(2) + '°';
    if (hudEls.sunAlt) hudEls.sunAlt.textContent = fmtDeg(sunH.alt);
    if (hudEls.moon) hudEls.moon.textContent = (phase.illumination * 100).toFixed(0) + '% / ' + fmtDeg(moonH.alt);
    if (hudEls.frames) hudEls.frames.textContent = String(S.frames);
    if (hudEls.integration) hudEls.integration.textContent = (S.integrationSec / 3600).toFixed(2) + ' h';

    var tgt = target();
    if (!tgt) return;
    if (hudEls.tName) hudEls.tName.textContent = tgt.id + ' · ' + tgt.name;
    if (hudEls.tMeta) {
      hudEls.tMeta.textContent = (tgt.kind || '') + ' · ' + (tgt.con || '') +
        ' · RA ' + (tgt.ra / 15).toFixed(2) + 'h / DEC ' + fmtDeg(tgt.dec);
    }
    if (hudEls.tAlt) hudEls.tAlt.textContent = tH ? fmtDeg(tH.alt) : '--';
    if (hudEls.tAz) hudEls.tAz.textContent = tH ? tH.az.toFixed(1) + '°' : '--';

    var status, cls = 'xy-status';
    if (S.pointingMode === 'parked') status = '已归位 · 未跟踪';
    else if (!tH) status = '未选择目标';
    else if (sunH.alt >= -18) status = '天未黑 · 太阳需低于 -18°';
    else if (tH.alt <= 5) status = '目标在地平线下 · 需高于 5°';
    else { status = '跟踪中 · 每帧 60 秒模拟曝光'; cls += ' ok'; }
    if (hudEls.status) { hudEls.status.textContent = status; hudEls.status.className = cls; }
  }

  /* ------------------------------------------------------------ 6. 全天星图 */
  function drawChart(utc, st, Msky, sunH, moonH) {
    var cv = hudEls.chart;
    if (!cv) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
    }
    var g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);

    var cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 10;

    function proj(alt, az) {
      if (alt <= 0) return null;
      var r = Math.tan((90 - alt) * D2R / 2) * R;
      var a = az * D2R;
      return { x: cx + r * Math.sin(a), y: cy - r * Math.cos(a) };
    }

    g.strokeStyle = 'rgba(212,196,168,0.30)';
    g.lineWidth = 1;
    g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.stroke();

    g.strokeStyle = 'rgba(212,196,168,0.10)';
    [30, 60].forEach(function (alt) {
      g.beginPath(); g.arc(cx, cy, Math.tan((90 - alt) * D2R / 2) * R, 0, TAU); g.stroke();
    });
    g.beginPath();
    g.moveTo(cx - R, cy); g.lineTo(cx + R, cy);
    g.moveTo(cx, cy - R); g.lineTo(cx, cy + R);
    g.stroke();

    g.fillStyle = 'rgba(146,160,175,0.85)';
    g.font = '10px "PingFang SC", sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    [['N', 0, -1], ['E', 1, 0], ['S', 0, 1], ['W', -1, 0]].forEach(function (d) {
      g.fillText(d[0], cx + d[1] * (R + 6), cy + d[2] * (R + 6));
    });

    function trace(fn, color) {
      g.beginPath();
      var started = false;
      for (var k = 0; k <= 288; k++) {
        var res = fn(utc + k * 300);
        if (res.alt <= 0) { started = false; continue; }
        var p = proj(res.alt, res.az);
        if (!p) { started = false; continue; }
        if (!started) { g.moveTo(p.x, p.y); started = true; } else g.lineTo(p.x, p.y);
      }
      g.strokeStyle = color; g.lineWidth = 1.2; g.stroke();
    }
    trace(function (t2) { return toHorizontal(sunEquatorial(t2), horizontalBasis(t2, st)); }, 'rgba(240,190,120,0.42)');
    trace(function (t2) { return toHorizontal(moonTopocentric(t2, st).vector, horizontalBasis(t2, st)); }, 'rgba(160,190,230,0.32)');

    var palette = { galaxy: '#9fc4ff', nebula: '#ff9fb0', cluster: '#ffdd94', other: '#9fe8c8' };
    DATA.targets.forEach(function (t, i) {
      var res = toHorizontal(equatorial(t.ra * D2R, t.dec * D2R), Msky);
      if (res.alt <= 1) return;
      var p = proj(res.alt, res.az);
      if (!p) return;
      var isSel = i === S.targetIndex;
      g.fillStyle = palette[t.cat] || palette.other;
      g.globalAlpha = isSel ? 1 : 0.5;
      g.beginPath(); g.arc(p.x, p.y, isSel ? 3.6 : 1.8, 0, TAU); g.fill();
      g.globalAlpha = 1;
      if (isSel) {
        g.strokeStyle = '#ebe0cc'; g.lineWidth = 1.4;
        g.beginPath(); g.arc(p.x, p.y, 7, 0, TAU); g.stroke();
        g.fillStyle = '#ebe0cc';
        g.textAlign = 'center';
        g.fillText(t.id, p.x, p.y - 13);
      }
    });

    if (sunH.alt > 0) {
      var ps = proj(sunH.alt, sunH.az);
      if (ps) { g.fillStyle = '#ffd493'; g.beginPath(); g.arc(ps.x, ps.y, 5, 0, TAU); g.fill(); }
    }
    if (moonH.alt > 0) {
      var pm = proj(moonH.alt, moonH.az);
      if (pm) { g.fillStyle = '#cfe0f5'; g.beginPath(); g.arc(pm.x, pm.y, 4, 0, TAU); g.fill(); }
    }
  }

  /* ---------------------------------------------------------------- 7. UI */
  function buildCard() {
    var host = $('resourcesPage');
    if (!host || $('xyCard')) return;
    var card = el('div', 'xy-card');
    card.id = 'xyCard';
    card.innerHTML = [
      '<div class="xy-card-visual">',
      '  <div class="xy-card-glow"></div>',
      '  <div class="xy-orbit"><i></i><i></i><i></i></div>',
      '  <div class="xy-card-badge">3D · 实时天文</div>',
      '</div>',
      '<div class="xy-card-body">',
      '  <div class="xy-card-eyebrow">TELESCOPE GARDEN · 星屿</div>',
      '  <h3 class="xy-card-title">在浏览器里，养一座小小的天文台</h3>',
      '  <p class="xy-card-desc">用 Telescope Garden 的原版 3D 设备模型装配望远镜，选一处观测地，让它在真实计算出的天空下转向、跟踪、等天亮。190 个真实天体、6 个观测站、日月位置与月相全部来自星历计算。</p>',
      '  <div class="xy-card-tags"><span>原版 3D 模型</span><span>真实星表</span><span>GMST / 月相</span><span>离线可用</span></div>',
      '  <div class="xy-card-actions">',
      '    <button type="button" class="xy-btn xy-btn-primary" id="xyOpen">进入星屿</button>',
      '    <span class="xy-card-note">无需登录 · 不需要云函数</span>',
      '  </div>',
      '</div>'
    ].join('\n');
    var header = host.querySelector('.panel-head');
    if (header && header.nextSibling) host.insertBefore(card, header.nextSibling);
    else host.appendChild(card);
    $('xyOpen').addEventListener('click', open);
  }

  function buildOverlay() {
    if ($('xyRoot')) return;
    var root = el('div', 'xy-root');
    root.id = 'xyRoot';
    root.innerHTML = [
      '<div class="xy-shell">',
      '  <header class="xy-top">',
      '    <div class="xy-brand"><span class="xy-brand-mark"></span>',
      '      <span class="xy-brand-text"><b>星屿 · Telescope Garden</b><i>学习资源 · 实时天象</i></span>',
      '    </div>',
      '    <div class="xy-top-right">',
      '      <span class="xy-pill" id="xyStatusPill">待机</span>',
      '      <button type="button" class="xy-icon-btn" id="xyClose" title="关闭">✕</button>',
      '    </div>',
      '  </header>',
      '  <div class="xy-main">',
      '    <div class="xy-stage" id="xyStage">',
      '      <canvas id="xyCanvas"></canvas>',
      '      <div class="xy-stage-hint">拖动旋转 · 滚轮缩放 · 右键平移</div>',
      '      <div class="xy-hud">',
      '        <div class="xy-hud-row"><span>本地时间</span><b id="xyLocalTime">--</b></div>',
      '        <div class="xy-hud-row"><span>恒星时</span><b id="xyLst">--</b></div>',
      '        <div class="xy-hud-row"><span>观测地</span><b id="xySiteName">--</b></div>',
      '        <div class="xy-hud-row"><span>太阳高度</span><b id="xySunAlt">--</b></div>',
      '        <div class="xy-hud-row"><span>月亮 亮度 / 高度</span><b id="xyMoon">--</b></div>',
      '        <div class="xy-hud-row"><span>曝光帧</span><b id="xyFrames">0</b></div>',
      '        <div class="xy-hud-row"><span>累计积分</span><b id="xyIntegration">0.00 h</b></div>',
      '      </div>',
      '      <div class="xy-target-banner">',
      '        <div class="xy-tb-id" id="xyTName">--</div>',
      '        <div class="xy-tb-meta" id="xyTMeta">--</div>',
      '        <div class="xy-tb-metrics"><span>高度 <b id="xyTAlt">--</b></span><span>方位 <b id="xyTAz">--</b></span></div>',
      '        <div class="xy-status" id="xyTStatus">待机</div>',
      '      </div>',
      '      <div class="xy-transport">',
      '        <button type="button" class="xy-btn" id="xyNight">前往夜晚</button>',
      '        <div class="xy-speeds" id="xySpeeds"></div>',
      '        <button type="button" class="xy-btn" id="xyPark">归位</button>',
      '        <button type="button" class="xy-btn" id="xyResume">继续</button>',
      '        <button type="button" class="xy-btn xy-btn-ghost" id="xyResetView">复位视角</button>',
      '      </div>',
      '    </div>',
      '    <aside class="xy-side">',
      '      <section class="xy-sec"><h4>观测地</h4><div class="xy-sites" id="xySites"></div></section>',
      '      <section class="xy-sec"><h4>目标 · 190 个真实天体</h4>',
      '        <input class="xy-input" id="xySearch" placeholder="搜索 M31 / 仙女 / NGC…" />',
      '        <div class="xy-chips" id="xyCats"></div>',
      '        <div class="xy-target-list" id="xyTargetList"></div>',
      '      </section>',
      '      <section class="xy-sec"><h4>装配</h4>',
      '        <div class="xy-field"><label>主镜</label><select id="xyScope"></select></div>',
      '        <div class="xy-field"><label>相机</label><select id="xyCamera"></select></div>',
      '        <div class="xy-field xy-field-inline"><label>导星镜</label><button type="button" class="xy-toggle on" id="xyGuide">开</button></div>',
      '      </section>',
      '      <section class="xy-sec"><h4>全天星图</h4>',
      '        <canvas id="xyChart" class="xy-chart"></canvas>',
      '        <p class="xy-hint">天顶为中心 · 外圈为地平线 · 橙线为太阳轨迹</p>',
      '      </section>',
      '      <section class="xy-sec xy-sec-about"><h4>关于</h4>',
      '        <p class="xy-hint">模型、星表与天文算法来自 Telescope Garden 1.0.0（GPL-3.0）。拍摄条件与桌面版一致：太阳低于地平线 18°、目标高于 5°，每帧 60 秒模拟曝光。</p>',
      '      </section>',
      '    </aside>',
      '  </div>',
      '</div>'
    ].join('\n');
    document.body.appendChild(root);
    $('xyClose').addEventListener('click', close);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && S.open) close();
    });
  }

  function bindUI() {
    hudEls.localTime = $('xyLocalTime');
    hudEls.lst = $('xyLst');
    hudEls.siteName = $('xySiteName');
    hudEls.sunAlt = $('xySunAlt');
    hudEls.moon = $('xyMoon');
    hudEls.frames = $('xyFrames');
    hudEls.integration = $('xyIntegration');
    hudEls.tName = $('xyTName');
    hudEls.tMeta = $('xyTMeta');
    hudEls.tAlt = $('xyTAlt');
    hudEls.tAz = $('xyTAz');
    hudEls.status = $('xyTStatus');
    hudEls.chart = $('xyChart');
    hudEls.statusPill = $('xyStatusPill');

    var sitesBox = $('xySites');
    DATA.sites.forEach(function (s, i) {
      var b = el('button', 'xy-site' + (i === S.siteIndex ? ' active' : ''), s.name);
      b.type = 'button';
      b.addEventListener('click', function () {
        S.siteIndex = i;
        Array.prototype.forEach.call(sitesBox.children, function (c, k) {
          c.classList.toggle('active', k === i);
        });
        S.frames = 0; S.integrationSec = 0; S.exposureAccum = 0; S.slew.init = false;
      });
      sitesBox.appendChild(b);
    });

    var cats = [['all', '全部'], ['galaxy', '星系'], ['nebula', '星云'], ['cluster', '星团'], ['other', '其他']];
    var catBox = $('xyCats');
    cats.forEach(function (c) {
      var b = el('button', 'xy-chip' + (c[0] === 'all' ? ' active' : ''), c[1]);
      b.type = 'button';
      b.dataset.cat = c[0];
      b.addEventListener('click', function () {
        Array.prototype.forEach.call(catBox.children, function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        renderTargetList();
      });
      catBox.appendChild(b);
    });

    $('xySearch').addEventListener('input', renderTargetList);

    var speeds = [1, 60, 240, 480, 1440];
    var spBox = $('xySpeeds');
    speeds.forEach(function (v) {
      var b = el('button', 'xy-speed' + (v === S.speed ? ' active' : ''), v === 1 ? '1×' : v + '×');
      b.type = 'button';
      b.dataset.speed = String(v);
      b.addEventListener('click', function () {
        S.utcBase = simUtc();
        S.wallBase = Date.now() / 1000;
        S.speed = v;
        Array.prototype.forEach.call(spBox.children, function (x) {
          x.classList.toggle('active', Number(x.dataset.speed) === v);
        });
      });
      spBox.appendChild(b);
    });

    var scopeSel = $('xyScope');
    [['refractor', '折射镜 76SAP'], ['sct', '施卡 SCT'], ['newton', '牛顿反射 200PDS']].forEach(function (o) {
      var op = el('option', null, o[1]); op.value = o[0]; scopeSel.appendChild(op);
    });
    scopeSel.value = S.scope;
    scopeSel.addEventListener('change', function () {
      S.scope = scopeSel.value;
      rebuildOTA();
      S.frames = 0; S.integrationSec = 0; S.exposureAccum = 0;
    });

    var camSel = $('xyCamera');
    [['dslr', '单反相机'], ['cooled', '冷冻相机']].forEach(function (o) {
      var op = el('option', null, o[1]); op.value = o[0]; camSel.appendChild(op);
    });
    camSel.value = S.camera;
    camSel.addEventListener('change', function () {
      S.camera = camSel.value;
      rebuildOTA();
    });

    var guideBtn = $('xyGuide');
    guideBtn.addEventListener('click', function () {
      S.guideOn = !S.guideOn;
      guideBtn.textContent = S.guideOn ? '开' : '关';
      guideBtn.classList.toggle('on', S.guideOn);
      rebuildOTA();
    });

    $('xyNight').addEventListener('click', goNight);
    $('xyPark').addEventListener('click', function () {
      S.pointingMode = 'parked';
      showPill('已归位');
    });
    $('xyResume').addEventListener('click', function () {
      S.pointingMode = 'auto';
      S.slew.init = false;
      showPill('跟踪中');
    });
    $('xyResetView').addEventListener('click', resetView);

    renderTargetList();
    /* 默认选一个当季好目标：M42 猎户座大星云 */
    var idx = DATA.targets.findIndex(function (t) { return t.id === 'M42'; });
    if (idx >= 0) S.targetIndex = idx;

    /* 若此刻它在地平线下，自动挑选当前空中位置最好的目标，避免开局对着地平线 */
    var utc0 = simUtc(), st0 = site();
    var M0 = matMul(horizontalBasis(utc0, st0), precession(utc0));
    var best = -1, bestScore = -Infinity;
    DATA.targets.forEach(function (t, i) {
      var h = toHorizontal(equatorial(t.ra * D2R, t.dec * D2R), M0);
      if (h.alt < 20) return;
      var score = -Math.abs(h.alt - 48);
      if (score > bestScore) { bestScore = score; best = i; }
    });
    if (best >= 0) S.targetIndex = best;

    S.slew.init = false;
    renderTargetList();
  }

  function showPill(text) {
    var p = hudEls.statusPill || $('xyStatusPill');
    if (p) p.textContent = text;
  }

  function renderTargetList() {
    var box = $('xyTargetList');
    if (!box) return;
    var q = ($('xySearch').value || '').trim().toLowerCase();
    var active = document.querySelector('.xy-chip.active');
    var cat = active ? active.dataset.cat : 'all';
    box.innerHTML = '';
    var shown = 0;
    DATA.targets.forEach(function (t, i) {
      if (cat !== 'all' && t.cat !== cat) return;
      if (q) {
        var hay = (t.id + ' ' + t.name + ' ' + (t.alias || []).join(' ') + ' ' + t.con).toLowerCase();
        if (hay.indexOf(q) === -1) return;
      }
      if (shown >= 80) return;
      shown++;
      var row = el('button', 'xy-target' + (i === S.targetIndex ? ' active' : ''));
      row.type = 'button';
      row.innerHTML = '<b>' + t.id + '</b><span>' + t.name + '</span><i>' + (t.kind || '') + '</i>';
      row.addEventListener('click', function () {
        S.targetIndex = i;
        S.pointingMode = 'auto';
        S.slew.init = false;
        S.frames = 0; S.integrationSec = 0; S.exposureAccum = 0;
        Array.prototype.forEach.call(box.children, function (c) { c.classList.remove('active'); });
        row.classList.add('active');
        showPill('已选择 ' + t.id);
      });
      box.appendChild(row);
    });
    if (!shown) box.innerHTML = '<div class="xy-empty">没有匹配的目标</div>';
  }

  function goNight() {
    var st = site(), t0 = simUtc(), found = null;
    for (var m = 0; m <= 18 * 60; m += 5) {
      var t = t0 + m * 60;
      var sh = toHorizontal(sunEquatorial(t), horizontalBasis(t, st));
      if (sh.alt < -22) { found = t; break; }
    }
    S.utcBase = found == null ? t0 : found;
    S.wallBase = Date.now() / 1000;
    S.pointingMode = 'auto';
    S.slew.init = false;
    showPill('已进入夜晚');
  }

  function resetView() {
    if (!camera || !controls) return;
    camera.position.set(2.8, 2.4, 3.35);
    controls.target.set(0, 1.0, 0);
    controls.update();
  }

  /* ---------------------------------------------------- 8. 渲染器与尺寸 */
  function initRenderer() {
    var canvas = $('xyCanvas');
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    if (THREE.sRGBEncoding !== undefined) renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    camera = new THREE.PerspectiveCamera(42, 1, 0.05, 200);
    camera.position.set(2.8, 2.4, 3.35);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.075;
    controls.minDistance = 0.9;
    controls.maxDistance = 9;
    controls.maxPolarAngle = Math.PI * 0.52;
    controls.target.set(0, 1.0, 0);
    controls.update();

    resize();
    if (!resizeBound) {
      window.addEventListener('resize', function () { if (S.open) resize(); });
      resizeBound = true;
    }
  }

  function resize() {
    if (!renderer || !camera) return;
    var stage = $('xyStage');
    if (!stage) return;
    var w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  /* ---------------------------------------------------------- 9. 生命周期 */
  function open() {
    if (S.loading) return;
    buildOverlay();
    var root = $('xyRoot');
    root.classList.add('show');
    document.body.classList.add('xy-locked');
    S.open = true;
    resize();

    if (S.booted) {
      resetView();
      resize();
      return;
    }

    S.loading = true;
    var loading = el('div', 'xy-loading', '<div class="xy-spin"></div><p>正在装配望远镜…</p>');
    $('xyStage').appendChild(loading);

    loadScripts(function (err) {
      if (err) {
        S.loading = false;
        loading.innerHTML = '<p class="xy-err">脚本加载失败：' + err.message + '</p>';
        return;
      }
      THREE = window.THREE;
      loadModels(function (failed) {
        try {
          ensureData();
          initRenderer();
          buildScene();
          bindUI();
          rebuildOTA();
          S.utcBase = Date.now() / 1000;
          S.wallBase = Date.now() / 1000;
          resize();
          resetView();
          loading.remove();
          S.booted = true;
          S.loading = false;
          showPill('实时');
          if (failed) console.warn('[星屿] ' + failed + ' 个模型未能加载');
        } catch (e) {
          S.loading = false;
          console.error('[星屿] 初始化失败', e);
          loading.innerHTML = '<p class="xy-err">初始化失败：' + (e.message || e) + '</p>';
        }
      });
    });
  }

  function close() {
    var root = $('xyRoot');
    if (root) root.classList.remove('show');
    document.body.classList.remove('xy-locked');
    S.open = false;
  }

  function loadScripts(cb) {
    var files = [
      'xingyu/vendor/three.min.js',
      'xingyu/vendor/GLTFLoader.js',
      'xingyu/vendor/OrbitControls.js',
      'xingyu/xingyu-data.js',
      'xingyu/xingyu-models.js'
    ];
    var i = 0;
    (function next() {
      if (i >= files.length) { cb(null); return; }
      var src = files[i++];
      var s = document.createElement('script');
      s.src = src;
      s.onload = next;
      s.onerror = function () { cb(new Error(src)); };
      document.head.appendChild(s);
    })();
  }

  /* ------------------------------------------------------------ 10. 导出 */
  window.Xingyu = {
    open: open,
    close: close,
    version: '1.0.0-web',
    _state: S,
    _debug: function () {
      ensureData();
      return {
        sites: DATA.sites.length,
        targets: DATA.targets.length,
        site: site().name,
        target: target() ? target().id : null,
        utc: simUtc(),
        booted: S.booted
      };
    },
    _astro: {
      jd: jd, gmst: gmst, lst: lst,
      horizontalBasis: horizontalBasis, precession: precession,
      sunEquatorial: sunEquatorial, moonEquatorial: moonEquatorial,
      moonPhase: moonPhase, moonTopocentric: moonTopocentric,
      toHorizontal: toHorizontal, equatorial: equatorial
    },
    /* 供自动化验收：装配包围盒、指向角、渲染像素统计 */
    _sceneStats: function () {
      if (!scene || !THREE) return { ready: false };
      function bbox(o) {
        if (!o) return null;
        var b = new THREE.Box3().setFromObject(o);
        if (!isFinite(b.min.x)) return null;
        return {
          min: [b.min.x, b.min.y, b.min.z].map(function (n) { return +n.toFixed(3); }),
          max: [b.max.x, b.max.y, b.max.z].map(function (n) { return +n.toFixed(3); })
        };
      }
      return {
        ready: true,
        sceneChildren: scene.children.length,
        platform: bbox(platformModel),
        rig: bbox(rig),
        head: bbox(head),
        ota: bbox(otaGroup),
        altPivotY: +altPivot.position.y.toFixed(3),
        headRotY: +head.rotation.y.toFixed(4),
        altRotX: +altPivot.rotation.x.toFixed(4),
        pointingDeg: {
          az: +(-head.rotation.y * R2D).toFixed(2),
          alt: +(altPivot.rotation.x * R2D).toFixed(2)
        },
        otaChildCount: otaGroup.children.length,
        camera: { pos: camera.position.toArray().map(function (n) { return +n.toFixed(2); }) }
      };
    },
    /* 离地检查：镜筒在各高度角下是否会插进台面（y<0） */
    _clearance: function () {
      if (!otaGroup || !rig) return { ready: false };
      var oldAz = head.rotation.y, oldAlt = altPivot.rotation.x, out = [];
      [0, 3, 5, 10, 20, 30, 45, 60, 75, 89].forEach(function (a) {
        altPivot.rotation.x = a * D2R;
        head.rotation.y = 0;
        rig.updateMatrixWorld(true);
        var b = new THREE.Box3().setFromObject(otaGroup);
        out.push({ alt: a, minY: +b.min.y.toFixed(3), maxY: +b.max.y.toFixed(3) });
      });
      altPivot.rotation.x = oldAlt;
      head.rotation.y = oldAz;
      rig.updateMatrixWorld(true);
      return { ready: true, samples: out };
    },
    /* 取景检查：把装配包围盒投影到屏幕，确认主体占画面比例合理 */
    _framing: function () {
      if (!rig || !camera) return { ready: false };
      camera.updateMatrixWorld(true);
      var b = new THREE.Box3().setFromObject(rig);
      var corners = [], minX = 9, maxX = -9, minY = 9, maxY = -9, behind = 0;
      for (var i = 0; i < 8; i++) {
        var v = new THREE.Vector3(
          i & 1 ? b.max.x : b.min.x,
          i & 2 ? b.max.y : b.min.y,
          i & 4 ? b.max.z : b.min.z
        );
        v.project(camera);
        if (v.z > 1) behind++;
        corners.push([+v.x.toFixed(3), +v.y.toFixed(3)]);
        minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
        minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
      }
      return {
        ready: true,
        ndc: { minX: +minX.toFixed(3), maxX: +maxX.toFixed(3), minY: +minY.toFixed(3), maxY: +maxY.toFixed(3) },
        screenFrac: { w: +((maxX - minX) / 2).toFixed(3), h: +((maxY - minY) / 2).toFixed(3) },
        behindCamera: behind,
        corners: corners
      };
    },
    _pixels: function () {      if (!renderer || !scene || !camera) return { ready: false };
      renderer.render(scene, camera);
      var gl = renderer.getContext();
      var w = renderer.domElement.width, h = renderer.domElement.height;
      var gw = 40, gh = 40, total = 0, nonBlack = 0, maxv = 0, sum = 0;
      var buf = new Uint8Array(4);
      for (var y = 0; y < gh; y++) {
        for (var x = 0; x < gw; x++) {
          gl.readPixels(
            Math.floor(x * w / gw), Math.floor(y * h / gh), 1, 1,
            gl.RGBA, gl.UNSIGNED_BYTE, buf
          );
          var lum = (buf[0] + buf[1] + buf[2]) / 3;
          sum += lum; total++;
          if (lum > 8) nonBlack++;
          if (lum > maxv) maxv = lum;
        }
      }
      return { ready: true, samples: total, nonBlack: nonBlack, meanLum: +(sum / total).toFixed(2), maxLum: maxv, w: w, h: h };
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildCard);
  else buildCard();
})();
