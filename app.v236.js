
    const ENV_ID = 'cloud1-d6gagyei397d315ca';
    const COLLECTION = 'experiment_results';
    const SCF_API = window.XINGHUAN_API || 'https://你的-SCF-网关地址';

    // 统一 API 客户端：所有数据经腾讯 SCF 网关（CORS 已开），与小程序共用同一套云函数/数据库
    async function apiFetch(path, options = {}) {
      const headers = { 'Content-Type': 'application/json' };
      if (state.user && state.user.token) headers['X-Member-Token'] = state.user.token;
      const response = await fetch(SCF_API + path, {
        method: options.method || 'POST',
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined
      });
      return response.json();
    }

    


    const ECHARTS_FALLBACK = 'https://unpkg.com/echarts@5.6.0/dist/echarts.min.js';
    const FALLBACK_SERIES = [12.6, 12.3, 11.8, 11.1, 10.7, 10.9, 11.5, 12.1, 12.8];
    const ORG_DEFINITIONS = {
      astro: { label: '天文协会', school: '中国海洋大学' },
      bio: { label: '生物科技协会', school: '中国海洋大学' },
      outdoor: { label: '户外协会', school: '中国海洋大学' },
      nankai_astro: { label: '南开天协', school: '南开大学' },
      metaverse: { label: '元宇宙发展协会', school: '中国海洋大学' }
    };

    const state = {
      cloudbase: null,
      app: null,
      auth: null,
      db: null,
      chart: null,
      records: [],
      mode: 'anonymous',
      user: null,
      busy: false,
      toastTimer: null,
      activeOrg: 'astro',
      classroom: {
        courses: [],
        courseId: '',
        sessionId: '',
        stats: null,
        students: [],
        answers: [],
        chats: [],
        polls: [],
        groupTasks: [],
        watches: [],
        role: '',
        sessionStatus: 'running',
        roundNumber: 1,
        diagnosis: null,
        previousOptionCounts: {},
        previousPollCounts: {},
        knownChatIds: new Set(),
        answerWatchActive: false,
        chatWatchActive: false,
        pollWatchActive: false,
        groupWatchActive: false,
        pollTimer: null,
        statsTimer: null,
        diagnosisBusy: false,
        controlBusy: false,
        connectionMode: 'idle'
      }
    };

    const elements = {};

    function bindElements() {
      [
        'connectionDot', 'connectionText', 'headerLoginButton', 'clockTime', 'clockDate',
        'identityBadge', 'identityTitle', 'identitySubtitle', 'sessionOrgChip',
        'sessionLoginButton', 'recordCount', 'averageValue', 'sourceValue',
        'recordBadge', 'recordList', 'chartLoading', 'consoleMessage',
        'addRecordButton', 'refreshButton', 'loginModal', 'loginForm',
        'username', 'password', 'loginError', 'closeLoginButton', 'cancelLoginButton',
        'submitLoginButton', 'experimentChart', 'toast', 'classroomBoard',
        'classroomCourseSelect', 'classroomRefreshButton', 'classAnswerTotal',
        'classAnswerCorrectRate', 'classAnswerWrongRate', 'classQuestionCount',
        'answerTableEmpty', 'answerTableWrap', 'answerTableBody', 'answerTableMeta',
        'wrongOptionList', 'classQuestionFeed', 'anonymousState', 'classroomBoardNote',
        'teacherControlBar', 'pauseAnswersButton', 'resumeAnswersButton', 'resetStageButton',
        'answerStatusLabel', 'answerRoundMeta', 'answerOptionList', 'pollDistribution',
        'pollBlockMeta', 'groupSubmissionWall', 'groupWallMeta', 'generateDiagnosisButton',
        'aiDiagnosisCard', 'aiDiagnosisContent', 'aiDiagnosisMeta', 'classCompletionRate', 'pendingList', 'pendingListMeta', 'cheatAlertList', 'cheatAlertMeta', 'voiceFeed', 'voiceFeedMeta', 'voiceRoster', 'voiceRosterMeta', 'micToggle', 'mossVoiceToggle', 'voiceEnrollModal', 'veConsent', 'veRecord', 'veCancel', 'veStatus', 'mossFeed', 'mossFeedMeta', 'mossInput', 'mossSend', 'svTabQ', 'svTabO', 'svCats', 'svList', 'svMeta', 'voiceEnrollButton', 'studentConsole', 'scPhaseMeta', 'scQuizCard', 'scQuizQuestion', 'scQuizOptions', 'scQuizSubmit', 'scQuizState', 'scCheckinCard', 'scCheckinState', 'scCheckinButton', 'scChatInput', 'scChatSend', 'scChatAnon', 'scKindQ', 'scKindO', 'scPostInput', 'scPostSend', 'scTaskCard', 'scTaskRequirement', 'scTaskContent', 'scTaskSubmit', 'scTaskState', 'resourcesPage', 'consolePage', 'consoleSlot', 'consoleDenied'
      ].forEach((id) => {
        elements[id] = document.getElementById(id);
      });
    }

    function logStep(label, detail) {
      const suffix = detail === undefined ? '' : detail;
      console.log('[星环实验大屏]', label, suffix);
      if (elements.consoleMessage) {
        elements.consoleMessage.textContent = detail === undefined ? label : label + ' · ' + String(detail);
      }
    }

    function setConnection(kind, label) {
      elements.connectionDot.className = 'status-dot' + (kind === 'online' ? ' online' : kind === 'error' ? ' error' : '');
      elements.connectionText.textContent = label;
    }

    function showToast(message, isError = false) {
      clearTimeout(state.toastTimer);
      elements.toast.textContent = message;
      elements.toast.classList.toggle('error', isError);
      elements.toast.classList.add('show');
      state.toastTimer = setTimeout(() => elements.toast.classList.remove('show'), 3200);
    }

    function getErrorMessage(error) {
      if (!error) return '未知错误';
      const source = error.error || error;
      return source.message || source.error_description || source.msg || source.errMsg || String(source);
    }

    function assertAuthResult(result) {
      if (result && result.error) {
        throw result.error;
      }
      return result;
    }

    function updateClock() {
      const now = new Date();
      elements.clockTime.textContent = now.toLocaleTimeString('zh-CN', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      elements.clockDate.textContent = now.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        weekday: 'short'
      });
    }

    function loadScriptOnce(src, predicate) {
      return new Promise((resolve, reject) => {
        if (predicate()) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = () => predicate() ? resolve() : reject(new Error('脚本加载后未注册全局对象'));
        script.onerror = () => reject(new Error('脚本加载失败: ' + src));
        document.head.appendChild(script);
      });
    }

    async function ensureECharts() {
      if (!window.echarts) {
        await loadScriptOnce(ECHARTS_FALLBACK, () => Boolean(window.echarts));
      }
      return window.echarts;
    }


    function normalizeOrg(value) {
      const raw = String(value || '').trim().toLowerCase();
      if (raw.includes('nankai') || raw.includes('南开')) return 'nankai_astro';
      if (raw.includes('meta') || raw.includes('元宇宙')) return 'metaverse';
      if (raw.includes('outdoor') || raw.includes('户外')) return 'outdoor';
      if (raw.includes('bio') || raw.includes('生物科技') || raw.includes('生科')) return 'bio';
      return 'astro';
    }

    function activateOrg(org) {
      const currentOrg = normalizeOrg(org);
      state.activeOrg = currentOrg;
      document.querySelectorAll('[data-org]').forEach((button) => {
        const active = normalizeOrg(button.dataset.org) === currentOrg;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
      });
      if (elements.sessionOrgChip) {
        elements.sessionOrgChip.textContent = ORG_DEFINITIONS[currentOrg].label;
      }
    }

    function parseFunctionPayload(response) {
      if (!response) return null;
      const candidate = response.result !== undefined
        ? response.result
        : (response.data !== undefined ? response.data : response);
      if (typeof candidate === 'string') {
        try {
          return JSON.parse(candidate);
        } catch (error) {
          return { code: 1, message: candidate };
        }
      }
      return candidate;
    }

    async function callWebLogin(username, password) {
      const payload = await apiFetch('/login', { method: 'POST', body: { username, password } });
      if (!payload || payload.code !== 0) {
        throw new Error((payload && (payload.message || payload.msg)) || '账号或密码校验失败');
      }
      if (!payload.data || !payload.data.token) throw new Error('网关未返回登录令牌');
      return payload.data;
    }

    function setLoggedIn(user) {
      setConnection('online', '已连接'); // v2.27.2 登录成功复位右上角状态灯
      state.mode = 'custom';
      state.user = { ...(user || {}) };
      const name = state.user.name || state.user.username || '成员';
      elements.identityBadge.textContent = name.slice(0, 1);
      elements.identityTitle.textContent = '欢迎，' + name;
      elements.identitySubtitle.textContent = [
        user.username ? '@' + user.username : '',
        user.department || '',
        user.role === 'admin' ? '管理员' : '成员'
      ].filter(Boolean).join(' · ');
      activateOrg(user.org);
      elements.sessionLoginButton.textContent = '已登录';
      elements.sessionLoginButton.disabled = true;
      elements.headerLoginButton.textContent = name;
      elements.headerLoginButton.disabled = false;
      elements.addRecordButton.disabled = false;
      renderAstroRes();
      revealHubNav();
      checkLiveLecture();
      document.getElementById('hubAiFloat').hidden = false;
      revealHubNav();
      wbSetup();
      if (canSeeAstroRes()) document.getElementById('communityTab').hidden = false;
      closeLogin();
      syncVoiceEnrollButton();
    }

    function setAnonymous() {
      disconnectClassroomBoard();
      document.body.classList.add('auth-locked');
      document.body.classList.remove('is-authed');
      state.mode = 'anonymous';
      state.user = null;
      elements.identityBadge.textContent = '访';
      elements.identityTitle.textContent = '匿名只读会话';
      elements.identitySubtitle.textContent = '登录后可查看完整会员身份并使用数据写入能力';
      elements.sessionOrgChip.textContent = '未绑定社团';
      elements.sessionLoginButton.textContent = '登录';
      elements.sessionLoginButton.disabled = false;
      elements.headerLoginButton.textContent = '账号登录';
      elements.headerLoginButton.disabled = false;
      elements.addRecordButton.disabled = true;
      if (elements.voiceEnrollButton) elements.voiceEnrollButton.hidden = true;
      setClassroomUnavailable('登录天文协会成员账号后，可选择进行中的课堂并查看实时数据。');
    }

    function openLogin() {
      if (state.mode === 'custom') {
        showToast('当前已登录为 ' + (state.user.name || state.user.username || '成员'));
        return;
      }
      elements.loginError.classList.remove('show');
      elements.loginError.textContent = '';
      document.body.classList.add('auth-locked');
      document.body.classList.remove('is-authed');
      elements.loginModal.classList.add('open');
      elements.loginModal.setAttribute('aria-hidden', 'false');
      // v3.0：登录区已并入首屏星环舞台，不再锁死页面滚动
      document.body.style.overflow = '';
      if (window.XHLanding) window.XHLanding.onLoginScreen();
      if (window.matchMedia('(pointer: fine)').matches) {
        setTimeout(() => {
          try {
            elements.username.focus({ preventScroll: true });
          } catch (error) {
            elements.username.focus();
          }
        }, 120);
      }
    }

    function closeLogin() {
      elements.loginModal.classList.remove('open');
      elements.loginModal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      document.body.classList.remove('auth-locked');
      document.body.classList.add('is-authed');
      elements.password.value = '';
      if (window.XHLanding) window.XHLanding.onLoginSuccess(state.user);
      // 看板从隐藏变为显示后，ECharts 需要重新测量容器
      requestAnimationFrame(() => {
        if (state.chart) state.chart.resize();
        setTimeout(() => { if (state.chart) state.chart.resize(); }, 360);
      });
    }

    function normalizeDate(value) {
      if (!value) return '';
      if (value instanceof Date) return value.toLocaleString('zh-CN', { hour12: false });
      if (typeof value === 'string' || typeof value === 'number') {
        const date = new Date(value);
        if (!Number.isNaN(date.getTime())) return date.toLocaleString('zh-CN', { hour12: false });
        return String(value);
      }
      if (typeof value === 'object') {
        if (typeof value.$date === 'number' || typeof value.$date === 'string') {
          return normalizeDate(value.$date);
        }
        if (typeof value.seconds === 'number') {
          return normalizeDate(value.seconds * 1000);
        }
      }
      return '';
    }

    function getRecordValue(record) {
      const candidates = [record.value, record.brightness, record.magnitude];
      for (const candidate of candidates) {
        const number = Number(candidate);
        if (Number.isFinite(number)) return number;
      }
      if (Array.isArray(record.data)) {
        for (const point of record.data) {
          const number = Number(point && (point.value ?? point.brightness));
          if (Number.isFinite(number)) return number;
        }
      }
      return null;
    }

    function getRecordTime(record) {
      return normalizeDate(record.created_at || record.create_time || record.time || record.date || record._createTime);
    }

    function normalizeRecords(records) {
      return (records || []).map((record, index) => {
        const value = getRecordValue(record);
        return {
          ...record,
          _index: index,
          _value: value,
          _time: getRecordTime(record),
          _name: record.name || record.title || record.student_name || '未命名实验'
        };
      }).sort((a, b) => {
        const timeA = Date.parse(a._time) || 0;
        const timeB = Date.parse(b._time) || 0;
        if (timeA !== timeB) return timeB - timeA;
        return b._index - a._index;
      });
    }

    function buildChartOption() {
      const numeric = state.records.filter((item) => Number.isFinite(item._value));
      const seriesRecords = numeric.slice(0, 12).reverse();
      const hasData = seriesRecords.length > 0;
      const labels = hasData
        ? seriesRecords.map((item, index) => item._time ? item._time.slice(5, 16) : '记录 ' + (index + 1))
        : ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9'];
      const values = hasData ? seriesRecords.map((item) => item._value) : FALLBACK_SERIES;

      return {
        animationDuration: 650,
        animationEasing: 'cubicOut',
        grid: { left: 48, right: 24, top: 48, bottom: 42, containLabel: false },
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(10, 15, 23, 0.96)',
          borderColor: 'rgba(212, 196, 168, 0.24)',
          textStyle: { color: '#eef2f6', fontSize: 11 },
          axisPointer: { type: 'line', lineStyle: { color: 'rgba(212, 196, 168, 0.22)' } },
          formatter(params) {
            const point = params && params[0];
            if (!point) return '';
            return '<div style="color:#92a0af;font-size:10px;margin-bottom:6px">' +
              String(point.axisValue) +
              '</div><div style="color:#ebe0cc;font-size:15px">' +
              Number(point.value).toFixed(1) +
              '<span style="color:#92a0af;font-size:10px;margin-left:5px">mag</span></div>';
          }
        },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: labels,
          axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
          axisTick: { show: false },
          axisLabel: { color: '#657382', fontSize: 10, margin: 13 }
        },
        yAxis: {
          type: 'value',
          name: '亮度 / mag',
          nameTextStyle: { color: '#657382', fontSize: 10, padding: [0, 0, 10, 0] },
          min(value) { return Math.floor(value.min - 0.8); },
          max(value) { return Math.ceil(value.max + 0.8); },
          splitNumber: 5,
          axisLabel: { color: '#657382', fontSize: 10 },
          splitLine: { lineStyle: { color: 'rgba(255,255,255,0.055)', type: 'dashed' } }
        },
        series: [
          {
            name: '亮度',
            type: 'line',
            data: values,
            smooth: 0.38,
            symbol: 'circle',
            symbolSize: 5,
            showSymbol: true,
            lineStyle: {
              width: 2,
              color: '#d4c4a8',
              shadowColor: 'rgba(212,196,168,0.28)',
              shadowBlur: 14
            },
            itemStyle: {
              color: '#ebe0cc',
              borderColor: '#0d141e',
              borderWidth: 2
            },
            emphasis: {
              scale: true,
              itemStyle: { color: '#ffffff', shadowBlur: 18, shadowColor: 'rgba(212,196,168,0.65)' }
            },
            areaStyle: {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: 'rgba(212, 196, 168, 0.19)' },
                  { offset: 0.62, color: 'rgba(141, 184, 198, 0.055)' },
                  { offset: 1, color: 'rgba(7, 11, 18, 0)' }
                ]
              }
            }
          }
        ]
      };
    }

    function renderChart() {
      if (!state.chart) return;
      state.chart.setOption(buildChartOption(), true);
    }

    function renderStats() {
      const numeric = state.records.filter((item) => Number.isFinite(item._value));
      const average = numeric.length
        ? numeric.reduce((sum, item) => sum + item._value, 0) / numeric.length
        : null;
      const sources = [...new Set(state.records.map((item) => item.source).filter(Boolean))];
      elements.recordCount.innerHTML = state.records.length + '<small>条</small>';
      elements.recordBadge.textContent = state.records.length + ' 条';
      elements.averageValue.innerHTML = (average === null ? '--' : average.toFixed(1)) + '<small>mag</small>';
      elements.sourceValue.textContent = sources.length ? sources.slice(0, 2).join(' / ') : '待同步';
    }

    function renderRecordList() {
      if (!state.records.length) {
        elements.recordList.innerHTML = '<li class="empty-state"><div><div class="empty-state-mark"></div><p>尚无公开实验记录<br />登录后写入测试数据即可开始</p></div></li>';
        return;
      }
      elements.recordList.innerHTML = state.records.slice(0, 30).map((record, index) => {
        const value = Number.isFinite(record._value) ? record._value.toFixed(1) : '--';
        const meta = [record._time || '时间未记录', record.source || '未标记来源'].filter(Boolean).join(' · ');
        return '<li class="record-item">' +
          '<span class="record-index">' + String(index + 1).padStart(2, '0') + '</span>' +
          '<div class="record-copy">' +
            '<p class="record-name">' + escapeHtml(record._name) + '</p>' +
            '<p class="record-meta">' + escapeHtml(meta) + '</p>' +
          '</div>' +
          '<span class="record-value">' + escapeHtml(value) + '</span>' +
        '</li>';
      }).join('');
    }

    function escapeHtml(value) {
      return String(value ?? '').replace(/[&<>"']/g, (character) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      })[character]);
    }

    function finishRendering() {
      renderStats();
      renderRecordList();
      renderChart();
      elements.chartLoading.classList.add('hidden');
    }

    async function loadRecords(options = {}) {
      elements.refreshButton.disabled = true;
      elements.chartLoading.classList.remove('hidden');
      try {
        const payload = await apiFetch('/records', { method: 'GET' });
        if (!payload || payload.code !== 0) throw new Error((payload && payload.message) || '读取失败');
        state.records = normalizeRecords(payload.data || []);
        logStep('实验数据读取成功', state.records.length + ' 条');
        finishRendering();
        if (options.toast) showToast('数据已刷新');
      } catch (error) {
        console.error('[星环实验大屏] 读取 experiment_results 失败', error);
        state.records = [];
        finishRendering();
        setConnection('error', '只读数据受限');
        elements.consoleMessage.textContent = '数据库读取失败，请稍后重试 · ' + getErrorMessage(error);
        if (options.toast) showToast('读取失败：' + getErrorMessage(error), true);
      } finally {
        elements.refreshButton.disabled = false;
      }
    }

    async function addTestRecord() {
      if (state.mode !== 'custom') {
        showToast('请先登录后再写入测试数据', true);
        openLogin();
        return;
      }
      elements.addRecordButton.disabled = true;
      try {
        const payload = await apiFetch('/records', {
          method: 'POST',
          body: { record: { name: state.user && (state.user.name || state.user.username) || '测试学生', value: 88, time: '今天', source: 'web_test' } }
        });
        if (!payload || payload.code !== 0) throw new Error((payload && payload.message) || '写入失败');
        logStep('测试数据写入成功', 'value = 88');
        showToast('测试数据已写入');
        await loadRecords();
      } catch (error) {
        console.error('[星环教学中枢] 写入 experiment_results 失败', error);
        showToast('写入失败：' + getErrorMessage(error), true);
      } finally {
        elements.addRecordButton.disabled = state.mode !== 'custom';
      }
    }

    async function submitLogin(event) {
      event.preventDefault();
      if (state.busy) return;

      const username = elements.username.value.trim();
      const password = elements.password.value;
      if (!username || !password) {
        elements.loginError.textContent = '请输入账号和密码';
        elements.loginError.classList.add('show');
        return;
      }

      state.busy = true;
      elements.submitLoginButton.disabled = true;
      const submitLabel = elements.submitLoginButton.querySelector('span');
      if (submitLabel) {
        submitLabel.textContent = '正在验证';
      } else {
        elements.submitLoginButton.textContent = '正在验证';
      }
      elements.loginError.classList.remove('show');
      elements.loginError.textContent = '';
      logStep('正在调用 memberService.web_login');

      try {
        const data = await callWebLogin(username, password);
        console.log('[星环教学中枢] 登录成功，身份已建立');
        localStorage.setItem('hub_token', data.token || (data.user && data.user.token) || '');
        setLoggedIn({ ...(data.user || { username }), token: data.token || (data.user && data.user.token) });
        // v2.27 登录成功直接带进中枢页（课堂看板），不用自己找入口
        setTimeout(() => enterHub('classroom'), 350);
        setConnection('online', '已连接');
        showToast('登录成功');
        await Promise.allSettled([loadRecords(), loadClassroomCourses()]);
      } catch (error) {
        console.error('[星环实验大屏] 网页登录失败', error);
        elements.loginError.textContent = getErrorMessage(error);
        elements.loginError.classList.add('show');
        if (state.mode !== 'custom') setConnection('error', '登录失败');
        logStep('登录失败', getErrorMessage(error));
      } finally {
        state.busy = false;
        elements.submitLoginButton.disabled = false;
        const submitLabelReset = elements.submitLoginButton.querySelector('span');
        if (submitLabelReset) {
          submitLabelReset.textContent = '进入中枢';
        } else {
          elements.submitLoginButton.textContent = '进入中枢';
        }
        elements.password.value = '';
      }
    }


    function classroomIsReady() {
      return state.mode === 'custom' && state.user && state.user.token;
    }

    async function callCourseService(action, extra = {}) {
      if (!classroomIsReady()) {
        throw new Error('请先登录成员账号，课堂互动接口需要成员 token');
      }
      const payload = await apiFetch('/classroom', { method: 'POST', body: { action, params: extra } });
      if (!payload || payload.code !== 0) {
        throw new Error((payload && (payload.message || payload.msg)) || ('课堂接口调用失败：' + action));
      }
      return payload.data;
    }

    function clearNode(node) {
      if (!node) return;
      while (node.firstChild) node.removeChild(node.firstChild);
    }

    function shortTime(value) {
      if (!value) return '--';
      const normalized = normalizeDate(value);
      if (!normalized) return '--';
      return normalized.replace(/^\d{4}\//, '').replace(/^\d{4}-/, '');
    }

    function setClassroomUnavailable(message, isError = false) {
      elements.classroomCourseSelect.disabled = true;
      elements.classroomRefreshButton.disabled = true;
      elements.answerTableMeta.textContent = isError ? '同步异常' : '等待课堂数据';
      elements.answerTableEmpty.hidden = false;
      elements.answerTableWrap.hidden = true;
      elements.answerTableEmpty.textContent = message;
      setClassroomStat(elements.classAnswerTotal, '--', '人');
      setClassroomStat(elements.classAnswerCorrectRate, '--', '%');
      setClassroomStat(elements.classAnswerWrongRate, '--', '%');
      setClassroomStat(elements.classQuestionCount, '--', '条');
      if (elements.classCompletionRate) setClassroomStat(elements.classCompletionRate, '--', '%');
      if (elements.pendingList) {
        clearNode(elements.pendingList);
        const pEmpty = document.createElement('div');
        pEmpty.className = 'classroom-empty compact';
        pEmpty.textContent = '本轮暂无作答数据';
        elements.pendingList.appendChild(pEmpty);
      }
      if (elements.pendingListMeta) elements.pendingListMeta.textContent = '本轮未提交的学生';
      if (elements.cheatAlertList) {
        clearNode(elements.cheatAlertList);
        const cEmpty = document.createElement('div');
        cEmpty.className = 'classroom-empty compact';
        cEmpty.textContent = '暂无警报，课堂状态正常';
        elements.cheatAlertList.appendChild(cEmpty);
        const cBoard = elements.cheatAlertList.closest('.cheat-block');
        if (cBoard) cBoard.classList.remove('has-alert');
      }
      if (elements.cheatAlertMeta) elements.cheatAlertMeta.textContent = '切屏/离开应用事件';
      const oldBanner = document.querySelector('.cheat-banner');
      if (oldBanner) oldBanner.classList.remove('show');
      clearNode(elements.answerTableBody);
      clearNode(elements.wrongOptionList);
      const wrongEmpty = document.createElement('div');
      wrongEmpty.className = 'classroom-empty';
      wrongEmpty.textContent = '暂无错题数据';
      elements.wrongOptionList.appendChild(wrongEmpty);
      clearNode(elements.classQuestionFeed);
      const chatEmpty = document.createElement('div');
      chatEmpty.className = 'classroom-empty';
      chatEmpty.textContent = message;
      elements.classQuestionFeed.appendChild(chatEmpty);
      clearNode(elements.answerOptionList);
      const optionEmpty = document.createElement('div');
      optionEmpty.className = 'classroom-empty compact';
      optionEmpty.textContent = '本轮选项统计会实时显示在这里。';
      elements.answerOptionList.appendChild(optionEmpty);
      clearNode(elements.pollDistribution);
      const pollEmpty = document.createElement('div');
      pollEmpty.className = 'classroom-empty compact';
      pollEmpty.textContent = '课堂投票发布后，选项人数会实时更新。';
      elements.pollDistribution.appendChild(pollEmpty);
      clearNode(elements.groupSubmissionWall);
      const groupEmpty = document.createElement('div');
      groupEmpty.className = 'classroom-empty compact';
      groupEmpty.textContent = '小组提交后会点亮对应卡片。';
      elements.groupSubmissionWall.appendChild(groupEmpty);
      elements.pollBlockMeta.textContent = 'polls · 等待数据';
      elements.groupWallMeta.textContent = 'group_tasks · 等待小组数据';
      elements.teacherControlBar.hidden = true;
      if (elements.studentConsole) elements.studentConsole.hidden = true;
      elements.generateDiagnosisButton.hidden = true;
      elements.aiDiagnosisCard.hidden = true;
      document.body.classList.remove('classroom-paused');
      state.classroom.role = '';
      state.classroom.sessionStatus = 'running';
      state.classroom.roundNumber = 1;
      state.classroom.diagnosis = null;
    }

    function setClassroomStat(node, value, unit) {
      if (!node) return;
      clearNode(node);
      node.appendChild(document.createTextNode(String(value)));
      const small = document.createElement('small');
      small.textContent = unit;
      node.appendChild(small);
    }

    function timeValue(value) {
      if (!value) return 0;
      if (typeof value === 'number') return value < 1e12 ? value * 1000 : value;
      if (value instanceof Date) return value.getTime();
      if (typeof value === 'object') {
        if (typeof value.$date === 'number') return value.$date;
        if (typeof value.seconds === 'number') return value.seconds * 1000;
        if (typeof value._seconds === 'number') return value._seconds * 1000;
      }
      const parsed = Date.parse(String(value));
      return Number.isFinite(parsed) ? parsed : 0;
    }

    function animateCountIfChanged(node, previous, current) {
      if (previous === undefined || Number(previous) === Number(current)) return;
      node.classList.remove('count-flash');
      void node.offsetWidth;
      node.classList.add('count-flash');
    }

    function renderAnswerOptionList(stats) {
      if (!elements.answerOptionList) return;
      const quiz = (stats && stats.quiz) || {};
      const definitions = Array.isArray(quiz.options) ? quiz.options : [];
      const counts = Array.isArray(stats && stats.option_counts) ? stats.option_counts : [];
      const countMap = new Map(counts.map((item) => [String(item.key), item]));
      const correctKeys = new Set((quiz.correct_answers || []).map((key) => String(key)));
      const rows = definitions.length
        ? definitions.map((option) => {
            const key = String(option.key || '');
            return { key, text: option.text || option.label || key, ...(countMap.get(key) || {}) };
          })
        : counts.map((option) => ({
            key: String(option.key || ''),
            text: option.text || option.label || ('选项 ' + String(option.key || '')),
            ...option
          }));

      clearNode(elements.answerOptionList);
      if (!rows.length) {
        const empty = document.createElement('div');
        empty.className = 'classroom-empty compact';
        empty.textContent = '本轮选项统计会实时显示在这里。';
        elements.answerOptionList.appendChild(empty);
        state.classroom.previousOptionCounts = {};
        return;
      }

      const total = rows.reduce((sum, option) => sum + Number(option.count || 0), 0);
      const nextCounts = {};
      rows.forEach((option) => {
        const key = String(option.key || '-');
        const count = Number(option.count || 0);
        nextCounts[key] = count;
        const item = document.createElement('article');
        item.className = 'answer-option-item' + (correctKeys.has(key) ? ' is-correct' : '');

        const top = document.createElement('div');
        top.className = 'answer-option-top';
        const keyNode = document.createElement('span');
        keyNode.className = 'answer-option-key';
        keyNode.textContent = key;
        const name = document.createElement('span');
        name.className = 'answer-option-name';
        name.textContent = option.text || ('选项 ' + key);
        const countNode = document.createElement('span');
        countNode.className = 'answer-option-count';
        countNode.textContent = count + ' 人';
        animateCountIfChanged(countNode, state.classroom.previousOptionCounts[key], count);
        top.append(keyNode, name, countNode);

        const bar = document.createElement('div');
        bar.className = 'answer-option-bar';
        const barFill = document.createElement('i');
        const percentage = total ? Math.round((count / total) * 100) : 0;
        barFill.style.setProperty('--bar-width', percentage + '%');
        bar.appendChild(barFill);

        const foot = document.createElement('div');
        foot.className = 'answer-option-foot';
        const names = Array.isArray(option.student_names) ? option.student_names.filter(Boolean) : [];
        const labels = [];
        if (correctKeys.has(key)) labels.push('正确选项');
        if (names.length) labels.push(names.join('、'));
        foot.textContent = labels.join(' · ') || (count ? '已收到作答' : '暂无学生选择');

        item.append(top, bar, foot);
        elements.answerOptionList.appendChild(item);
      });
      state.classroom.previousOptionCounts = nextCounts;
    }

    function normalizePollOptions(poll) {
      const options = Array.isArray(poll && poll.options) ? poll.options : [];
      return options.map((option, index) => {
        if (typeof option === 'string') {
          return { index, text: option, count: 0, voters: [] };
        }
        const voters = Array.isArray(option && option.voters) ? option.voters : [];
        const rawCount = option && (option.count ?? option.votes ?? option.value);
        return {
          index,
          text: (option && (option.text || option.label || option.name)) || ('选项 ' + String.fromCharCode(65 + index)),
          count: Number(rawCount ?? voters.length) || 0,
          voters
        };
      });
    }

    function renderPollDistribution() {
      if (!elements.pollDistribution) return;
      const polls = (state.classroom.polls || [])
        .slice()
        .sort((a, b) => timeValue(b.created_at || b.created_at_ms) - timeValue(a.created_at || a.created_at_ms))
        .slice(0, 3);
      clearNode(elements.pollDistribution);
      if (!polls.length) {
        const empty = document.createElement('div');
        empty.className = 'classroom-empty compact';
        empty.textContent = '课堂投票发布后，选项人数会实时更新。';
        elements.pollDistribution.appendChild(empty);
        elements.pollBlockMeta.textContent = 'polls · 等待数据';
        state.classroom.previousPollCounts = {};
        return;
      }

      let participantTotal = 0;
      const nextCounts = {};
      polls.forEach((poll) => {
        const pollId = String(poll._id || poll.poll_id || poll.title || 'poll');
        const options = normalizePollOptions(poll);
        const total = Number(poll.total ?? (Array.isArray(poll.votedBy) ? poll.votedBy.length : 0)) ||
          options.reduce((sum, option) => sum + Number(option.count || 0), 0);
        participantTotal += total;

        const card = document.createElement('article');
        card.className = 'poll-card';
        const title = document.createElement('p');
        title.className = 'poll-title';
        title.textContent = poll.title || poll.question || '课堂投票';
        card.appendChild(title);

        options.forEach((option) => {
          const row = document.createElement('div');
          row.className = 'poll-option';
          const top = document.createElement('div');
          top.className = 'poll-option-top';
          const label = document.createElement('span');
          label.textContent = option.text;
          const count = document.createElement('span');
          count.className = 'poll-option-count';
          count.textContent = option.count + ' 人';
          const countKey = pollId + ':' + option.index;
          animateCountIfChanged(count, state.classroom.previousPollCounts[countKey], option.count);
          nextCounts[countKey] = option.count;
          top.append(label, count);

          const bar = document.createElement('div');
          bar.className = 'poll-option-bar';
          const fill = document.createElement('i');
          const percentage = total ? Math.round((option.count / total) * 100) : 0;
          fill.style.setProperty('--bar-width', percentage + '%');
          bar.appendChild(fill);
          row.append(top, bar);
          card.appendChild(row);
        });

        elements.pollDistribution.appendChild(card);
      });
      state.classroom.previousPollCounts = nextCounts;
      elements.pollBlockMeta.textContent = polls.length + ' 个投票 · ' + participantTotal + ' 人参与';
    }

    function renderGroupSubmissionWall() {
      if (!elements.groupSubmissionWall) return;
      const tasks = (state.classroom.groupTasks || []).slice().sort((a, b) =>
        String(a.group_id || a.group_name || '').localeCompare(String(b.group_id || b.group_name || ''))
      );
      clearNode(elements.groupSubmissionWall);
      if (!tasks.length) {
        const empty = document.createElement('div');
        empty.className = 'classroom-empty compact';
        empty.textContent = '小组提交后会点亮对应卡片。';
        elements.groupSubmissionWall.appendChild(empty);
        elements.groupWallMeta.textContent = 'group_tasks · 等待小组数据';
        return;
      }

      let submittedCount = 0;
      tasks.forEach((task) => {
        const submitted = task.submit_status === 'submitted' || Boolean(task.submit_content || task.submitted_at);
        if (submitted) submittedCount += 1;
        const card = document.createElement('article');
        card.className = 'group-submit-card' + (submitted ? ' submitted' : '');

        const top = document.createElement('div');
        top.className = 'group-submit-top';
        const name = document.createElement('span');
        name.className = 'group-submit-name';
        name.textContent = task.group_name || task.group_id || '未命名小组';
        const statusNode = document.createElement('span');
        statusNode.className = 'group-submit-state';
        statusNode.textContent = submitted ? '已提交' : '待提交';
        top.append(name, statusNode);

        const content = document.createElement('p');
        content.className = 'group-submit-content';
        content.textContent = submitted
          ? (task.submit_content || ('由 ' + (task.submitted_by_name || '小组成员') + ' 提交'))
          : (task.requirement || '等待小组提交任务内容');
        card.append(top, content);
        elements.groupSubmissionWall.appendChild(card);
      });
      elements.groupWallMeta.textContent = submittedCount + ' / ' + tasks.length + ' 组已提交';
    }

    function applySessionStatus(status) {
      const statusObject = status && typeof status === 'object' ? status : {};
      const rawStatus = typeof status === 'string'
        ? status
        : (statusObject.answer_status || state.classroom.sessionStatus || 'running');
      const answerStatus = rawStatus === 'paused' ? 'paused' : 'running';
      const roundNumber = Number(statusObject.round_number || state.classroom.roundNumber || 1);
      state.classroom.sessionStatus = answerStatus;
      state.classroom.roundNumber = roundNumber;
      const paused = answerStatus === 'paused';
      document.body.classList.toggle('classroom-paused', paused);
      if (elements.answerStatusLabel) elements.answerStatusLabel.textContent = paused ? '作答已暂停' : '作答进行中';
      if (elements.answerRoundMeta) {
        elements.answerRoundMeta.textContent = '第 ' + roundNumber + ' 轮 · ' + (paused ? '学生端已锁定提交' : '学生端可继续提交');
      }
      if (elements.teacherControlBar) elements.teacherControlBar.classList.toggle('is-paused', paused);
      if (elements.pauseAnswersButton) elements.pauseAnswersButton.disabled = paused || state.classroom.controlBusy;
      if (elements.resumeAnswersButton) elements.resumeAnswersButton.disabled = !paused || state.classroom.controlBusy;
    }

    // v1.4 教师后端权限门：仅管理员/授课教师可见；普通成员登录后不可见

    // ---------- v2.12.5 天文资料分支：仅天文协会成员（海大/南开）可见 ----------
    const ASTRO_RES = [
      // v2.33 原公开资源卡并入天文资料（仅海大/南开成员可见）
      { tag: '仪器教学', title: '天文仪器简易操作教学', desc: '仪器入门（半成品，持续更新）· 感谢艾博宇学长制作', url: 'https://pan.baidu.com/s/13ToIQRvubydfxkz5GzPxug', code: 'ouc1' },
      { tag: '星图软件', title: 'Stellarium 基础教学（5.29 更新）', desc: '免费强大的 PC 端星图软件入门', url: 'https://pan.baidu.com/s/1T35RXV_ZYkmDhy8ngStA_Q', code: 'ABYY' },
      { tag: '摄影实战', title: '天文摄影基础 · 出摊实战流程', desc: 'zwo 天文盒子完整深空观测流程', url: 'https://pan.baidu.com/s/1tRZKvh2SA6jkO6wDWZaKXw', code: '6Tst' },
      { tag: '后期处理', title: '月面叠加 & PixInsight', desc: '月面后期处理 · 夸克网盘', url: 'https://pan.quark.cn/s/4300c1b9a9fd', code: '' },
      { tag: '实用软件', title: '郭辰洋学长的软件包（掩星/太阳）', desc: '观测小工具合集', url: 'https://pan.baidu.com/s/1hd2qpHovTHNVOounaqVcBQ', code: 'digy' },
      { tag: '摄影教程', title: '摄影师看 Kan · NINA/SIRIL 教程', desc: '附练习素材', url: 'https://pan.baidu.com/s/1Vz-5RFwG0p3ZMe7IUKJ-Kw', code: 'uuhp' }
    ];
    function canSeeAstroRes() {
      const u = state.user || {};
      if (!u || !u.org) return false;
      if (u.super_admin === true || u.role === 'admin') return true;
      const org = normalizeOrg(u.org);
      return org === 'astro' || org === 'nankai_astro';
    }
    /* v2.49 动态生成天文资料面板：不依赖静态 HTML，杜绝渲染异常 */
    function renderAstroRes() {
      var host = document.getElementById('resourcesPage');
      if (!host) return;
      var visible = canSeeAstroRes();
      var panel = document.getElementById('astroResPanel');
      if (!visible) { if (panel) panel.remove(); return; }
      if (!panel) {
        panel = document.createElement('div');
        panel.id = 'astroResPanel';
        panel.style.cssText = 'margin:0 16px 16px;padding:18px;border:1px solid rgba(124,199,255,.28);border-radius:14px;background:linear-gradient(145deg,rgba(124,199,255,.06),rgba(255,255,255,.012))';
        var headEl = host.querySelector('.panel-head');
        headEl.parentNode.insertBefore(panel, headEl.nextSibling);
        panel.innerHTML = '<div style="display:flex;align-items:center;gap:14px;margin-bottom:16px"><span style="font-size:16px;letter-spacing:.18em;color:#7cc7ff">天文资料</span><span style="flex:1;height:1px;background:rgba(124,167,220,.14)"></span></div><div id="astroResList" class="res-grid"></div>';
      }
      var list = document.getElementById('astroResList');
      if (!list) return;
      list.innerHTML = ASTRO_RES.length ? ASTRO_RES.map(r =>
        '<article class="res-card"><div class="res-tag-row"><span class="res-tag">' + (r.tag || '天文资料') + '</span>' +
        (r.url && r.url.indexOf('baidu') !== -1 ? '<span class="res-tag tag-baidu">百度网盘</span>' : '') + '</div>' +
        '<h3 class="res-title">' + r.title + '</h3><p class="res-desc">' + (r.desc || '') + '</p>' +
        '<div class="res-actions">' +
        (r.url ? '<a class="btn btn-gold res-link" href="' + r.url + '" target="_blank" rel="noopener">打开网盘</a>' : '') +
        (r.code ? '<button class="btn res-code" type="button" data-code="' + r.code + '">提取码 ' + r.code + ' · 点击复制</button>' : '') +
        '</div></article>').join('')
        : '<p style="color:var(--faint);font-size:13px;padding:12px 4px">资料筹备中，协会管理员确定内容后上架。</p>';
    }

    /* v2.49 视频教学区：桶内 videos/videos.json 清单驱动，免登录可播放公开视频 */
    function ensureVideoZone() {
      var host = document.getElementById('resourcesPage');
      if (!host || document.getElementById('videoZone')) return;
      var zone = document.createElement('div');
      zone.id = 'videoZone';
      zone.style.cssText = 'margin:0 16px 16px;padding:18px;border:1px solid rgba(230,199,143,.22);border-radius:14px;background:linear-gradient(145deg,rgba(230,199,143,.05),rgba(255,255,255,.012))';
      zone.innerHTML = '<div style="display:flex;align-items:center;gap:14px;margin-bottom:16px"><span style="font-size:16px;letter-spacing:.18em;color:#e6c78f">视频教学</span><span style="flex:1;height:1px;background:rgba(230,199,143,.14)"></span><button id="xhVideoUp" class="btn" type="button" style="min-height:32px;font-size:12px">上传视频</button></div><div id="videoList" class="video-list"><p style="color:var(--faint);font-size:12px;text-align:center;padding:14px 0">正在载入视频…</p></div>';
      if (localStorage.getItem('hub_token')) {
        setTimeout(function () {
          var up = document.getElementById('xhVideoUp');
          if (up) up.onclick = uploadVideoFlow;
        }, 0);
      } else {
        setTimeout(function () { var up = document.getElementById('xhVideoUp'); if (up) up.style.display = 'none'; }, 0);
      }
      var card = document.getElementById('xyCard');
      if (card) host.insertBefore(zone, card); else host.appendChild(zone);
    }
    async function loadVideos() {
      ensureVideoZone();
      var box = document.getElementById('videoList');
      try {
        var resp = await fetch('https://xinghuan-1521583267.cos.ap-nanjing.myqcloud.com/videos/videos.json', { cache: 'no-store' });
        if (!resp.ok) throw new Error('no manifest');
        var payload = await resp.json();
        var vids = Array.isArray(payload) ? payload : (payload.videos || []);
        box.innerHTML = vids.map(function (v) {
          return '<div class="video-item"><video controls preload="metadata"' + (v.poster ? ' poster="' + v.poster + '"' : '') + ' src="' + v.url + '"></video><p>' + v.title + '</p></div>';
        }).join('') || '<p style="color:var(--faint);font-size:12px;text-align:center;padding:14px 0">视频筹备中，敬请期待</p>';
      } catch (e) {
        box.innerHTML = '<p style="color:var(--faint);font-size:12px;text-align:center;padding:14px 0">视频筹备中，敬请期待</p>';
      }
    }


    // ---------- v2.12.6 跨站 SSO：协会官网跳转带 #sso=令牌，自动登录 ----------
    async function trySsoLogin() {
      const m = (location.hash || '').match(/#sso=([A-Za-z0-9]+)/);
      if (!m) return false;
      try {
        const payload = await apiFetch('/me', { method: 'POST', body: { token: m[1] } });
        if (!payload || payload.code !== 0) return false;
        const u = payload.data || {};
        localStorage.setItem('hub_token', m[1]);
    setLoggedIn({ ...u, token: m[1] });
        history.replaceState(null, '', location.pathname + location.search); // 抹掉令牌
        setConnection('online', '已连接');
        showToast('已通过协会官网登录，欢迎 ' + (u.name || u.username || '成员'));
        await Promise.allSettled([loadRecords(), loadClassroomCourses()]);
        return true;
      } catch (e) { console.warn('[sso] 自动登录失败', e); return false; }
    }


    // ---------- v2.13 TRTC 语音教室（凭证经 SCF /trtc/join，SDK 走腾讯云 v5） ----------
    const trtcState = { client: null, inRoom: false, muted: false, micStarted: false, videoOn: false, remote: new Set() };
    // v2.16.2：优先加载本站自托管 trtc.js，失败再试两个公共 CDN
    async function trtcLoadSdk() {
      if (window.TRTC) return;
      const sources = ['trtc.js', 'https://cdn.jsdelivr.net/npm/trtc-sdk-v5@latest/trtc.js', 'https://web.sdk.qcloud.com/trtc/webrtc/v5/latest/trtc.js'];
      for (const src of sources) {
        try {
          await new Promise((res, rej) => {
            const old = document.querySelector('script[data-trtc]');
            if (old) old.remove();
            const s = document.createElement('script');
            s.src = src; s.dataset.trtc = '1';
            s.onload = res; s.onerror = () => rej(new Error(src));
            document.head.appendChild(s);
          });
          if (window.TRTC) return;
        } catch (e) { console.warn('[trtc] SDK 源失败', src); }
      }
      throw new Error('TRTC SDK 加载失败：请把 trtc.js 下载放到网站根目录（推荐），或检查网络');
    }
    function trtcUpdatePanel() {
      const panel = document.getElementById('trtcPanel');
      const status = document.getElementById('trtcStatus');
      const joinBtn = document.getElementById('trtcJoin');
      const muteBtn = document.getElementById('trtcMute');
      const leaveBtn = document.getElementById('trtcLeave');
      const count = document.getElementById('trtcCount');
      if (!panel) return;
      if (trtcState.inRoom) {
        panel.classList.add('live');
        status.textContent = trtcState.muted ? '已静音' : '连麦中';
        joinBtn.hidden = true; muteBtn.hidden = false; leaveBtn.hidden = false;
        const camBtn = document.getElementById('trtcCam');
        if (camBtn) camBtn.hidden = false;
        muteBtn.textContent = !trtcState.micStarted ? '开启麦克风' : (trtcState.muted ? '取消静音' : '静音');
        count.textContent = '在线 ' + (trtcState.remote.size + 1) + ' 人';
      } else {
        panel.classList.remove('live');
        status.textContent = '未连接';
        joinBtn.hidden = false; muteBtn.hidden = true; leaveBtn.hidden = true;
        const camBtn2 = document.getElementById('trtcCam');
        if (camBtn2) camBtn2.hidden = true;
        count.textContent = '';
      }
    }
    async function trtcJoin() {
      if (trtcState.inRoom) return;
      if (!state.classroom.sessionId || !classroomIsReady()) { showToast('请先连接课堂', true); return; }
      try {
        await trtcLoadSdk();
        const cred = await apiFetch('/trtc/join', { method: 'POST', body: { session_id: state.classroom.sessionId } });
        if (!cred || cred.code !== 0 || !cred.data) { showToast((cred && cred.message) || '语音教室凭证获取失败（检查 SCF /trtc/join 与 TRTC 环境变量）', true); return; }
        const d = cred.data;
        const client = TRTC.create();
        client.on(TRTC.EVENT.REMOTE_AUDIO_AVAILABLE, async (e) => { try { await client.startRemoteAudio({ userId: e.userId }); } catch (err) {} trtcState.remote.add(e.userId); trtcUpdatePanel(); });
        client.on(TRTC.EVENT.REMOTE_AUDIO_UNAVAILABLE, (e) => { trtcState.remote.delete(e.userId); trtcUpdatePanel(); });
        client.on(TRTC.EVENT.REMOTE_VIDEO_AVAILABLE, async (e) => {
          const tile = trtcTile('r-' + e.userId, e.userId.slice(-4));
          try { await client.startRemoteVideo({ userId: e.userId, view: tile }); } catch (err) { console.warn('[trtc] 远程视频订阅失败', err); }
        });
        client.on(TRTC.EVENT.REMOTE_VIDEO_UNAVAILABLE, (e) => trtcRemoveTile('r-' + e.userId));
        await client.enterRoom({ sdkAppId: d.sdk_app_id, userId: d.user_id, userSig: d.user_sig, strRoomId: String(d.room_id) }); // v5：字符串房间号用平级 strRoomId 键
        // v2.17.1：先显式申请麦克风权限（触发浏览器授权框），成功才开麦；失败留房旁听
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true });
          await client.startLocalAudio();
          trtcState.muted = false;
          trtcState.micStarted = true;
        } catch (micErr) {
          console.warn('[trtc] 麦克风未授权/不可用', micErr);
          showToast('麦克风未授权：已进房（旁听）。点面板上「开启麦克风」重新授权', true);
          trtcState.muted = true;
          trtcState.micStarted = false;
        }
        trtcState.client = client;
        trtcState.inRoom = true;
        trtcState.remote.clear();
        trtcUpdatePanel();
        showToast('已进入语音教室');
      } catch (e) {
        console.error('[trtc] 加入失败', e);
        showToast('加入语音教室失败：' + (e.message || e), true);
      }
    }
    async function trtcLeave() {
      if (!trtcState.inRoom) return;
      try { if (trtcState.client) await trtcState.client.exitRoom(); } catch (e) {}
      trtcState.client = null;
      trtcState.inRoom = false;
      trtcState.muted = false;
      trtcState.micStarted = false;
      trtcState.videoOn = false;
      trtcState.remote.clear();
      document.getElementById('trtcVideoWall').innerHTML = '';
      document.getElementById('trtcVideoWall').hidden = true;
      trtcUpdatePanel();
      showToast('已离开语音教室');
    }

    // ---------- v2.13 视频：本地摄像头 + 远程画面订阅 ----------
    function trtcTile(id, name) {
      const wall = document.getElementById('trtcVideoWall');
      let tile = document.getElementById('tile-' + id);
      if (tile) return tile;
      tile = document.createElement('div');
      tile.className = 'trtc-tile';
      tile.id = 'tile-' + id;
      tile.innerHTML = '<div class="tile-name">' + (name || id) + '</div>';
      wall.appendChild(tile);
      wall.hidden = false;
      return tile;
    }
    function trtcRemoveTile(id) {
      const tile = document.getElementById('tile-' + id);
      if (tile) tile.remove();
      const wall = document.getElementById('trtcVideoWall');
      if (wall && !wall.children.length) wall.hidden = true;
    }
    async function trtcToggleCamera() {
      if (!trtcState.inRoom || !trtcState.client) return;
      const camBtn = document.getElementById('trtcCam');
      try {
        if (trtcState.videoOn) {
          await trtcState.client.stopLocalVideo();
          trtcRemoveTile('local');
          trtcState.videoOn = false;
          camBtn.textContent = '摄像头';
        } else {
          const tile = trtcTile('local', '我');
          await trtcState.client.startLocalVideo({ view: tile });
          trtcState.videoOn = true;
          camBtn.textContent = '关摄像头';
        }
      } catch (e) {
        console.error('[trtc] 摄像头切换失败', e);
        showToast('摄像头开启失败：' + (e.message || e), true);
        trtcRemoveTile('local');
        trtcState.videoOn = false;
      }
    }

    async function trtcToggleMute() {
      if (!trtcState.inRoom || !trtcState.client) return;
      // v2.17.1：从未开麦成功 → 走授权重试流程
      if (!trtcState.micStarted) {
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true });
          await trtcState.client.startLocalAudio();
          trtcState.micStarted = true;
          trtcState.muted = false;
          showToast('麦克风已开启');
        } catch (e) {
          console.warn('[trtc] 重试开麦失败', e);
          showToast('仍无法开启麦克风：请检查浏览器地址栏的麦克风权限（锁图标→网站设置→麦克风→允许）', true);
        }
        trtcUpdatePanel();
        return;
      }
      try {
        if (trtcState.muted) { await trtcState.client.unmuteLocalAudio(); trtcState.muted = false; }
        else { await trtcState.client.muteLocalAudio(); trtcState.muted = true; }
      } catch (e) {}
      trtcUpdatePanel();
    }


    // ---------- v2.14 课程管理（系列/讲次/上课/邀请码） ----------
    const caState = { series: [], lectures: [], seriesId: '', liveLecture: null };
    async function caApi(path, body) {
      return apiFetch(path, { method: 'POST', body: body || {} });
    }
    async function caLoadSeries() {
      const r = await caApi('/lecture/series/list');
      caState.series = (r && r.data) || [];
      const sel = document.getElementById('caSeries');
      sel.innerHTML = '<option value="">选择系列课程</option>' + caState.series.map(s =>
        '<option value="' + s._id + '">' + s.title + '</option>').join('');
      if (caState.seriesId) sel.value = caState.seriesId;
      else if (caState.series.length) { caState.seriesId = caState.series[0]._id; sel.value = caState.seriesId; }
      await caLoadLectures();
    }
    async function caLoadLectures() {
      if (!caState.seriesId) { document.getElementById('caLectures').innerHTML = '<p style="color:#5c7194;font-size:12px">请先新建系列课程</p>'; return; }
      const r = await caApi('/lecture/list', { series_id: caState.seriesId });
      caState.lectures = (r && r.data) || [];
      const statusName = { scheduled: '未开始', live: '上课中', ended: '已结束' };
      document.getElementById('caLectures').innerHTML = caState.lectures.length ? caState.lectures.map(l => {
        const live = l.status === 'live';
        return '<div style="display:flex;align-items:center;gap:12px;padding:12px 14px;border:1px solid rgba(124,167,220,.14);border-radius:11px;background:rgba(255,255,255,.015);flex-wrap:wrap">' +
          '<span style="font-size:13px;color:#eaf2fb;min-width:200px"><b>' + l.title + '</b> <span style="color:#5c7194;font-size:11px">' + (l.date || '') + '</span></span>' +
          '<span style="font-size:11px;padding:3px 12px;border-radius:999px;border:1px solid ' + (live ? 'rgba(134,181,160,.5);color:#86b5a0' : 'rgba(124,167,220,.25);color:#93a7c4') + '">' + (statusName[l.status] || l.status) + '</span>' +
          (live ? '<span style="font-size:14px;color:#e6c78f;letter-spacing:.15em">邀请码 <b>' + l.invite_code + '</b></span>' : '') +
          '<span style="flex:1"></span>' +
          (l.status !== 'live' ? '<button class="btn btn-gold" style="min-height:32px;font-size:12px" onclick="caStart(\'' + l._id + '\')">开始上课</button>' : '<button class="btn" style="min-height:32px;font-size:12px" onclick="caEnd(\'' + l._id + '\')">结束上课</button>') +
          '<button class="btn" style="min-height:32px;font-size:12px" onclick="caQuestions(\'' + l._id + '\',\'' + String(l.title).replace(/'/g, '&#39;') + '\')">题目</button>' +
          '<button class="btn" style="min-height:32px;font-size:12px" onclick="caDelLecture(\'' + l._id + '\',\'' + l.title + '\')">删除</button>' +
          '</div>';
      }).join('') : '<p style="color:#5c7194;font-size:12px">该系列还没有讲次，点"新建讲次"</p>';
    }
    window.caStart = async (id) => {
      const custom = await uiPrompt({ title: '开始上课', sub: '邀请码留空则自动生成 4 位数字', fields: [{ id: 'code', label: '邀请码（可自定义）', placeholder: '4 位数字，可留空' }] });
      if (custom === null) return;
      const r = await caApi('/lecture/start', { lecture_id: id, invite_code: custom });
      if (!r || r.code !== 0) { showToast((r && r.message) || '开始上课失败', true); return; }
      liveLecture = { _id: r.data.lecture_id };
      applyLectureGate();
      switchPage('classroom'); // 直接进入监控中枢
      showToast('上课已开始，邀请码：' + r.data.invite_code);
      state.classroom.sessionId = 'lecture_' + r.data.lecture_id; // 语音教室房间
      await caLoadLectures();
      trtcJoin(); // 默认打开语音教室
      lsOpen({ _id: r.data.lecture_id, title: (caState.lectures.find(l => String(l._id) === String(r.data.lecture_id)) || {}).title || '课堂', invite_code: r.data.invite_code });
    };
    window.caEnd = async (id) => {
      if (!(await uiConfirm('结束本次上课？语音教室与大屏将关闭。', '结束上课'))) return;
      const r = await caApi('/lecture/end', { lecture_id: id });
      if (r && r.code === 0) { showToast('已结束'); if (trtcState.inRoom) trtcLeave(); liveLecture = null; applyLectureGate(); lsClose(); await caLoadLectures(); }
    };
    window.caDelLecture = async (id, title) => {
      if (!(await uiConfirm('删除讲次「' + title + '」？删除后不可恢复。', '删除讲次'))) return;
      await caApi('/lecture/del', { lecture_id: id });
      await caLoadLectures();
    };
    function caBind() {
      const sel = document.getElementById('caSeries');
      if (sel) sel.onchange = () => { caState.seriesId = sel.value; caLoadLectures(); };
      const addLec = document.getElementById('caLectureAdd');
      if (addLec) addLec.onclick = async () => {
        if (!caState.seriesId) { showToast('请先选择/新建系列', true); return; }
        const v = await uiPrompt({
          title: '新建讲次',
          fields: [
            { id: 'title', label: '讲次标题', placeholder: '如：恒星专题第一讲' },
            { id: 'date', label: '日期（YYYY-MM-DD，可空）', placeholder: 'YYYY-MM-DD' },
            { id: 'code', label: '自定义邀请码（可空，开始上课时可再设）', placeholder: '如 8848' }
          ]
        });
        if (!v) return;
        if (!v.title) { showToast('请填写讲次标题', true); return; }
        const r = await caApi('/lecture/save', { series_id: caState.seriesId, title: v.title, date: v.date, invite_code: v.code });
        if (r && r.code === 0) await caLoadLectures(); else showToast((r && r.message) || '创建失败', true);
      };
    }


    // ---------- v2.15 线上课堂：邀请码进入 / 提问墙 / 连麦申请 / 禁言体系 ----------
    const ocState = { lecture: null, timer: null, myMic: 'normal' };
    function ocOpen() { document.getElementById('onlineClass').classList.add('open'); ocPoll(true); }
    function ocClose() {
      document.getElementById('onlineClass').classList.remove('open');
      if (ocState.lecture && trtcState.inRoom && ocState.myMic !== 'normal') trtcLeave();
      clearInterval(ocState.timer);
      ocState.lecture = null; ocState.myMic = 'normal';
    }
    async function ocJoin(mode) {
      if (!classroomIsReady()) { showToast('请先登录成员账号', true); return; }
      const code = (document.getElementById('lectureCode').value || '').trim();
      if (!code) { showToast('请输入邀请码', true); return; }
      const r = await apiFetch(mode === 'checkin' ? '/lecture/checkin' : '/lecture/join', { method: 'POST', body: { code } });
      if (!r || r.code !== 0) { showToast((r && r.message) || '进入失败', true); return; }
      ocState.lecture = r.data.lecture;
      document.getElementById('ocTitle').textContent = ocState.lecture.title + (mode === 'checkin' ? ' · 已签到' : '');
      ocOpen();
      showToast(mode === 'checkin' ? '签到成功' : '已进入线上课堂');
    }
    async function ocAsk() {
      const input = document.getElementById('ocAsk');
      const content = input.value.trim();
      if (!content || !ocState.lecture) return;
      const r = await apiFetch('/lecture/ask', { method: 'POST', body: { lecture_id: ocState.lecture._id, content } });
      if (!r || r.code !== 0) { showToast((r && r.message) || '发送失败', true); return; }
      input.value = '';
      ocPoll(true);
    }
    async function ocMicRequest() {
      if (!ocState.lecture) return;
      const r = await apiFetch('/lecture/mic_request', { method: 'POST', body: { lecture_id: ocState.lecture._id } });
      if (!r || r.code !== 0) { showToast((r && r.message) || '申请失败', true); return; }
      showToast('连麦申请已发送，等待教师批准');
      ocPoll(true);
    }
    async function ocPoll(force) {
      if (!ocState.lecture) return;
      const id = ocState.lecture._id;
      const [chats, roster] = await Promise.all([
        apiFetch('/lecture/chats', { method: 'POST', body: { lecture_id: id } }),
        apiFetch('/lecture/attendance', { method: 'POST', body: { lecture_id: id } })
      ]);
      const list = (chats && chats.data) || [];
      document.getElementById('ocChats').innerHTML = list.map(x =>
        '<div class="oc-chat"><b>' + x.member_name + '</b>' + String(x.content).replace(/</g, '&lt;') +
        '<time>' + new Date(x.at).toLocaleTimeString('zh-CN', { hour12: false }) + '</time></div>').join('')
        || '<div class="oc-chat" style="color:#5c7194">还没有提问</div>';
      const people = (roster && roster.data) || [];
      const me = people.find(p => String(p.member_id) === String((state.user || {})._id));
      ocState.myMic = me ? (me.mic || 'normal') : 'normal';
      document.getElementById('ocMicBox').innerHTML = ocState.myMic === 'normal'
        ? '<button class="btn btn-gold" style="min-height:34px;font-size:12px" id="ocMicBtn">申请连麦</button>'
        : '<span class="oc-person"><span class="tag ' + (ocState.myMic === 'muted' ? 'muted' : ocState.myMic === 'live' ? 'live' : 'req') + '">' +
          ({ requesting: '申请中，等待批准', live: '连麦中', muted: '已被禁言' }[ocState.myMic] || ocState.myMic) + '</span></span>';
      const mb = document.getElementById('ocMicBtn');
      if (mb) mb.onclick = ocMicRequest;
      document.getElementById('ocRoster').innerHTML = people.map(p =>
        '<div class="oc-person"><span>' + p.member_name + '</span>' +
        '<span class="tag ' + (p.mode === 'online' ? 'online' : '') + '">' + (p.mode === 'online' ? '线上' : '现场') + '</span>' +
        (p.mic && p.mic !== 'normal' ? '<span class="tag ' + (p.mic === 'live' ? 'live' : p.mic === 'muted' ? 'muted' : 'req') + '">' +
          ({ requesting: '申请连麦', live: '连麦中', muted: '禁言中' }[p.mic]) + '</span>' : '') +
        '</div>').join('') || '<div class="oc-person" style="color:#5c7194">暂无成员</div>';
      // 连麦状态驱动本地音频 + 全员屏蔽被禁言者
      if (ocState.myMic === 'live' && !trtcState.inRoom && ocState.lecture) {
        state.classroom.sessionId = 'lecture_' + ocState.lecture._id;
        trtcJoin();
      }
      if (trtcState.client && trtcState.inRoom) {
        if (ocState.myMic === 'live' && !trtcState.muted) { try { await trtcState.client.unmuteLocalAudio(); } catch (e) {} }
        else { try { await trtcState.client.muteLocalAudio(); } catch (e) {} }
        for (const p of people) {
          if (String(p.member_id) === String((state.user || {})._id)) continue;
          if (!p.mic || p.mic !== 'live') { try { trtcState.client.muteRemoteAudio({ userId: String(p.member_id) }); } catch (e) {} }
          else { try { trtcState.client.unmuteRemoteAudio({ userId: String(p.member_id) }); } catch (e) {} }
        }
      }
      // 教师端：同步刷新大屏
      if (document.getElementById('lectureScreen') && !document.getElementById('lectureScreen').hidden) lsRender(list, people);
      qzStudentRender();
      lsQuizRender();
      grpLoad();
      if (document.getElementById('lectureScreen') && !document.getElementById('lectureScreen').hidden) { lsGroupsRender(); lsCheatsRender(); }
    }
    // 教师大屏
    async function lsOpen(lecture) {
      ocState.lecture = lecture;
      document.getElementById('lsTitle').textContent = lecture.title;
      document.getElementById('lsCode').textContent = '邀请码 ' + lecture.invite_code;
      document.getElementById('lectureScreen').hidden = false;
      ocState.timer = setInterval(() => ocPoll(), 4000);
      ocPoll(true);
    }
    function lsClose() {
      document.getElementById('lectureScreen').hidden = true;
      clearInterval(ocState.timer);
      ocState.lecture = null;
    }
    function lsRender(list, people) {
      document.getElementById('lsChats').innerHTML = list.map(x =>
        '<div class="oc-chat"><b>' + x.member_name + '</b>' + String(x.content).replace(/</g, '&lt;') +
        '<time>' + new Date(x.at).toLocaleTimeString('zh-CN', { hour12: false }) + '</time></div>').join('')
        || '<div class="oc-chat" style="color:#5c7194">还没有提问</div>';
      const micName = { requesting: '申请连麦', live: '连麦中', muted: '禁言中', normal: '' };
      document.getElementById('lsMics').innerHTML = people.map(p =>
        '<div class="oc-person"><span class="grow">' + p.member_name + '</span>' +
        (p.mic && p.mic !== 'normal' ? '<span class="tag ' + (p.mic === 'live' ? 'live' : p.mic === 'muted' ? 'muted' : 'req') + '">' + micName[p.mic] + '</span>' : '') +
        (p.mic === 'requesting' ? '<button onclick="ocMicSet(\'' + p._id + '\',\'live\')">批准</button>' : '') +
        (p.mic === 'live' ? '<button onclick="ocMicSet(\'' + p._id + '\',\'muted\')">禁言</button>' : '') +
        (p.mic === 'muted' ? '<button onclick="ocMicSet(\'' + p._id + '\',\'live\')">解除禁言</button>' : '') +
        (p.mic !== 'normal' ? '<button onclick="ocMicSet(\'' + p._id + '\',\'normal\')">下麦</button>' : '') +
        '</div>').join('') || '<div class="oc-person" style="color:#5c7194">暂无成员</div>';
    }
    window.ocMicSet = async (pid, mic) => {
      await apiFetch('/lecture/mic_set', { method: 'POST', body: { participant_id: pid, mic } });
      ocPoll(true);
    };


    // ---------- v2.16 题目系统：教师出题/发布/结果 + 学生作答 + 大屏人员墙 ----------
    const qzState = { lectureId: '', answered: new Set() };
    function qzApi(path, body) { return apiFetch(path, { method: 'POST', body: body || {} }); }
    // 教师：打开管理弹窗
    window.caQuestions = async (lectureId, title) => {
      qzState.lectureId = lectureId;
      document.getElementById('qModalTitle').textContent = '题目管理 · ' + title;
      document.getElementById('qModal').classList.add('open');
      await qzLoad();
    };
    async function qzLoad() {
      const r = await qzApi('/lecture/q/list', { lecture_id: qzState.lectureId });
      const list = (r && r.data) || [];
      const typeName = { choice: '选择', judge: '判断', vote: '投票', blank: '填空' };
      const stName = { draft: '草稿', published: '已发布', closed: '已结束' };
      document.getElementById('qList').innerHTML = list.map(q =>
        '<div class="oc-person"><span class="grow"><b>' + q.title + '</b> ' +
        '<span class="tag">' + typeName[q.type] + '</span>' + (q.anonymous ? '<span class="tag">匿名</span>' : '') + '</span>' +
        '<span class="tag ' + (q.status === 'published' ? 'live' : '') + '">' + stName[q.status] + '</span>' +
        (q.status === 'published' ? '<button onclick="showQr(\'' + qzState.lectureId + '\',\'' + q._id + '\')">二维码</button>' : '') +
        (q.status !== 'published' ? '<button onclick="qzPublish(\'' + q._id + '\')">发布</button>' : '<button onclick="qzClose(\'' + q._id + '\')">结束</button>') +
        '<button onclick="qzResults(\'' + q._id + '\')">结果</button>' +
        '<button onclick="qzDel(\'' + q._id + '\')">删除</button></div>'
      ).join('') || '<p style="color:#5c7194;font-size:12px">还没有题目，在上方创建</p>';
    }
    window.qzPublish = async (id) => { await qzApi('/lecture/q/publish', { question_id: id }); qzLoad(); showToast('题目已发布'); };
    window.qzClose = async (id) => { await qzApi('/lecture/q/close', { question_id: id }); qzLoad(); };
    window.qzDel = async (id) => { if (confirm('删除题目？')) { await qzApi('/lecture/q/del', { question_id: id }); qzLoad(); } };
    window.qzResults = async (id) => {
      const r = await qzApi('/lecture/q/results', { question_id: id });
      if (!r || r.code !== 0) return;
      uiInfo('题目结果', qzFormatResults(r.data));
    };
    function qzFormatResults(d) {
      let s = d.question.title + '\n共 ' + d.total + ' 人作答' + (d.question.anonymous ? '（匿名模式）' : '') + '\n';
      if (d.per_option && d.per_option.length) d.per_option.forEach(o => { s += o.key + '. ' + o.text + ' — ' + o.count + ' 人' + (o.names && o.names.length ? '：' + o.names.join('、') : '') + '\n'; });
      if (d.question.type === 'judge') s += '对 ' + d.judge.T + ' 人 / 错 ' + d.judge.F + ' 人\n';
      if (d.blanks && d.blanks.length) s += '\n填空作答：\n' + d.blanks.map(b => b.name + '：' + b.content).join('\n');
      return s;
    }
    // 学生：拉已发布题目并渲染作答
    async function qzStudentRender() {
      const box = document.getElementById('ocQuizBox');
      if (!box || !ocState.lecture) return;
      const r = await qzApi('/lecture/q/list', { lecture_id: ocState.lecture._id });
      const list = ((r && r.data) || []).filter(q => q.status === 'published');
      if (!list.length) { box.innerHTML = '<p style="color:#5c7194;font-size:12px">教师还未发布题目</p>'; return; }
      box.innerHTML = list.map(q => {
        if (qzState.answered.has(q._id)) return '<div class="oc-person"><span class="grow"><b>' + q.title + '</b></span><span class="tag live">已作答</span></div>';
        if (q.type === 'blank') {
          return '<div style="border:1px solid rgba(124,167,220,.14);border-radius:10px;padding:10px 12px;margin-bottom:8px">' +
            '<div style="font-size:12px;color:#eaf2fb;margin-bottom:8px"><b>填空</b> · ' + q.title + '</div>' +
            '<div style="display:flex;gap:6px"><input id="qb-' + q._id + '" placeholder="你的答案" style="flex:1;padding:8px 12px;border:1px solid rgba(124,167,220,.2);border-radius:999px;background:rgba(255,255,255,.03);color:#eaf2fb;font-size:12px;outline:none" />' +
            '<button class="btn btn-gold" style="min-height:32px;font-size:11px" onclick="qzAnswerBlank(\'' + q._id + '\')">提交</button></div></div>';
        }
        if (q.type === 'judge') {
          return '<div style="border:1px solid rgba(124,167,220,.14);border-radius:10px;padding:10px 12px;margin-bottom:8px">' +
            '<div style="font-size:12px;color:#eaf2fb;margin-bottom:8px"><b>判断</b> · ' + q.title + '</div>' +
            '<div style="display:flex;gap:6px"><button class="btn btn-gold" style="min-height:32px;font-size:11px" onclick="qzAnswer(\'' + q._id + '\',null,\'T\')">对</button>' +
            '<button class="btn" style="min-height:32px;font-size:11px" onclick="qzAnswer(\'' + q._id + '\',null,\'F\')">错</button></div></div>';
        }
        const multi = q.type === 'choice';
        return '<div style="border:1px solid rgba(124,167,220,.14);border-radius:10px;padding:10px 12px;margin-bottom:8px">' +
          '<div style="font-size:12px;color:#eaf2fb;margin-bottom:8px"><b>' + (multi ? '选择' : '投票') + '</b> · ' + q.title + (multi ? '（可多选）' : '') + '</div>' +
          '<div style="display:flex;flex-wrap:wrap;gap:6px">' + (q.options || []).map(o =>
            '<button class="btn" style="min-height:32px;font-size:11px" onclick="qzAnswer(\'' + q._id + '\',[\'' + o.key + '\'],null)">' + o.key + '. ' + o.text + '</button>').join('') + '</div></div>';
      }).join('');
    }
    window.qzAnswer = async (qid, keys, judge) => {
      const r = await qzApi('/lecture/q/answer', { question_id: qid, option_keys: keys || [], judge: judge || '' });
      if (!r || r.code !== 0) { showToast((r && r.message) || '提交失败', true); return; }
      qzState.answered.add(qid);
      showToast('已提交');
      qzStudentRender();
    };
    window.qzAnswerBlank = async (qid) => {
      const v = (document.getElementById('qb-' + qid) || {}).value || '';
      const r = await qzApi('/lecture/q/answer', { question_id: qid, content: v });
      if (!r || r.code !== 0) { showToast((r && r.message) || '提交失败', true); return; }
      qzState.answered.add(qid);
      showToast('已提交');
      qzStudentRender();
    };
    // 大屏：展示当前发布题的结果（每选项人员名单，匿名只显示人数）
    async function lsQuizRender() {
      const box = document.getElementById('lsQuiz');
      if (!box) return;
      if (!ocState.lecture) { box.innerHTML = ''; return; }
      const r = await qzApi('/lecture/q/list', { lecture_id: ocState.lecture._id });
      const live = ((r && r.data) || []).filter(q => q.status === 'published');
      if (!live.length) { box.innerHTML = '<p style="color:#5c7194;font-size:12px">暂无进行中的题目</p>'; return; }
      let html = '';
      for (const q of live) {
        const res = await qzApi('/lecture/q/results', { question_id: q._id });
        const d = (res && res.data) || { total: 0, per_option: [], judge: { T: 0, F: 0 }, blanks: [] };
        html += '<div style="border:1px solid rgba(124,167,220,.16);border-radius:12px;padding:14px;margin-bottom:10px">' +
          '<div style="font-size:14px;color:#eaf2fb;margin-bottom:4px"><b>' + q.title + '</b>' + (q.anonymous ? '<span class="tag" style="margin-left:8px">匿名</span>' : '') +
          '<button class="res-btn" style="margin-left:10px" onclick="showQr(\'' + ocState.lecture._id + '\',\'' + q._id + '\')">投屏二维码</button></div>' +
          '<div style="font-size:11px;color:#5c7194;margin-bottom:10px">已作答 ' + d.total + ' 人 · 实时刷新</div>';
        if (d.per_option && d.per_option.length) {
          const max = Math.max(1, ...d.per_option.map(o => o.count));
          d.per_option.forEach(o => {
            html += '<div style="margin-bottom:8px"><div style="display:flex;justify-content:space-between;font-size:12px;color:#d8dee6"><span>' + o.key + '. ' + o.text + '</span><span>' + o.count + ' 人</span></div>' +
              '<div style="height:6px;border-radius:999px;background:rgba(255,255,255,.06);margin-top:4px"><div style="height:100%;width:' + Math.round(o.count / max * 100) + '%;border-radius:999px;background:linear-gradient(90deg,#2f7fe0,#7cc7ff)"></div></div>' +
              (o.names && o.names.length ? '<div style="font-size:11px;color:#93a7c4;margin-top:4px">' + o.names.join('、') + '</div>' : '') + '</div>';
          });
        } else if (q.type === 'judge') {
          html += '<div style="font-size:13px;color:#d8dee6">对 ' + d.judge.T + ' 人 / 错 ' + d.judge.F + ' 人</div>';
        }
        if (d.blanks && d.blanks.length) html += '<div style="font-size:11px;color:#93a7c4;margin-top:6px">' + d.blanks.map(b => b.name + '：' + b.content).join('<br>') + '</div>';
        html += '</div>';
      }
      box.innerHTML = html;
    }


    // ---------- v2.16.3 监控中枢闸门：必须先创建并开始课堂 ----------
    let liveLecture = null;
    async function checkLiveLecture() {
      try {
        const r = await apiFetch('/lecture/live', { method: 'POST', body: {} });
        liveLecture = ((r && r.data) || [])[0] || null;
      } catch (e) { liveLecture = null; }
      applyLectureGate();
    }
    function applyLectureGate() {
      const u = state.user || {};
      const isT = u.super_admin === true || u.role === 'admin' || u.course_teacher === true;
      const gate = document.getElementById('lectureGate');
      if (!gate) return;
      gate.hidden = !isT || Boolean(liveLecture); // 教师且没有进行中的课 → 显示闸门
    }


    // ---------- v2.16.5 通用模态框（替代原生 prompt/confirm/alert） ----------
    function uiOpen() { document.getElementById('uiModal').classList.add('open'); }
    function uiClose() { document.getElementById('uiModal').classList.remove('open'); }
    // fields: [{id,label,placeholder,value,password}]
    function uiPrompt(opts) {
      return new Promise(resolve => {
        document.getElementById('uiTitle').textContent = opts.title || '';
        document.getElementById('uiSub').textContent = opts.sub || '';
        document.getElementById('uiInfoBody').style.display = 'none';
        const box = document.getElementById('uiFields');
        box.style.display = 'grid';
        box.innerHTML = (opts.fields || []).map(f =>
          '<div class="field"><label>' + (f.label || '') + '</label><input id="' + f.id + '" placeholder="' + (f.placeholder || '') +
          '" value="' + String(f.value || '').replace(/"/g, '&quot;') + '"' + (f.password ? ' type="password"' : '') + ' /></div>').join('');
        const cancel = document.getElementById('uiCancel');
        const ok = document.getElementById('uiOk');
        cancel.style.display = '';
        cancel.textContent = '取 消';
        ok.textContent = opts.okText || '确 定';
        cancel.onclick = () => { uiClose(); resolve(null); };
        ok.onclick = () => {
          const vals = {};
          (opts.fields || []).forEach(f => vals[f.id] = (document.getElementById(f.id).value || '').trim());
          uiClose();
          resolve((opts.fields || []).length <= 1 ? vals[(opts.fields[0] || {}).id] : vals);
        };
        document.getElementById('uiModal').onclick = e => { if (e.target.id === 'uiModal') { uiClose(); resolve(null); } };
        uiOpen();
        const first = box.querySelector('input');
        if (first) setTimeout(() => first.focus(), 60);
      });
    }
    function uiConfirm(text, title) {
      return new Promise(resolve => {
        document.getElementById('uiTitle').textContent = title || '请确认';
        document.getElementById('uiSub').textContent = text || '';
        document.getElementById('uiInfoBody').style.display = 'none';
        document.getElementById('uiFields').style.display = 'none';
        const cancel = document.getElementById('uiCancel');
        const ok = document.getElementById('uiOk');
        cancel.style.display = ''; ok.textContent = '确 定';
        cancel.onclick = () => { uiClose(); resolve(false); };
        ok.onclick = () => { uiClose(); resolve(true); };
        document.getElementById('uiModal').onclick = e => { if (e.target.id === 'uiModal') { uiClose(); resolve(false); } };
        uiOpen();
      });
    }
    function uiInfo(title, content) {
      document.getElementById('uiTitle').textContent = title || '';
      document.getElementById('uiSub').textContent = '';
      const info = document.getElementById('uiInfoBody');
      info.style.display = 'block';
      info.textContent = content || '';
      document.getElementById('uiFields').style.display = 'none';
      const cancel = document.getElementById('uiCancel');
      const ok = document.getElementById('uiOk');
      cancel.style.display = 'none';
      ok.textContent = '关 闭';
      ok.onclick = () => uiClose();
      document.getElementById('uiModal').onclick = e => { if (e.target.id === 'uiModal') uiClose(); };
      uiOpen();
    }


    // ---------- v2.18 工作台（成员管理/资料管理/日志，多组织） ----------
    const ORG_DEFS = {
      astro: { name: '中国海洋大学天文协会', logo: 'ouc-astro-logo.png' },
      nankai_astro: { name: '南开大学天文协会', logo: 'nankai-logo.png' },
      metaverse: { name: '元宇宙发展协会', logo: 'logo.png' }
    };
    const wbState = { members: [], isAdmin: false };
    // 经 SCF /member-bridge 中转调用 memberService（鉴权透传）
    async function wbCall(action, data) {
      const response = await fetch(SCF_API + '/member-bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Member-Token': state.user.token },
        body: JSON.stringify({ action, data: data || {} })
      });
      return response.json();
    }
    function wbSetup() {
      const u = state.user || {};
      const orgKey = normalizeOrg(u.org || 'astro');
      const def = ORG_DEFS[orgKey] || ORG_DEFS.astro;
      const logoEl = document.getElementById('wbLogo');
      if (logoEl) logoEl.src = def.logo;
      const titleEl = document.getElementById('wbTitle');
      const orgEl = document.getElementById('wbOrgName');
      if (u.super_admin === true) {
        /* v2.46 平台视角：最高权限不挂靠任何社团 */
        if (titleEl) titleEl.textContent = '星环终端 · 工作台';
        if (orgEl) orgEl.textContent = 'PLATFORM / 平台管理视图';
      } else if (u.admin_scope === 'platform') {
        if (titleEl) titleEl.textContent = '星环终端 · 工作台';
        if (orgEl) orgEl.textContent = 'PLATFORM / 星环终端管理员视图';
      } else {
        if (titleEl) titleEl.textContent = def.name + ' · 工作台';
        if (orgEl) orgEl.textContent = 'ORG / ' + orgKey + (wbState.isAdmin ? ' · 管理员视图' : ' · 只读视图');
      }
      /* v2.46 我的资料：所有登录用户可完善学校/校区/专业/联系方式 */
      if (!document.getElementById('wbMeTab')) {
        var tabs2 = document.querySelector('.wb-tabs');
        if (tabs2) {
          var meTab = document.createElement('button');
          meTab.className = 'wb-tab'; meTab.id = 'wbMeTab'; meTab.dataset.wbt = 'me';
          meTab.type = 'button'; meTab.textContent = '我的资料';
          tabs2.insertBefore(meTab, tabs2.firstChild);
          var mePanel = document.createElement('div');
          mePanel.id = 'wbMe'; mePanel.hidden = true; mePanel.style.padding = '16px 18px';
          mePanel.innerHTML =
            '<div class="ap-toolbar"><span style="color:var(--faint);font-size:12px">完善个人信息（学校/校区/专业为必填，联系方式选填）</span></div>' +
            '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;max-width:900px">' +
            [['school','学校（必填）','如：中国海洋大学'],['campus','校区（必填）','如：崂山校区'],['major','专业（必填）','如：物理学'],['department','社团部门','选填'],['phone','手机号','选填'],['email','邮箱','选填'],['wechat','微信','选填'],['qq','QQ','选填']].map(function (f) {
              return '<div class="field" style="display:grid;gap:6px"><label style="font-size:10px;letter-spacing:.2em;color:#5c7194">' + f[1] + '</label>' +
                '<input data-pf="' + f[0] + '" placeholder="' + f[2] + '" style="padding:11px 14px;border:1px solid rgba(124,167,220,.2);border-radius:11px;background:rgba(255,255,255,.03);color:#eaf2fb;font-size:13px;outline:none;font-family:inherit" /></div>';
            }).join('') +
            '</div>' +
            '<div style="margin-top:16px;display:flex;gap:12px;align-items:center"><button class="btn btn-gold" id="wbMeSave" type="button" style="min-height:38px;font-size:13px">保存资料</button><span id="wbMeMsg" style="font-size:12px;color:#86b5a0"></span></div>';
          var body2 = document.querySelector('.wb-body');
          if (body2) body2.insertBefore(mePanel, body2.firstChild);
          meTab.onclick = function () {
            document.querySelectorAll('.wb-tab').forEach(function (x) { x.classList.toggle('active', x === meTab); });
            document.getElementById('wbMembers').hidden = true;
            document.getElementById('wbRes').hidden = true;
            var og2 = document.getElementById('wbOrg'); if (og2) og2.hidden = true;
            var pf = document.getElementById('wbPlatform'); if (pf) pf.hidden = true; var lg = document.getElementById('wbOpLogs'); if (lg) lg.hidden = true;
            mePanel.hidden = false;
            fillProfileForm();
          };
          document.getElementById('wbMeSave').onclick = saveProfile;
        }
      }
      /* v2.46 操作日志公示：所有登录成员可见管理员留痕 */
      if (!document.getElementById('wbLogTab')) {
        var tabs3 = document.querySelector('.wb-tabs');
        if (tabs3) {
          var logTab = document.createElement('button');
          logTab.className = 'wb-tab'; logTab.id = 'wbLogTab'; logTab.dataset.wbt = 'oplogs';
          logTab.type = 'button'; logTab.textContent = '操作日志';
          tabs3.appendChild(logTab);
          var logPanel = document.createElement('div');
          logPanel.id = 'wbOpLogs'; logPanel.hidden = true; logPanel.style.padding = '16px 18px';
          logPanel.innerHTML =
            '<div class="ap-toolbar"><span style="color:var(--faint);font-size:12px">管理员操作留痕 · 全体登录成员可见（公示）</span><span style="flex:1"></span><span id="wbLogCount"></span>' +
            '<button class="res-btn" type="button" onclick="wbLoadOpLogs()">刷新</button></div>' +
            '<div class="ap-table-wrap"><table class="ap-table"><thead><tr><th>时间</th><th>操作人</th><th>动作</th><th>对象</th><th>详情</th></tr></thead><tbody id="wbLogTbody"></tbody></table></div>';
          var body3 = document.querySelector('.wb-body');
          if (body3) body3.appendChild(logPanel);
          logTab.onclick = function () {
            document.querySelectorAll('.wb-tab').forEach(function (x) { x.classList.toggle('active', x === logTab); });
            document.getElementById('wbMembers').hidden = true;
            document.getElementById('wbRes').hidden = true;
            var og3 = document.getElementById('wbOrg'); if (og3) og3.hidden = true;
            var pf3 = document.getElementById('wbPlatform'); if (pf3) pf3.hidden = true; var lg = document.getElementById('wbOpLogs'); if (lg) lg.hidden = true;
            var me3 = document.getElementById('wbMe'); if (me3) me3.hidden = true;
            logPanel.hidden = false;
            wbLoadOpLogs();
          };
        }
      }
      /* v2.43 平台管理入口：仅 super_admin，界面不含任何人名 */
      if ((u.super_admin === true || u.role === 'admin') && !document.getElementById('wbPfTab')) {
        var tabs = document.querySelector('.wb-tabs');
        if (tabs) {
          var tab = document.createElement('button');
          tab.className = 'wb-tab'; tab.id = 'wbPfTab'; tab.dataset.wbt = 'platform';
          tab.type = 'button'; tab.textContent = '平台管理';
          tabs.appendChild(tab);
          var panel = document.createElement('div');
          panel.id = 'wbPlatform'; panel.hidden = true; panel.style.padding = '16px 18px';
          panel.innerHTML =
            '<div class="ap-toolbar"><span style="color:var(--faint);font-size:12px">全部注册用户 · 可任命星环终端管理员与各社团主管理员；社团主管由各社团主管理员在「成员管理」中设置</span>' +
            '<span style="flex:1"></span><span id="wbPfCount"></span>' +
            '<button class="res-btn" type="button" onclick="wbLoadPlatform()">刷新</button></div>' +
            '<div class="ap-table-wrap"><table class="ap-table"><thead><tr><th>姓名</th><th>账号</th><th>社团</th><th>身份</th><th style="width:290px">操作</th></tr></thead><tbody id="wbPfTbody"></tbody></table></div>';
          var body = document.querySelector('.wb-body');
          if (body) body.appendChild(panel);
          tab.onclick = function () {
            document.querySelectorAll('.wb-tab').forEach(function (x) { x.classList.toggle('active', x === tab); });
            document.getElementById('wbMembers').hidden = true;
            document.getElementById('wbRes').hidden = true;
            var og = document.getElementById('wbOrg'); if (og) og.hidden = true;
            panel.hidden = false;
            wbLoadPlatform();
          };
        }
      }
    }
    async function wbLoad() {
      await Promise.allSettled([wbLoadMembers(), wbLoadRes(), wbLoadOrgApps()]);
    }
    async function wbLoadMembers() {
      const r = await wbCall('web_am_list');
      if (r && r.code === 403) { wbState.isAdmin = false; wbSetup(); document.getElementById('wbMembers').innerHTML = '<p style="padding:20px;color:var(--faint);font-size:13px">仅组织管理员可管理成员</p>'; return; }
      wbState.isAdmin = true; wbSetup();
      wbState.members = (r && r.data) || [];
      wbRenderMembers();
    }
    function wbRenderMembers() {
      const q = (document.getElementById('wbSearch').value || '').trim();
      const rows = wbState.members.filter(m => !q || [m.name, m.username, m.department, m.campus].join('|').indexOf(q) !== -1);
      document.getElementById('wbCount').textContent = rows.length + ' / ' + wbState.members.length;
      document.getElementById('wbTbody').innerHTML = rows.map(m => {
        const tags = [];
        if (m.role === 'admin') tags.push('<span class="ap-tag">管理员</span>');
        if (m.subadmin) tags.push('<span class="ap-tag sub">次级管理员</span>');
        return '<tr><td>' + (m.name || '-') + '</td><td>' + (m.username || '-') + '</td><td>' + (m.org || '-') + '</td><td>' +
          (m.department || '-') + '</td><td>' + (tags.join('') || '成员') + '</td>' +
          '<td><div class="ap-rowbtns">' +
          '<button class="ap-mini" onclick="wbEditMember(\'' + m._id + '\',\'' + (m.name || m.username) + '\',\'' + (m.org || '') + '\',\'' + (m.campus || '') + '\',\'' + (m.department || '') + '\')">编辑</button>' +
          '<button class="ap-mini" onclick="wbResetPwd(\'' + m._id + '\',\'' + (m.name || m.username) + '\')">改密</button>' +
          '<button class="ap-mini" onclick="wbSubAdmin(\'' + m._id + '\',\'' + (m.name || m.username) + '\')">次级权限</button>' +
          (String(m.username).indexOf('test') === 0 || m.role !== 'admin' ? '<button class="ap-mini danger" onclick="wbDelMember(\'' + m._id + '\',\'' + (m.name || m.username) + '\')">删除</button>' : '') +
          '</div></td></tr>';
      }).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--faint)">无成员</td></tr>';
    }
    /* v2.46 编辑成员：名称/所在组织/校区/部门；平台管理员全局可改，社团管理员限本社（云端校验） */
    window.wbEditMember = async (id, name, org, campus, department) => {
      const v = await uiPrompt({
        title: '编辑成员 · ' + name,
        fields: [
          { id: 'name', label: '姓名', placeholder: '姓名', value: name || '' },
          { id: 'org', label: '所在组织（astro 海大天协 / bio 生科协 / outdoor 户协 / nankai_astro 南开天协 / guest 游客）', placeholder: 'astro', value: org || '' },
          { id: 'campus', label: '校区', placeholder: '校区', value: campus || '' },
          { id: 'department', label: '部门（可空）', placeholder: '', value: department || '' }
        ]
      });
      if (!v) return;
      if (!v.name) { showToast('姓名不能为空', true); return; }
      const r = await wbCall('web_am_update', { member_id: id, name: v.name, org: v.org, campus: v.campus, department: v.department });
      showToast((r && r.code === 0) ? '已保存' : ('失败：' + ((r && r.message) || '')), !(r && r.code === 0));
      wbLoadMembers();
    };
    window.wbResetPwd = async (id, name) => {
      const pwd = await uiPrompt({ title: '重置密码 · ' + name, fields: [{ id: 'p', label: '新密码（至少 4 位）', password: true }] });
      if (!pwd || !pwd.p) return;
      const r = await wbCall('web_am_reset_pwd', { member_id: id, new_password: pwd.p });
      showToast((r && r.code === 0) ? '密码已重置' : ('失败：' + ((r && r.message) || '')), !(r && r.code === 0));
    };
    window.wbDelMember = async (id, name) => {
      if (!(await uiConfirm('删除成员「' + name + '」？此操作会记入日志。', '删除成员'))) return;
      const r = await wbCall('web_am_delete', { member_id: id });
      showToast((r && r.code === 0) ? '已删除' : ('失败：' + ((r && r.message) || '')), !(r && r.code === 0));
      wbLoadMembers();
    };
    window.wbSubAdmin = async (id, name) => {
      const on = await uiConfirm('将「' + name + '」设为次级管理员？', '次级管理员');
      if (on === null) return;
      const perms = { member_edit: true, member_delete: true, password_reset: true, activity_manage: true, subadmin_manage: false };
      const r = await wbCall('web_am_set_subadmin', { member_id: id, subadmin: on, perms });
      showToast((r && r.code === 0) ? '已保存' : ('失败：' + ((r && r.message) || '')), !(r && r.code === 0));
      wbLoadMembers();
    };
    // v2.29 批量导入成员（每行：姓名,账号,密码，创建即本组织管理员）
    document.getElementById('wbBatchAdd').onclick = async () => {
      const v = await uiPrompt({
        title: '批量导入成员（每行一个：姓名,账号,密码）',
        sub: '导入的账号自动成为本组织管理员，全部记入操作日志',
        fields: [{ id: 'list', label: '成员列表', placeholder: '每行一条：姓名,账号,密码', value: '' }]
      });
      if (!v || !v.list) return;
      const lines = v.list.split('\n').map(l => l.trim()).filter(Boolean);
      let ok = 0, fail = 0;
      showToast('正在导入 ' + lines.length + ' 个账号…');
      for (const line of lines) {
        const parts = line.split(/[,，]/).map(s => s.trim());
        const name = parts[0] || '', username = parts[1] || parts[0] || '', password = parts[2] || parts[1] || '';
        if (!username || !password) { fail++; continue; }
        const r = await wbCall('web_am_member_add', { name: name || username, username, password });
        (r && r.code === 0) ? ok++ : fail++;
      }
      showToast('导入完成：成功 ' + ok + ' 个' + (fail ? '，失败 ' + fail + ' 个' : ''));
      wbLoadMembers();
    };
    document.getElementById('wbAddMember').onclick = async () => {
      const v = await uiPrompt({
        title: '新建成员账号（创建即为本组织管理员）',
        fields: [
          { id: 'name', label: '姓名', placeholder: '成员姓名' },
          { id: 'username', label: '账号（拼音小写全拼）', placeholder: '账号' },
          { id: 'password', label: '密码', placeholder: '初始密码', password: true },
          { id: 'org', label: '组织（全局管理员可指定：astro 海大 / nankai_astro 南开）', placeholder: 'astro' }
        ]
      });
      if (!v || !v.username || !v.password) return;
      const r = await wbCall('web_am_member_add', { name: v.name || v.username, username: v.username, password: v.password, org: v.org || 'astro' });
      showToast((r && r.code === 0) ? '账号已创建（已是本组织管理员）' : ('创建失败：' + ((r && r.message) || '')), !(r && r.code === 0));
      wbLoadMembers();
    };
    async function wbLoadRes() {
      const r = await apiFetch('/res/list', { method: 'POST', body: {} });
      const list = (r && r.data) || [];
      const visName = { public: '公开', shared: '共享', private: '私密' };
      document.getElementById('wbResList').innerHTML = list.map(d =>
        '<div class="ap-li"><span class="grow"><b>' + d.title + '</b> <span style="color:var(--faint)">' +
        ({ theory: '理论', observe: '观测', astro: '天文资料' }[d.cat] || d.cat) + ' · ' + (d.by || '') + '</span>' +
        ' <span class="res-vis vis-' + (d.visibility || 'shared') + '">' + (visName[d.visibility] || '共享') + '</span></span>' +
        (wbState.isAdmin ? '<button class="ap-mini danger" onclick="wbResDel(\'' + d._id + '\')">删除</button>' : '') + '</div>'
      ).join('') || '<div class="ap-li" style="color:var(--faint)">暂无资料</div>';
    }
    window.wbResDel = async (id) => {
      if (!(await uiConfirm('删除该资料？', '删除资料'))) return;
      await apiFetch('/res/del', { method: 'POST', body: { id } });
      wbLoadRes();
    };
    document.getElementById('wbResAdd').onclick = async () => {
      const v = await uiPrompt({
        title: '上传资料（海大/南开管理员均可，天文资料两组织共享）',
        fields: [
          { id: 'title', label: '标题', placeholder: '如：梅西耶天体观测指南' },
          { id: 'cat', label: '分类（theory 理论 / observe 观测 / astro 天文资料）', placeholder: 'astro' },
          { id: 'url', label: '网盘链接（可空，空则走文件）', placeholder: 'https://...' },
          { id: 'code', label: '提取码（可空）', placeholder: '' },
          { id: 'visibility', label: '可见范围：public 公开（免登录）/ shared 登录可见 / private 仅本社', placeholder: 'shared' }
        ]
      });
      if (!v || !v.title) return;
      const vis = ['public', 'shared', 'private'].indexOf(v.visibility) !== -1 ? v.visibility : 'shared';
      let data = { title: v.title, cat: v.cat || 'observe', kind: 'link', url: v.url, code: v.code, visibility: vis };
      if (!v.url) {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        const file = await new Promise(res => { fileInput.onchange = () => res(fileInput.files[0] || null); fileInput.click(); });
        if (!file) { showToast('未选择文件', true); return; }
        if (file.size > 8 * 1024 * 1024) { showToast('文件超过 8MB', true); return; }
        const b64 = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1]); fr.readAsDataURL(file); });
        data = { title: v.title, cat: v.cat || 'observe', kind: 'file', filename: file.name, data_base64: b64, visibility: vis };
      }
      const r = await apiFetch('/res/add', { method: 'POST', body: data });
      showToast((r && r.code === 0) ? '已上传' : ('失败：' + ((r && r.message) || '')), !(r && r.code === 0));
      wbLoadRes();
    };


    // ---------- v2.18 星环 AI 抽屉 ----------
    const hubAiHistory = [];
    document.getElementById('hubAiFloat').onclick = () => {
      if (!classroomIsReady()) { showToast('请先登录', true); return; }
      document.getElementById('hubAiDrawer').classList.toggle('open');
    };
    document.getElementById('hubAiClose').onclick = () => document.getElementById('hubAiDrawer').classList.remove('open');
    document.getElementById('hubAiHead').insertAdjacentHTML('beforeend', '<button id="hubAiHisBtn" style="background:none;border:1px solid rgba(124,199,255,.4);color:#7cc7ff;border-radius:999px;padding:3px 14px;font-size:11px;cursor:pointer;font-family:inherit">历史</button>');
    setTimeout(() => { const hb = document.getElementById('hubAiHisBtn'); if (hb) hb.onclick = hubAiHistLoad; }, 0);
    function hubAiPush(role, text) {
      const box = document.getElementById('hubAiMsgs');
      const div = document.createElement('div');
      div.className = 'ai-msg ' + (role === 'user' ? 'user' : 'bot');
      div.textContent = text;
      box.appendChild(div);
      box.scrollTop = box.scrollHeight;
    }
    async function hubAiAsk() {
      const input = document.getElementById('hubAiText');
      const q = input.value.trim();
      if (!q || !state.user) return;
      input.value = '';
      hubAiPush('user', q);
      hubAiHistory.push({ role: 'user', content: q });
      hubAiPush('bot', '思考中…');
      const thinking = document.getElementById('hubAiMsgs').lastChild;
      try {
        const r = await apiFetch('/ai/chat', { method: 'POST', body: { messages: hubAiHistory, channel: 'hub' } });
        const reply = (r && r.data && r.data.reply) || '';
        thinking.textContent = reply || ('暂时没有回应：' + ((r && r.message) || ''));
        if (reply) hubAiHistory.push({ role: 'assistant', content: reply });
      } catch (e) { thinking.textContent = '连接失败：' + (e.message || e); }
    }
    document.getElementById('hubAiSend').onclick = hubAiAsk;
    document.getElementById('hubAiText').addEventListener('keydown', e => { if (e.key === 'Enter') hubAiAsk(); });


    // ---------- v2.19 三体舰队分组：学生组内讨论（私密）+ 结果上大屏 ----------
    const grpState = { grouping: null, myGroup: null };
    async function grpLoad() {
      if (!ocState.lecture) return;
      const r = await apiFetch('/lecture/group/get', { method: 'POST', body: { lecture_id: ocState.lecture._id } });
      grpState.grouping = (r && r.data) || null;
      const box = document.getElementById('ocGroupBox');
      if (!box) return;
      if (!grpState.grouping) { box.innerHTML = '<p style="color:#5c7194;font-size:12px">教师尚未分组</p>'; return; }
      const myId = String((state.user || {})._id);
      grpState.myGroup = (grpState.grouping.groups || []).find(g => g.members.some(m => String(m.id) === myId)) || null;
      if (!grpState.myGroup) { box.innerHTML = '<p style="color:#5c7194;font-size:12px">你不在本轮分组中</p>'; return; }
      const g = grpState.myGroup;
      box.innerHTML =
        '<div class="oc-person"><span class="tag live" style="border-color:rgba(230,199,143,.55);color:#e6c78f;font-size:12px;padding:4px 14px">' + g.name + '</span>' +
        '<span style="color:var(--faint);font-size:11px">' + (g.mode === 'online' ? '线上组' : '现场组') + ' · ' + g.members.length + ' 人</span></div>' +
        '<div style="font-size:11px;color:#93a7c4;margin:8px 0">' + g.members.map(m => m.name).join('、') + '</div>' +
        '<div class="oc-chats" id="grpChats" style="max-height:140px;margin-bottom:8px"></div>' +
        '<div class="oc-askrow"><input id="grpChatInput" placeholder="组内讨论（仅本组可见，不上大屏）" /><button class="btn btn-gold" style="min-height:36px;font-size:11px" id="grpChatBtn">发送</button></div>' +
        '<div class="oc-askrow"><input id="grpResultInput" placeholder="提交小组结果（教师大屏展示）" /><button class="btn" style="min-height:36px;font-size:11px" id="grpResultBtn">提交结果</button></div>';
      document.getElementById('grpChatBtn').onclick = grpSendChat;
      document.getElementById('grpResultBtn').onclick = grpSendResult;
      grpRenderChats();
    }
    async function grpRenderChats() {
      const el = document.getElementById('grpChats');
      if (!el || !grpState.myGroup || !ocState.lecture) return;
      const r = await apiFetch('/lecture/group/msgs', { method: 'POST', body: { lecture_id: ocState.lecture._id, group_name: grpState.myGroup.name } });
      const list = (r && r.data) || [];
      el.innerHTML = list.map(m =>
        '<div class="oc-chat"><b>' + (m.kind === 'result' ? '[结果] ' : '') + m.member_name + '</b>' +
        String(m.content).replace(/</g, '&lt;') + '<time>' + new Date(m.at).toLocaleTimeString('zh-CN', { hour12: false }) + '</time></div>'
      ).join('') || '<div class="oc-chat" style="color:#5c7194">组内还没有消息</div>';
      el.scrollTop = el.scrollHeight;
    }
    async function grpSend(kind) {
      const input = document.getElementById(kind === 'result' ? 'grpResultInput' : 'grpChatInput');
      const content = (input.value || '').trim();
      if (!content || !grpState.myGroup || !ocState.lecture) return;
      const r = await apiFetch('/lecture/group/send', { method: 'POST', body: { lecture_id: ocState.lecture._id, group_name: grpState.myGroup.name, kind, content } });
      if (!r || r.code !== 0) { showToast((r && r.message) || '发送失败', true); return; }
      input.value = '';
      grpRenderChats();
      if (kind === 'result' && document.getElementById('lectureScreen') && !document.getElementById('lectureScreen').hidden) lsGroupsRender();
    }
    function grpSendChat() { grpSend('chat'); }
    function grpSendResult() { grpSend('result'); }

    // 大屏：分组墙 + 各组结果（讨论不上大屏）
    async function lsGroupsRender() {
      const box = document.getElementById('lsGroups');
      if (!box || !ocState.lecture) return;
      const r = await apiFetch('/lecture/group/results', { method: 'POST', body: { lecture_id: ocState.lecture._id } });
      const d = (r && r.data) || { groups: [], results: [] };
      if (!d.groups.length) { box.innerHTML = '<p style="color:#5c7194;font-size:12px">尚未分组（点上方"随机分组"）</p>'; return; }
      let html = '';
      d.groups.forEach(g => {
        const res = d.results.filter(x => x.group_name === g.name);
        html += '<div style="border:1px solid rgba(124,167,220,.14);border-radius:10px;padding:10px 12px;margin-bottom:8px">' +
          '<div style="display:flex;gap:8px;align-items:center;margin-bottom:6px"><b style="color:#e6c78f;font-size:13px">' + g.name + '</b>' +
          '<span class="tag ' + (g.mode === 'online' ? 'online' : '') + '" style="font-size:9px;padding:2px 8px;border-radius:999px;border:1px solid rgba(124,167,220,.3);color:#93a7c4">' + (g.mode === 'online' ? '线上组' : '现场组') + '</span>' +
          '<span style="color:#5c7194;font-size:11px">' + g.members.map(m => m.name).join('、') + '</span></div>' +
          (res.length ? res.map(x => '<div style="font-size:12px;color:#d8dee6;margin-top:4px;padding:8px 10px;background:rgba(230,199,143,.06);border-radius:8px;border:1px solid rgba(230,199,143,.2)"><b style="color:#e6c78f">[结果]</b> ' + String(x.content).replace(/</g, '&lt;') + '<span style="color:#5c7194;font-size:10px;margin-left:8px">' + x.member_name + '</span></div>').join('') : '<div style="font-size:11px;color:#5c7194">等待小组提交结果</div>') +
          '</div>';
      });
      box.innerHTML = html;
    }
    document.getElementById('lsGroupBtn').onclick = async () => {
      if (!ocState.lecture) return;
      const v = await uiPrompt({ title: '三体舰队随机分组', sub: '线上同学与现场同学各自成组；组名按舰队序列命名', fields: [{ id: 'size', label: '每组人数', placeholder: '4', value: '4' }] });
      if (!v || !v.size) return;
      const r = await apiFetch('/lecture/group/generate', { method: 'POST', body: { lecture_id: ocState.lecture._id, size: Number(v.size) || 4 } });
      if (!r || r.code !== 0) { showToast((r && r.message) || '分组失败', true); return; }
      showToast('已分成 ' + r.data.length + ' 个舰队小组');
      lsGroupsRender();
      if (document.getElementById('onlineClass').classList.contains('open')) grpLoad();
    };


    // ---------- v2.20 天文社区（仅海大/南开天协成员；AI 参与讨论） ----------
    const cmState = { section: 'discuss', posts: [], media: [], timer: null, expanded: new Set() };
    async function cmApi(path, body) { return apiFetch(path, { method: 'POST', body: body || {} }); }
    async function cmLoad() {
      const r = await cmApi('/astro/posts', { section: cmState.section });
      if (r && r.code === 403) { switchPage('classroom'); showToast('无权访问社区', true); return; }
      cmState.posts = (r && r.data) || [];
      cmRender();
      cmLoadBoard();
    }
    async function cmMediaUrl(fileId) {
      const key = 'mu_' + fileId;
      if (cmState[key]) return cmState[key];
      const r = await cmApi('/astro/media_url', { file_id: fileId });
      const url = (r && r.data && r.data.url) || '';
      cmState[key] = url;
      return url;
    }
    function cmRender() {
      const feed = document.getElementById('cmFeed');
      if (!feed) return;
      feed.innerHTML = cmState.posts.map(p => {
        const likedKey = p._id + '_' + (state.user || {})._id;
        const meta = p.section === 'photo' && p.photo_meta ? p.photo_meta : null;
        return '<article class="cm-post" data-id="' + p._id + '">' +
          '<div class="cm-head"><div class="cm-ava">' + String(p.author_name || '?').slice(0, 1) + '</div>' +
          '<span class="cm-author">' + p.author_name + '</span>' +
          cmOrgLabel(p) +
          (p.ai_answered ? '<span class="cm-orgtag" style="border-color:rgba(124,199,255,.4);color:#7cc7ff">AI 已参与</span>' : '') +
          '<span class="cm-time">' + new Date(p.at).toLocaleString('zh-CN', { hour12: false }) + '</span></div>' +
          (p.content ? '<div class="cm-text"></div>' : '') +
          '<div class="cm-media"></div>' +
          (meta ? '<div class="cm-meta">【观测档案】' + [meta.location && '地址 ' + meta.location, meta.time && '时间 ' + meta.time, meta.target && '目标 ' + meta.target, meta.device && '设备 ' + meta.device, meta.params && '参数 ' + meta.params].filter(Boolean).join(' · ') + '</div>' : '') +
          '<div class="cm-foot"><button class="cm-like" data-like="' + p._id + '">♡ <span>' + (p.likes || 0) + '</span></button>' +
          '<button class="cm-like" data-cmt="' + p._id + '">评论</button></div>' +
          '<div class="cm-comments" hidden></div>' +
          '<div class="cm-crow" hidden><input placeholder="友善评论，@星环AI 召唤 AI…" maxlength="300" /><button class="btn btn-gold" data-send="' + p._id + '">发送</button></div>' +
          '</article>';
      }).join('') || '<p style="color:var(--faint);font-size:13px;text-align:center;padding:30px">还没有帖子，来发第一帖</p>';
      // 填文本
      feed.querySelectorAll('.cm-post').forEach((el) => {
        const p = cmState.posts.find(x => String(x._id) === el.dataset.id);
        if (p && p.content) el.querySelector('.cm-text').textContent = p.content;
        if (p && p.media && p.media.length) {
          const box = el.querySelector('.cm-media');
          p.media.forEach(m => {
            cmMediaUrl(m.file_id).then(url => {
              if (!url) return;
              if (m.type === 'image') { const img = document.createElement('img'); img.src = url; box.appendChild(img); }
              else if (m.type === 'video') { const v = document.createElement('video'); v.src = url; v.controls = true; box.appendChild(v); }
              else { const a = document.createElement('audio'); a.src = url; a.controls = true; box.appendChild(a); }
            });
          });
        }
        const likeBtn = el.querySelector('[data-like]');
        if (likeBtn) likeBtn.onclick = async () => {
          const r = await cmApi('/astro/like', { post_id: p._id });
          if (r && r.code === 0) { likeBtn.classList.toggle('liked', r.data.liked); cmLoad(); }
        };
        const cmtBtn = el.querySelector('[data-cmt]');
        if (cmtBtn) cmtBtn.onclick = () => {
          const box = el.querySelector('.cm-comments');
          const row = el.querySelector('.cm-crow');
          box.hidden = !box.hidden; row.hidden = box.hidden;
          if (!box.hidden) cmLoadComments(p._id, box);
        };
        const sendBtn = el.querySelector('[data-send]');
        if (sendBtn) sendBtn.onclick = async () => {
          const input = el.querySelector('.cm-crow input');
          const content = input.value.trim();
          if (!content) return;
          const r = await cmApi('/astro/comment', { post_id: p._id, content });
          if (r && r.code === 0) { input.value = ''; cmLoadComments(p._id, el.querySelector('.cm-comments')); if (/@(星环AI|MOSS|moss)/.test(content)) setTimeout(cmLoad, 3000); }
          else showToast((r && r.message) || '评论失败', true);
        };
      });
    }
    async function cmLoadComments(pid, box) {
      const r = await cmApi('/astro/comments', { post_id: pid });
      const list = (r && r.data) || [];
      box.innerHTML = list.map(x =>
        '<div class="cm-comment' + (x.is_ai ? ' ai' : '') + '"><b>' + x.author_name + '</b>' + cmOrgLabel(x) + String(x.content).replace(/</g, '&lt;') +
        '<time>' + new Date(x.at).toLocaleTimeString('zh-CN', { hour12: false }) + '</time></div>').join('') || '<div class="cm-comment" style="color:#5c7194">还没有评论</div>';
    }
    async function cmPublish() {
      const content = document.getElementById('cmContent').value.trim();
      if (!content && !cmState.media.length) { showToast('写点什么或附上媒体', true); return; }
      let media = cmState.media;
      if (cmState.media.length) {
        showToast('正在上传媒体…');
        media = [];
        for (const m of cmState.media) {
          const b64 = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1]); fr.readAsDataURL(m.file); });
          const ext = (m.file.name.split('.').pop() || 'bin').slice(0, 5);
          const up = await cmApi('/astro/media_upload', { data_base64: b64, ext });
          if (up && up.code === 0) media.push({ type: m.type, file_id: up.data.file_id });
        }
      }
      const body = { section: cmState.section, content, media };
      if (cmState.section === 'photo') {
        body.photo_meta = {
          location: document.getElementById('cmMetaLoc').value,
          time: document.getElementById('cmMetaTime').value,
          target: document.getElementById('cmMetaTarget').value,
          device: document.getElementById('cmMetaDevice').value,
          params: document.getElementById('cmMetaParams').value
        };
      }
      const r = await cmApi('/astro/post_add', body);
      if (r && r.code === 0) {
        document.getElementById('cmContent').value = '';
        cmState.media = [];
        document.getElementById('cmAttachInfo').textContent = '';
        ['cmMetaLoc', 'cmMetaTime', 'cmMetaTarget', 'cmMetaDevice', 'cmMetaParams'].forEach(id => document.getElementById(id).value = '');
        showToast('已发布，AI 正在赶来讨论…');
        setTimeout(cmLoad, 1500);
        cmLoad();
      } else showToast((r && r.message) || '发布失败', true);
    }
    function cmBind() {
      document.querySelectorAll('[data-cmt]').forEach(t => t.onclick = () => {
        document.querySelectorAll('[data-cmt]').forEach(x => x.classList.toggle('active', x === t));
        cmState.section = t.dataset.cmt;
        document.getElementById('cmPhotoMeta').hidden = cmState.section !== 'photo';
        cmLoad();
      });
      document.getElementById('cmAttach').onclick = () => document.getElementById('cmFile').click();
      document.getElementById('cmFile').onchange = () => {
        const files = Array.from(document.getElementById('cmFile').files || []);
        cmState.media = files.map(f => ({ type: f.type.startsWith('video') ? 'video' : f.type.startsWith('audio') ? 'voice' : 'image', file: f })).slice(0, 6);
        document.getElementById('cmAttachInfo').textContent = cmState.media.length ? '已选 ' + cmState.media.length + ' 个媒体' : '';
      };
      document.getElementById('cmPost').onclick = cmPublish;
      const br = document.getElementById('cmBoardRefresh');
      if (br) br.onclick = cmLoadBoard;
    }


    // ---------- v2.22 中枢独立页：登录后顶栏出现入口，首页只留展示内容 ----------
    let hubMode = false;
    function enterHub(tab) {
      if (!state.user || !state.user.token) { openLogin(); return; }
      hubMode = true;
      document.body.classList.add('hub-mode');
      document.body.classList.add('console-mode');
      document.body.classList.remove('partners-view');
      const area = document.getElementById('hubArea');
      if (area) area.hidden = false;
      document.querySelectorAll('.landing-only').forEach(el => { el.hidden = true; });
      if (tab) switchPage(tab);
      window.scrollTo({ top: 0 });
      logStep('已进入中枢', tab || '');
    }
    function showLanding() {
      hubMode = false;
      document.body.classList.remove('hub-mode');
      document.body.classList.remove('console-mode');
      document.body.classList.remove('partners-view');
      const area = document.getElementById('hubArea');
      if (area) area.hidden = true;
      document.querySelectorAll('.landing-only').forEach(el => { el.hidden = false; });
      window.scrollTo({ top: 0 });
    }

    /* v2.42 入驻星系独立页：点导航跳页面，不再下滑 */
    function openPartners() {
      hubMode = false;
      document.body.classList.remove('hub-mode', 'console-mode');
      document.body.classList.add('partners-view');
      const area = document.getElementById('hubArea');
      if (area) area.hidden = true;
      const sp = document.getElementById('shopPage');
      if (sp) sp.hidden = true;
      document.querySelectorAll('.landing-only').forEach(el => { el.hidden = false; });
      window.scrollTo({ top: 0 });
      if (window.loadPublicRes) window.loadPublicRes();
    }
    window.XHNav = Object.assign(window.XHNav || {}, { openPartners: openPartners });
    function revealHubNav() {
      document.querySelectorAll('.nav-hub-item').forEach(b => { b.hidden = false; });
      const sep = document.getElementById('navHubSep');
      if (sep) sep.hidden = false;
      const nm = document.getElementById('navMonitor');
      if (nm) nm.hidden = false;
    }
    function hideHubNav() {
      document.querySelectorAll('.nav-hub-item').forEach(b => { b.hidden = true; });
      const sep = document.getElementById('navHubSep');
      if (sep) sep.hidden = true;
      const nm = document.getElementById('navMonitor');
      if (nm) nm.hidden = true;
    }


    // ---------- v2.24 文创商城（公开可见；积分/支付宝双支付） ----------
    const SHOP_PRODUCTS = []; // v2.32.1 商品清空：待社团确定实物清单后再上架
    function renderShop() {
      const grid = document.getElementById('shopGrid');
      if (!grid) return;
      if (!SHOP_PRODUCTS.length) { grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#5c7194;font-size:13px;padding:40px 0">货架筹备中，商品清单确定后上架</p>'; return; }
      grid.innerHTML = SHOP_PRODUCTS.map(p =>
        '<article class="shop-card"><div class="shop-ico">' + p.ico + '</div><div class="shop-body">' +
        '<div class="shop-name">' + p.name + '</div><div class="shop-desc">' + p.desc + '</div>' +
        '<div class="shop-foot"><span class="shop-price">' + (p.pay === 'points' ? p.points + ' 积分' : '¥ ' + p.price) + '</span>' +
        '<button class="shop-x" data-id="' + p.id + '">' + (p.pay === 'points' ? '积分兑换' : '支付宝购买') + '</button></div></div></article>').join('');
      grid.querySelectorAll('.shop-x').forEach(btn => {
        btn.onclick = async () => {
          const p = SHOP_PRODUCTS.find(x => x.id === btn.dataset.id);
          if (!state.user || !state.user.token) { openLogin(); showToast('登录后可兑换/购买', true); return; }
          if (p.pay === 'points') {
            if (!(await uiConfirm('用 ' + p.points + ' 积分兑换「' + p.name + '」？兑换后请到管理员处领取。', '积分兑换'))) return;
            const r = await apiFetch('/shop/exchange', { method: 'POST', body: { product_id: p.id, product_name: p.name, points: p.points, pay_type: 'points' } });
            showToast((r && r.code === 0) ? '兑换成功，请找管理员领取' : ((r && r.message) || '兑换失败'), !(r && r.code === 0));
          } else {
            if (!(await uiConfirm('下单「' + p.name + '」（¥' + p.price + '）？在线支付通道正在接入，当前请下单后联系管理员完成支付与领取。', '支付宝购买'))) return;
            const r = await apiFetch('/shop/exchange', { method: 'POST', body: { product_id: p.id, product_name: p.name, points: p.price, pay_type: 'alipay' } });
            showToast((r && r.code === 0) ? '订单已创建（待支付），请联系管理员' : ((r && r.message) || '下单失败'), !(r && r.code === 0));
          }
        };
      });
    }
    function enterShop() {
      document.body.classList.add('console-mode');
      document.body.classList.remove('partners-view', 'hub-mode');
      hubMode = false;
      document.querySelectorAll('.landing-only').forEach(el => { el.hidden = true; });
      const area = document.getElementById('hubArea');
      if (area) area.hidden = true;
      const sp = document.getElementById('shopPage');
      if (sp) sp.hidden = false;
      renderShop();
      window.scrollTo({ top: 0 });
    }

    // ---------- v2.25 社区：作者三标 + 积分总榜 ----------
    function cmOrgLabel(p) {
      return '<span class="cm-orgtag">' + (p.org === 'nankai_astro' ? '南开天协' : '海大天协') + '</span>' +
        (p.campus ? '<span class="cm-orgtag">' + p.campus + '</span>' : '') +
        (p.department ? '<span class="cm-orgtag">' + p.department + '</span>' : '');
    }
    async function cmLoadBoard() {
      const box = document.getElementById('cmBoardList');
      if (!box) return;
      const r = await apiFetch('/astro/leaderboard', { method: 'POST', body: {} });
      const rows = (r && r.data) || [];
      box.innerHTML = rows.slice(0, 10).map((x, i) =>
        '<span style="display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border:1px solid ' +
        (i < 3 ? 'rgba(230,199,143,.5)' : 'rgba(124,167,220,.2)') + ';border-radius:999px;font-size:11px;color:' +
        (i < 3 ? '#e6c78f' : '#d8dee6') + '">' +
        (i + 1) + '. ' + x.name + ' <span style="color:#5c7194">' + (x.org === 'nankai_astro' ? '南开' : '海大') +
        (x.campus ? '·' + x.campus : '') + (x.department ? '·' + x.department : '') + '</span> <b>' + x.points + '</b></span>'
      ).join('') || '<span style="color:#5c7194;font-size:12px">暂无积分数据</span>';
    }


    // ---------- v2.26 扫码答题：一次扫码，全程推送 ----------
    const mqState = { q: null, lec: '', answered: new Set(), pushTimer: null, lastAt: 0 };
    function mqUrl(lecId, qId) {
      return 'https://sunyilin00000.github.io/xinghuan-web/?lec=' + lecId + '&q=' + qId;
    }
    async function mqEnsureLogin() {
      if (state.user && state.user.token) return true;
      // 本地记住的 token 静默恢复
      const saved = localStorage.getItem('hub_token');
      if (saved) {
        try {
          const r = await apiFetch('/me', { method: 'POST', body: { token: saved } });
          if (r && r.code === 0) { state.user = { ...r.data, token: saved }; setConnection('online', '已连接'); return true; }
          localStorage.removeItem('hub_token');
        } catch (e) {}
      }
      openLogin();
      return false;
    }
    async function mqShow(q) {
      mqState.q = q;
      document.getElementById('mqTag').textContent = ({ choice: '选择题', judge: '判断题', vote: '投票', blank: '填空题' }[q.type] || '题目') + (q.anonymous ? ' · 匿名' : '');
      document.getElementById('mqTitle').textContent = q.title;
      const body = document.getElementById('mqBody');
      const msg = document.getElementById('mqMsg');
      msg.textContent = '';
      if (q.type === 'blank') {
        body.innerHTML = '<input class="mq-input" id="mqBlank" placeholder="你的答案" /><button class="mq-send" id="mqSend">提交答案</button>';
        document.getElementById('mqSend').onclick = () => mqAnswer({ content: document.getElementById('mqBlank').value });
      } else if (q.type === 'judge') {
        body.innerHTML = '<button class="mq-opt" data-j="T">对</button><button class="mq-opt" data-j="F">错</button>';
        body.querySelectorAll('.mq-opt').forEach(b => b.onclick = () => mqAnswer({ judge: b.dataset.j }));
      } else {
        const multi = q.type === 'choice';
        const sel = new Set();
        body.innerHTML = (q.options || []).map(o =>
          '<button class="mq-opt" data-k="' + o.key + '">' + o.key + '. ' + o.text + '</button>').join('');
        body.querySelectorAll('.mq-opt').forEach(b => b.onclick = () => {
          if (multi) { sel.has(b.dataset.k) ? sel.delete(b.dataset.k) : sel.add(b.dataset.k); b.style.borderColor = sel.has(b.dataset.k) ? '#7cc7ff' : ''; }
          else mqAnswer({ option_keys: [b.dataset.k] });
        });
        if (multi) {
          const send = document.createElement('button');
          send.className = 'mq-send'; send.textContent = '提交答案';
          send.onclick = () => sel.size ? mqAnswer({ option_keys: Array.from(sel) }) : (msg.textContent = '请先选择');
          body.appendChild(send);
        }
      }
      document.getElementById('mobileQuiz').hidden = false;
    }
    async function mqAnswer(payload) {
      if (!mqState.q) return;
      const msg = document.getElementById('mqMsg');
      const r = await apiFetch('/lecture/q/answer', { method: 'POST', body: Object.assign({ question_id: mqState.q._id }, payload) });
      if (r && r.code === 0) {
        mqState.answered.add(mqState.q._id);
        msg.textContent = '已提交';
        msg.style.color = '#86b5a0';
        setTimeout(() => { document.getElementById('mobileQuiz').hidden = true; mqStartPush(); }, 700);
      } else {
        msg.textContent = (r && r.message) || '提交失败';
        msg.style.color = '#f0a8a8';
      }
    }
    document.getElementById('mqClose').onclick = () => { document.getElementById('mobileQuiz').hidden = true; mqStartPush(); };
    // 新题推送：轮询课堂已发布题目，弹出最新未作答
    function mqStartPush() {
      if (!mqState.lec || mqState.pushTimer) return;
      mqState.pushTimer = setInterval(async () => {
        if (document.hidden) return;
        const r = await apiFetch('/lecture/q/list', { method: 'POST', body: { lecture_id: mqState.lec } });
        const live = ((r && r.data) || []).filter(q => q.status === 'published');
        const fresh = live.filter(q => !mqState.answered.has(q._id) && Number(q.at || 0) > mqState.lastAt);
        if (fresh.length) {
          const latest = fresh.sort((a, b) => Number(b.at || 0) - Number(a.at || 0))[0];
          mqState.lastAt = Number(latest.at || 0);
          mqShow(latest);
        } else if (live.length) {
          mqState.lastAt = Math.max.apply(null, live.map(q => Number(q.at || 0)).concat([mqState.lastAt]));
        }
      }, 6000);
    }
    // 二维码（教师端）：动态加载 qrcodejs，本地优先回退双 CDN
    async function loadQrLib() {
      if (window.QRCode) return;
      for (const src of ['qrcode.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js', 'https://cdn.jsdelivr.net/gh/davidshimjs/qrcodejs@master/qrcode.min.js']) {
        try {
          await new Promise((res, rej) => {
            const s = document.createElement('script');
            s.src = src; s.onload = res; s.onerror = rej;
            document.head.appendChild(s);
          });
          if (window.QRCode) return;
        } catch (e) {}
      }
    }
    async function showQr(lecId, qId) {
      await loadQrLib();
      const url = mqUrl(lecId, qId);
      document.getElementById('qrUrl').textContent = url;
      const box = document.getElementById('qrBox');
      box.innerHTML = '';
      try {
        new QRCode(box, { text: url, width: 200, height: 200, correctLevel: QRCode.CorrectLevel.M });
      } catch (e) {
        box.innerHTML = '<p style="color:#333;font-size:12px">二维码库加载失败，请手动访问下方链接</p>';
      }
      document.getElementById('qrModal').classList.add('open');
    }

    // 启动：解析 ?lec= & ?q=
    async function mqBootFromUrl() {
      const u = new URLSearchParams(location.search);
      const qid = u.get('q');
      const lec = u.get('lec');
      if (lec) { mqState.lec = lec; localStorage.setItem('hub_lec', lec); }
      if (!qid && !lec) {
        const savedLec = localStorage.getItem('hub_lec');
        if (savedLec) mqState.lec = savedLec;
        return;
      }
      if (!(await mqEnsureLogin())) return;
      if (qid) {
        const r = await apiFetch('/lecture/q/get', { method: 'POST', body: { question_id: qid } });
        if (r && r.code === 0) { mqShow(r.data); mqStartPush(); return; }
        showToast((r && r.message) || '题目不可用', true);
      }
      mqStartPush();
    }


    // ---------- v2.30 网页切屏检测：切走 3 秒记一次（教师豁免，60 秒节流），大屏公示 ----------
    let cheatHiddenAt = 0, cheatReportedAt = 0;
    async function reportCheatIfNeeded() {
      const lecId = (ocState.lecture && ocState.lecture._id) || (liveLecture && liveLecture._id) || mqState.lec;
      if (!lecId) return;
      const u = state.user || {};
      const isTeacher = u.super_admin === true || u.role === 'admin' || u.course_teacher === true;
      if (isTeacher || !u.token) return;
      if (Date.now() - cheatReportedAt < 60000) return;
      cheatReportedAt = Date.now();
      try { await apiFetch('/lecture/cheat', { method: 'POST', body: { lecture_id: lecId } }); } catch (e) {}
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) cheatHiddenAt = Date.now();
      else if (cheatHiddenAt && Date.now() - cheatHiddenAt > 3000) reportCheatIfNeeded();
    });
    window.addEventListener('blur', () => { cheatHiddenAt = Date.now(); });
    window.addEventListener('focus', () => {
      if (cheatHiddenAt && Date.now() - cheatHiddenAt > 3000) reportCheatIfNeeded();
    });
    async function lsCheatsRender() {
      const el = document.getElementById('lsCheats');
      if (!el) return;
      const lecId = ocState.lecture && ocState.lecture._id;
      if (!lecId) { el.textContent = ''; return; }
      const r = await apiFetch('/lecture/cheats', { method: 'POST', body: { lecture_id: lecId } });
      const rows = (r && r.data) || [];
      if (!rows.length) { el.textContent = ''; return; }
      el.textContent = '切屏警报 ' + rows.length + ' 人：' + rows.slice(0, 4).map(x => x.name + '（' + x.count + '次）').join('、') + (rows.length > 4 ? ' 等' : '');
    }


    // ---------- v2.31 扫码手机模式：极简登录+答题+推送 ----------
    const mm = { on: false, lec: '', answered: new Set(), pushTimer: null, lastAt: 0, q: null };
    function mmEnter() {
      mm.on = true;
      document.body.classList.add('mm-on');
      document.getElementById('mobileMode').hidden = false;
    }
    async function mmBoot() {
      const u = new URLSearchParams(location.search);
      const qid = u.get('q');
      mm.lec = u.get('lec') || localStorage.getItem('hub_lec') || '';
      if (mm.lec) localStorage.setItem('hub_lec', mm.lec);
      mmEnter();
      const saved = localStorage.getItem('hub_token');
      if (saved) {
        try {
          const r = await apiFetch('/me', { method: 'POST', body: { token: saved } });
          if (r && r.code === 0) {
            state.user = { ...r.data, token: saved };
            document.getElementById('mmWho').textContent = r.data.name || r.data.username;
            if (qid) { mmLoadQ(qid); return; }
            mmIdle(); mmStartPush(); return;
          }
          localStorage.removeItem('hub_token');
        } catch (e) {}
      }
      // 未登录：极简登录卡
      document.getElementById('mmLogin').hidden = false;
      const doLogin = async () => {
        const msg = document.getElementById('mmLoginMsg');
        msg.textContent = '';
        const username = document.getElementById('mmUser').value.trim();
        const password = document.getElementById('mmPwd').value;
        if (!username || !password) { msg.textContent = '请输入账号和密码'; return; }
        msg.textContent = '登录中…'; msg.style.color = '#93a7c4';
        try {
          const payload = await apiFetch('/login', { method: 'POST', body: { username, password } });
          if (!payload || payload.code !== 0) { msg.textContent = (payload && payload.message) || '登录失败'; msg.style.color = '#f0a8a8'; return; }
          const tk = payload.data.token;
          localStorage.setItem('hub_token', tk);
          state.user = { ...(payload.data.user || {}), token: tk };
          document.getElementById('mmLogin').hidden = true;
          document.getElementById('mmWho').textContent = (payload.data.user && (payload.data.user.name || payload.data.user.username)) || username;
          if (qid) mmLoadQ(qid); else { mmIdle(); mmStartPush(); }
        } catch (e) { msg.textContent = '网络异常，请重试'; msg.style.color = '#f0a8a8'; }
      };
      document.getElementById('mmLoginBtn').onclick = doLogin;
      document.getElementById('mmPwd').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
    }
    function mmIdle() {
      document.getElementById('mmBody').hidden = true;
      document.getElementById('mmIdle').hidden = false;
    }
    async function mmLoadQ(qid) {
      const r = await apiFetch('/lecture/q/get', { method: 'POST', body: { question_id: qid } });
      if (!r || r.code !== 0) { mmIdle(); return; }
      mmRenderQ(r.data);
    }
    function mmRenderQ(q) {
      mm.q = q;
      document.getElementById('mmIdle').hidden = true;
      const body = document.getElementById('mmBody');
      body.hidden = false;
      let inner = '<div class="mm-tag">' + ({ choice: '选择题', judge: '判断题', vote: '投票', blank: '填空题' }[q.type] || '题目') + (q.anonymous ? ' · 匿名' : '') + '</div>' +
        '<div class="mm-title">' + String(q.title).replace(/</g, '&lt;') + '</div><div id="mmOpts"></div>' +
        '<div class="mm-msg" id="mmMsg"></div>';
      body.innerHTML = inner;
      const opts = document.getElementById('mmOpts');
      const msg = document.getElementById('mmMsg');
      const done = () => { msg.textContent = '已提交'; setTimeout(() => { mm.q = null; mmIdle(); }, 800); };
      if (q.type === 'blank') {
        opts.innerHTML = '<input class="mm-q-input" id="mmBlank" placeholder="你的答案" /><button class="mq-send" id="mmSend" style="margin-top:12px">提交答案</button>';
        document.getElementById('mmSend').onclick = async () => {
          const r = await apiFetch('/lecture/q/answer', { method: 'POST', body: { question_id: q._id, content: document.getElementById('mmBlank').value } });
          if (r && r.code === 0) { mm.answered.add(q._id); done(); } else { msg.textContent = (r && r.message) || '提交失败'; msg.style.color = '#f0a8a8'; }
        };
      } else if (q.type === 'judge') {
        opts.innerHTML = '<button class="mm-opt" data-j="T">对</button><button class="mm-opt" data-j="F">错</button>';
        opts.querySelectorAll('.mm-opt').forEach(b => b.onclick = async () => {
          const r = await apiFetch('/lecture/q/answer', { method: 'POST', body: { question_id: q._id, judge: b.dataset.j } });
          if (r && r.code === 0) { mm.answered.add(q._id); done(); } else { msg.textContent = (r && r.message) || '提交失败'; msg.style.color = '#f0a8a8'; }
        });
      } else {
        const multi = q.type === 'choice';
        const sel = new Set();
        opts.innerHTML = (q.options || []).map(o => '<button class="mm-opt" data-k="' + o.key + '">' + o.key + '. ' + String(o.text).replace(/</g, '&lt;') + '</button>').join('') +
          (multi ? '<button class="mq-send" id="mmSend">提交答案</button>' : '');
        opts.querySelectorAll('.mm-opt').forEach(b => b.onclick = async () => {
          if (multi) {
            sel.has(b.dataset.k) ? sel.delete(b.dataset.k) : sel.add(b.dataset.k);
            b.classList.toggle('sel');
          } else {
            const r = await apiFetch('/lecture/q/answer', { method: 'POST', body: { question_id: q._id, option_keys: [b.dataset.k] } });
            if (r && r.code === 0) { mm.answered.add(q._id); done(); } else { msg.textContent = (r && r.message) || '提交失败'; msg.style.color = '#f0a8a8'; }
          }
        });
        if (multi) document.getElementById('mmSend').onclick = async () => {
          if (!sel.size) { msg.textContent = '请先选择'; return; }
          const r = await apiFetch('/lecture/q/answer', { method: 'POST', body: { question_id: q._id, option_keys: Array.from(sel) } });
          if (r && r.code === 0) { mm.answered.add(q._id); done(); } else { msg.textContent = (r && r.message) || '提交失败'; msg.style.color = '#f0a8a8'; }
        };
      }
      window.scrollTo(0, 0);
    }
    function mmStartPush() {
      if (!mm.lec || mm.pushTimer) return;
      mm.pushTimer = setInterval(async () => {
        if (document.hidden || mm.q) return;
        const r = await apiFetch('/lecture/q/list', { method: 'POST', body: { lecture_id: mm.lec } });
        const live = ((r && r.data) || []).filter(q => q.status === 'published');
        const fresh = live.filter(q => !mm.answered.has(q._id) && Number(q.at || 0) > mm.lastAt);
        if (fresh.length) mmRenderQ(fresh.sort((a, b) => Number(b.at || 0) - Number(a.at || 0))[0]);
        else if (live.length) mm.lastAt = Math.max.apply(null, live.map(q => Number(q.at || 0)).concat([mm.lastAt]));
      }, 6000);
    }


    // ---------- v2.37 成员申请审批 + AI 历史 + 导航委托兜底 ----------


    // AI 抽屉：历史按钮
    async function hubAiHistLoad() {
      const box = document.getElementById('hubAiMsgs');
      box.innerHTML = '<div class="ai-msg bot">读取中…</div>';
      const r = await apiFetch('/ai/history', { method: 'POST', body: {} });
      const list = (r && r.data) || [];
      box.innerHTML = list.map(m =>
        '<div class="ai-msg bot"><div style="color:#7cc7ff;font-size:11px;margin-bottom:4px">问：' + String(m.question || '').slice(0, 80) + '</div>' + String(m.answer || '').slice(0, 300) + '</div>').join('')
        || '<div class="ai-msg bot">还没有历史对话</div>';
      box.scrollTop = box.scrollHeight;
    }


    // 导航委托兜底：无论绑定阶段发生什么，点击必响应
    document.addEventListener('click', function (ev) {
      var b = ev.target.closest && ev.target.closest('.top-nav-link');
      if (!b) return;
      var id = b.id || '';
      try {
        if (id === 'navHome') { showLanding(); var sp = document.getElementById('shopPage'); if (sp) sp.hidden = true; window.scrollTo({ top: 0, behavior: 'smooth' }); }
        else if (id === 'navPartners') { openPartners(); }
        else if (id === 'navShop') enterShop();
        else if (id === 'navMonitor') enterHub('classroom');
        else if (b.dataset.hub) enterHub(b.dataset.hub);
      } catch (err) { if (window.__rec) window.__rec('navERR:' + err.message); }
    }, true);


    // ---------- v2.37 社团入驻申请 ----------
    document.getElementById('orgApplyBtn').onclick = async () => {
      const v = await uiPrompt({
        title: '申请入驻星环',
        sub: '提交后由平台运营团队审核，通过后将开通贵社团账号',
        fields: [
          { id: 'name', label: '社团名称', placeholder: '如：北京大学天文协会' },
          { id: 'school', label: '学校', placeholder: '如：北京大学' },
          { id: 'contact', label: '联系方式（微信/手机/邮箱）', placeholder: '审核通过后我们联系你' },
          { id: 'intro', label: '社团简介（可空）', placeholder: '一句话介绍贵社' }
        ]
      });
      if (!v || !v.name || !v.school || !v.contact) return;
      const r = await apiFetch('/org/apply', { method: 'POST', body: v });
      showToast((r && r.code === 0) ? '申请已提交，请等待审核' : ((r && r.message) || '提交失败'), !(r && r.code === 0));
    };
    document.addEventListener('click', function (ev) {
      if (ev.target && ev.target.id === 'wbOrgRefresh') wbLoadOrgApps();
    });
    async function wbLoadOrgApps() {
      const box = document.getElementById('wbOrgList');
      if (!box) return;
      const r = await apiFetch('/org/applications', { method: 'POST', body: {} });
      if (r && r.code === 403) { document.getElementById('wbOrg').hidden = true; return; }
      const list = (r && r.data) || [];
      box.innerHTML = list.map(m =>
        '<div class="ap-li"><span class="grow"><b>' + m.name + '</b> <span style="color:var(--faint)">' + m.school + ' · ' + m.contact + '</span>' + (m.intro ? '<br><span style="color:var(--muted);font-size:11px">' + m.intro + '</span>' : '') + '</span>' +
        '<button class="ap-mini" onclick="wbOrgApprove(\'' + m._id + '\',\'approve\',\'' + m.name + '\')">通过</button>' +
        '<button class="ap-mini danger" onclick="wbOrgApprove(\'' + m._id + '\',\'reject\',\'' + m.name + '\')">拒绝</button></div>').join('')
        || '<div class="ap-li" style="color:var(--faint)">暂无入驻申请</div>';
    }
    window.wbOrgApprove = async (id, action, name) => {
      const r = await apiFetch('/org/approve', { method: 'POST', body: { id, action, name } });
      showToast((r && r.code === 0) ? (action === 'approve' ? '已通过：请为「' + name + '」开通管理员账号' : '已拒绝') : ((r && r.message) || '操作失败'), !(r && r.code === 0));
      wbLoadOrgApps();
    };

    function canSeeTeacherBackend() {
      const u = state.user || {};
      // v2.12.4 全局管理员（含平台管理）不受课堂角色限制；其他教师仍要求授课身份
      if (u.super_admin === true || u.role === 'admin') return true;
      return u.course_teacher === true && state.classroom.role === 'teacher';
    }

    function updateTeacherControls() {
      const isTeacher = canSeeTeacherBackend();
      if (elements.teacherControlBar) elements.teacherControlBar.hidden = !isTeacher;
      if (elements.generateDiagnosisButton) elements.generateDiagnosisButton.hidden = !isTeacher;
      if (elements.mossVoiceToggle) elements.mossVoiceToggle.hidden = !isTeacher;
      if (elements.aiDiagnosisCard && !isTeacher) elements.aiDiagnosisCard.hidden = true;
      if (elements.generateDiagnosisButton) {
        elements.generateDiagnosisButton.disabled = !isTeacher || state.classroom.diagnosisBusy;
      }
      applySessionStatus(state.classroom.sessionStatus);
    }

    async function runTeacherControl(command) {
      if (state.classroom.role !== 'teacher') {
        showToast('只有任课教师可以控制课堂状态', true);
        return;
      }
      if (state.classroom.controlBusy) return;
      if (command === 'reset' && !(await uiConfirm('重置当前环节会清空本轮作答统计，并进入下一轮。确定继续吗？', '重置环节'))) return;
      state.classroom.controlBusy = true;
      applySessionStatus(state.classroom.sessionStatus);
      const labels = { pause: '正在暂停', resume: '正在恢复', reset: '正在重置' };
      const activeButton = command === 'pause'
        ? elements.pauseAnswersButton
        : command === 'resume'
          ? elements.resumeAnswersButton
          : elements.resetStageButton;
      const originalText = activeButton ? activeButton.textContent : '';
      if (activeButton) activeButton.textContent = labels[command] || '处理中';
      try {
        const data = await callCourseService('teacher_control', {
          course_id: state.classroom.courseId,
          command
        });
        state.classroom.diagnosis = null;
        elements.aiDiagnosisCard.hidden = true;
        applySessionStatus(data.session_status);
        await refreshClassStats({ silent: true });
        await refreshAuxiliaryCollections();
        const message = command === 'pause' ? '已暂停作答' : command === 'resume' ? '已恢复作答' : '已重置并进入下一轮';
        showToast(message);
      } catch (error) {
        console.error('[星环实验大屏] 教师控制失败', error);
        showToast('课堂控制失败：' + getErrorMessage(error), true);
      } finally {
        state.classroom.controlBusy = false;
        if (activeButton) activeButton.textContent = originalText;
        applySessionStatus(state.classroom.sessionStatus);
      }
    }

    function renderAIDiagnosis(data) {
      if (!elements.aiDiagnosisContent || !elements.aiDiagnosisCard) return;
      elements.aiDiagnosisCard.hidden = false;
      clearNode(elements.aiDiagnosisContent);
      const paragraphs = String((data && data.advice) || '').split(/\n\s*\n|\n/).map((item) => item.trim()).filter(Boolean);
      if (!paragraphs.length) {
        const empty = document.createElement('p');
        empty.textContent = 'AI 暂未返回有效诊断，请稍后重试。';
        elements.aiDiagnosisContent.appendChild(empty);
      } else {
        paragraphs.forEach((paragraph) => {
          const node = document.createElement('p');
          const match = paragraph.match(/^([^：:]{2,12})[：:]\s*(.*)$/);
          if (match) {
            const strong = document.createElement('strong');
            strong.textContent = match[1] + '：';
            node.append(strong, document.createTextNode(match[2]));
          } else {
            node.textContent = paragraph;
          }
          elements.aiDiagnosisContent.appendChild(node);
        });
      }
      const source = data && data.source === 'deepseek' ? 'DeepSeek 教学诊断' : '星环本地规则建议';
      const generatedAt = data && data.generated_at ? shortTime(data.generated_at) : shortTime(Date.now());
      elements.aiDiagnosisMeta.textContent = source + ' · ' + generatedAt;
    }

    async function generateAIDiagnosis() {
      if (state.classroom.role !== 'teacher') {
        showToast('只有任课教师可以生成 AI 教学诊断', true);
        return;
      }
      if (state.classroom.diagnosisBusy) return;
      state.classroom.diagnosisBusy = true;
      updateTeacherControls();
      elements.aiDiagnosisCard.hidden = false;
      elements.generateDiagnosisButton.textContent = 'AI 正在分析...';
      elements.aiDiagnosisMeta.textContent = '正在汇总本轮学情';
      elements.aiDiagnosisContent.innerHTML = '<p>正在读取选项分布与错选人员摘要，生成个性化教学建议...</p>';
      try {
        const data = await callCourseService('generate_ai_diagnosis', {
          course_id: state.classroom.courseId
        });
        state.classroom.diagnosis = data;
        renderAIDiagnosis(data);
        showToast('AI 教学诊断已生成');
      } catch (error) {
        console.error('[星环实验大屏] AI 诊断失败', error);
        elements.aiDiagnosisMeta.textContent = '生成失败';
        elements.aiDiagnosisContent.innerHTML = '<p>诊断生成失败，请稍后重试。</p>';
        showToast('AI 诊断失败：' + getErrorMessage(error), true);
      } finally {
        state.classroom.diagnosisBusy = false;
        elements.generateDiagnosisButton.textContent = '生成 AI 诊断';
        updateTeacherControls();
      }
    }

    async function refreshAuxiliaryCollections() {
      if (!state.classroom.sessionId || !state.classroom.courseId || !state.db) return;
      const jobs = [];

      jobs.push((async () => {
        try {
          let rows = [];
          const pollPayload = await apiFetch('/collection', { method: 'POST', body: { name: 'polls' } });
          rows = (pollPayload && pollPayload.data) || [];
          const related = rows.filter((poll) => {
            if (poll.session_id) return String(poll.session_id) === String(state.classroom.sessionId);
            if (poll.course_id) return String(poll.course_id) === String(state.classroom.courseId);
            return true;
          });
          state.classroom.polls = related.sort((a, b) =>
            timeValue(b.created_at || b.created_at_ms) - timeValue(a.created_at || a.created_at_ms)
          ).slice(0, 20);
          renderPollDistribution();
        } catch (error) {
          console.warn('[星环实验大屏] 投票读取失败', error);
          renderPollDistribution();
        }
      })());

      jobs.push((async () => {
        try {
          const groupPayload = await apiFetch('/collection', { method: 'POST', body: { name: 'group_tasks', where: { session_id: state.classroom.sessionId } } });
          state.classroom.groupTasks = (groupPayload && groupPayload.data) || [];
          renderGroupSubmissionWall();
        } catch (error) {
          console.warn('[星环实验大屏] 小组任务读取失败', error);
          renderGroupSubmissionWall();
        }
      })());

      await Promise.allSettled(jobs);
    }

    function renderClassroomStats(stats) {
      const overall = stats && stats.overall ? stats.overall : {};
      const total = Number(overall.total || 0);
      setClassroomStat(elements.classAnswerTotal, total, '人');
      setClassroomStat(elements.classAnswerCorrectRate, Number(overall.correct_rate || 0), '%');
      setClassroomStat(elements.classAnswerWrongRate, Number(overall.wrong_rate || 0), '%');
      setClassroomStat(elements.classQuestionCount, state.classroom.chats.length, '条');
      elements.answerTableMeta.textContent = total
        ? total + ' 人作答 · ' + Number(overall.correct || 0) + ' 人正确'
        : '本轮暂无提交';
      applySessionStatus(stats && stats.session_status);
      renderPendingList(stats);
    }

    // v1.7 MOSS 语音引擎：低沉、慢速、平静机器腔（浏览器内置 TTS，无需音频文件）
    let mossVoice = null;
    let mossCooldownUntil = 0;
    function pickMossVoice() {
      if (mossVoice) return mossVoice;
      const voices = window.speechSynthesis ? speechSynthesis.getVoices() : [];
      mossVoice =
        voices.find(v => /zh|中文|Chinese/i.test(v.lang + v.name) && /Yunyang|Yunjian|Kangkang|Male|男/i.test(v.name)) ||
        voices.find(v => /zh|中文|Chinese/i.test(v.lang + v.name)) ||
        null;
      return mossVoice;
    }
    if (window.speechSynthesis) speechSynthesis.onvoiceschanged = () => { mossVoice = null; pickMossVoice(); };

    // v2.7 MOSS 语音输出开关（仅管理员可切；输入/收音不受影响的）
    const mossVoiceState = { muted: localStorage.getItem('moss_voice_muted') === '1' };
    function mossSpeakAllowed() { return !mossVoiceState.muted; }
    function syncMossVoiceBtn() {
      const btn = elements.mossVoiceToggle;
      if (!btn) return;
      btn.textContent = mossVoiceState.muted ? 'MOSS 语音：关' : 'MOSS 语音：开';
      btn.classList.toggle('btn-gold', !mossVoiceState.muted);
    }
    function showUegModal() {
      const m = document.getElementById('uegModal');
      if (!m) return;
      m.classList.add('show');
      m.setAttribute('aria-hidden', 'false');
      setTimeout(() => { m.classList.remove('show'); m.setAttribute('aria-hidden', 'true'); }, 8000);
    }

    // v2.10 MOSS 语音三级兜底：
    // ① 本机苔总语音（moss-tts-service，http://localhost:5010；GitHub Pages https 页面跨域调用，需本机服务已启动）
    // ② 云端备用：在 index.html 里设 window.MOSS_CLOUD_TTS = 'https://...' 即启用（如以后用 Cloudflare Tunnel 暴露本机服务）
    // ③ 浏览器内置合成音（原方案，永远可用但音色不是苔总）
    const MOSS_LOCAL_TTS = 'http://localhost:5010/text_to_speech';
    const MOSS_CLOUD_TTS = window.MOSS_CLOUD_TTS || '';

    // 用 Audio 播放一个音频地址；播完 resolve，出错/被自动播放策略拦截 reject（用于降级到下一级）
    function playWavUrl(url) {
      return new Promise((resolve, reject) => {
        const audio = new Audio();
        audio.onended = () => resolve();
        audio.onerror = () => reject(new Error('音频播放失败'));
        audio.src = url;
        audio.play().catch(reject);
      });
    }

    // 调用一个 TTS 接口（POST {text, speechRate} → wav）并播放，成功返回 true
    async function speakViaTtsApi(url, text) {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text, speechRate: 1 })
      });
      if (!resp.ok) throw new Error('TTS 接口响应 ' + resp.status);
      const blob = await resp.blob();
      const objectUrl = URL.createObjectURL(blob);
      try {
        await playWavUrl(objectUrl);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
      return true;
    }

    function mossSpeak(text, onEnd) {
      if (!mossSpeakAllowed()) { if (onEnd) setTimeout(onEnd, 300); return; }
      (async () => {
        // 第一级：本机苔总语音（服务没开/被拦就自动降级）
        try {
          await speakViaTtsApi(MOSS_LOCAL_TTS, text);
          if (onEnd) setTimeout(onEnd, 100);
          return;
        } catch (e) { console.warn('[moss-voice] 本机语音不可用，尝试降级', e); }
        // 第二级：云端备用（配置了才走，否则跳过）
        if (MOSS_CLOUD_TTS) {
          try {
            await speakViaTtsApi(MOSS_CLOUD_TTS, text);
            if (onEnd) setTimeout(onEnd, 100);
            return;
          } catch (e) { console.warn('[moss-voice] 云端语音不可用，降级浏览器合成', e); }
        }
        // 第三级：浏览器合成音（兜底）
        if (!window.speechSynthesis) { if (onEnd) setTimeout(onEnd, 3000); return; }
        try {
          const utter = new SpeechSynthesisUtterance(text);
          const v = pickMossVoice();
          if (v) utter.voice = v;
          utter.pitch = 0.55;   // 压低 = 机器感
          utter.rate = 0.88;    // 略慢 = MOSS 的平静
          utter.volume = 1;
          if (onEnd) { utter.onend = onEnd; utter.onerror = onEnd; }
          speechSynthesis.cancel();
          speechSynthesis.speak(utter);
        } catch (e) { console.warn('MOSS 语音失败', e); if (onEnd) setTimeout(onEnd, 3000); }
      })();
    }

    // 全屏红警：showMossAlert(['张三','李四'])
    function showMossAlert(names) {
      const mask = document.getElementById('mossAlert');
      const box = document.getElementById('mossNames');
      if (!mask || !box) return;
      clearNode(box);
      names.forEach(n => {
        const chip = document.createElement('span');
        chip.className = 'moss-name';
        chip.textContent = n;
        box.appendChild(chip);
      });
      mask.classList.add('show');
      mask.setAttribute('aria-hidden', 'false');
      const spoken = '警告。检测到，' + names.slice(0, 3).join('，') + '，切屏行为。课堂注意力，已离线。请教师关注。';
      // v1.8：语音播完自动退出；onend 不可靠时由兜底计时器关闭
      const spokenLen = spoken.length;
      mossSpeak(spoken, () => hideMossAlert());
      clearTimeout(state.mossAutoTimer);
      state.mossAutoTimer = setTimeout(() => hideMossAlert(), Math.min(20000, 4000 + spokenLen * 320));
      mossCooldownUntil = Date.now() + 45000; // 45 秒冷却，避免连播
    }
    function hideMossAlert() {
      clearTimeout(state.mossAutoTimer);
      const mask = document.getElementById('mossAlert');
      if (!mask) return;
      mask.classList.remove('show');
      mask.setAttribute('aria-hidden', 'true');
      if (window.speechSynthesis) speechSynthesis.cancel();
    }

    // v2.1 PPT 演示：本机解析，支持多图翻页 / pptx（best-effort）
    const ppt = { slides: [], index: 0 };
    function renderPptSlide() {
      const stage = document.getElementById('pptStage');
      if (!stage) return;
      const pages = stage.querySelectorAll('.slide-page');
      pages.forEach((p, i) => p.classList.toggle('active', i === ppt.index));
      const nav = document.getElementById('pptNav');
      const pageLabel = document.getElementById('pptPage');
      if (nav) nav.hidden = ppt.slides.length === 0;
      if (pageLabel) pageLabel.textContent = ppt.slides.length ? (ppt.index + 1) + ' / ' + ppt.slides.length : '0 / 0';
      const prev = document.getElementById('pptPrev');
      const next = document.getElementById('pptNext');
      if (prev) prev.disabled = ppt.index <= 0;
      if (next) next.disabled = ppt.index >= ppt.slides.length - 1;
    }
    function clearPpt() {
      const stage = document.getElementById('pptStage');
      if (stage) stage.innerHTML = '<div class="classroom-empty compact">点击"打开 PPT"选择文件，或把多张课堂照片拖进来</div>';
      ppt.slides = []; ppt.index = 0;
      renderPptSlide();
      const clearBtn = document.getElementById('pptClear');
      const resize = document.getElementById('pptResize');
      if (clearBtn) clearBtn.hidden = true;
      if (resize) resize.hidden = true;
    }
    function loadImageSlides(files) {
      const stage = document.getElementById('pptStage');
      if (!stage) return;
      stage.innerHTML = '';
      ppt.slides = [];
      files.forEach(f => {
        const url = URL.createObjectURL(f);
        const page = document.createElement('div');
        page.className = 'slide-page';
        const img = document.createElement('img');
        img.className = 'slide-img';
        img.src = url;
        page.appendChild(img);
        stage.appendChild(page);
        ppt.slides.push(url);
      });
      ppt.index = 0;
      renderPptSlide();
      const clearBtn = document.getElementById('pptClear');
      const resize = document.getElementById('pptResize');
      if (clearBtn) clearBtn.hidden = false;
      if (resize) resize.hidden = false;
    }
    function loadPptx(file) {
      // best-effort：动态加载 pptxjs 渲染；失败则提示转图片方案
      const stage = document.getElementById('pptStage');
      const loadScript = (src) => new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = src; s.onload = res; s.onerror = rej;
        document.head.appendChild(s);
      });
      stage.innerHTML = '<div class="classroom-empty compact">正在解析 PPT…</div>';
      (async () => {
        try {
          if (!window.jQuery) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js');
          if (!window.JSZip) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.7.1/jszip.min.js');
          await loadScript('https://cdn.jsdelivr.net/gh/meshesha/PPTXjs@1.21.1/js/pptxjs.min.js');
          stage.innerHTML = '';
          const url = URL.createObjectURL(file);
          if (jQuery(stage).pptxToHtml) {
            jQuery(stage).pptxToHtml({ file: url });
            const resize = document.getElementById('pptResize');
            if (resize) resize.hidden = false;
          } else {
            throw new Error('渲染器不可用');
          }
        } catch (e) {
          stage.innerHTML = '<div class="classroom-empty compact">PPT 解析失败（可能是网络拦截了渲染库）。替代方案：在 PowerPoint/WPS 里"另存为图片"，把各页 jpg 一起选中上传，效果相同。</div>';
        }
      })();
    }
    function bindPpt() {
      const input = document.getElementById('pptFile');
      const upload = document.getElementById('pptUpload');
      if (upload && input) upload.addEventListener('click', () => input.click());
      if (input) input.addEventListener('change', () => {
        const files = Array.from(input.files || []);
        if (!files.length) return;
        const images = files.filter(f => /^image\//.test(f.type));
        if (files.length === 1 && /\.pptx$/i.test(files[0].name)) loadPptx(files[0]);
        else if (images.length) loadImageSlides(images);
        else alert('请选择 .pptx 文件或图片');
        input.value = '';
      });
      const prev = document.getElementById('pptPrev');
      const next = document.getElementById('pptNext');
      const clearBtn = document.getElementById('pptClear');
      if (prev) prev.addEventListener('click', () => { if (ppt.index > 0) { ppt.index--; renderPptSlide(); } });
      if (next) next.addEventListener('click', () => { if (ppt.index < ppt.slides.length - 1) { ppt.index++; renderPptSlide(); } });
      if (clearBtn) clearBtn.addEventListener('click', clearPpt);

      // 尺寸拖拽：右下角把手调宽度，记忆到 localStorage
      const stage = document.getElementById('pptStage');
      const resize = document.getElementById('pptResize');
      if (stage) {
        const saved = Number(localStorage.getItem('ppt_width') || 0);
        if (saved >= 320) stage.style.width = saved + 'px';
      }
      if (resize && stage) {
        resize.addEventListener('mousedown', (e) => {
          e.preventDefault();
          const startX = e.clientX;
          const startW = stage.getBoundingClientRect().width;
          const onMove = (ev) => {
            const w = Math.max(320, Math.min(window.innerWidth - 40, startW + (ev.clientX - startX)));
            stage.style.width = w + 'px';
          };
          const onUp = (ev) => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            localStorage.setItem('ppt_width', String(Math.round(stage.getBoundingClientRect().width)));
          };
          document.addEventListener('mousemove', onMove);
          document.addEventListener('mouseup', onUp);
        });
      }

      // 面板收起：所有 panel / classroom-block 头部加收起按钮，状态存 localStorage，互不影响
      const savedCollapsed = new Set(JSON.parse(localStorage.getItem('collapsed_blocks') || '[]'));
      document.querySelectorAll('.panel, .classroom-block').forEach((block, i) => {
        const head = block.querySelector('.panel-head, .classroom-block-head');
        if (!head) return;
        const id = block.id || (block.className.split(' ')[0] + '_' + i);
        const btn = document.createElement('button');
        btn.className = 'collapse-btn';
        btn.type = 'button';
        btn.textContent = '收起';
        head.appendChild(btn);
        if (savedCollapsed.has(id)) { block.classList.add('collapsed'); btn.textContent = '展开'; }
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          block.classList.toggle('collapsed');
          const collapsed = block.classList.contains('collapsed');
          btn.textContent = collapsed ? '展开' : '收起';
          if (collapsed) savedCollapsed.add(id); else savedCollapsed.delete(id);
          localStorage.setItem('collapsed_blocks', JSON.stringify(Array.from(savedCollapsed)));
        });
      });
    }

    // v2.0 教师端收音：MediaRecorder → PCM16 → SCF 转写+认人 → 实时发言流
    const mic = { on: false, recorder: null, audioCtx: null, busy: false };

    async function decodeToPcm16(blob) {
      const buf = await blob.arrayBuffer();
      if (!mic.audioCtx) mic.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const decoded = await mic.audioCtx.decodeAudioData(buf);
      const src = decoded.getChannelData(0);
      const targetRate = 16000;
      const ratio = decoded.sampleRate / targetRate;
      const outLen = Math.floor(src.length / ratio);
      const out = new Int16Array(outLen);
      for (let i = 0; i < outLen; i++) {
        const idx = Math.floor(i * ratio);
        let s = Math.max(-1, Math.min(1, src[idx]));
        out[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      let bin = '';
      const bytes = new Uint8Array(out.buffer);
      const CHUNK = 0x8000;
      for (let i = 0; i < bytes.length; i += CHUNK) {
        bin += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + CHUNK, bytes.length)));
      }
      return btoa(bin);
    }

    function startMicLoop() {
      if (mic.recorder) return;
      const rec = new MediaRecorder(new MediaStream(micStream.getTracks()));
      mic.recorder = rec;
      rec.ondataavailable = () => {};
      rec.onstop = async () => {
        if (!mic.on) return;
        const blob = lastBlob;
        lastBlob = null;
        if (blob && !mic.busy) {
          mic.busy = true;
          try {
            const audio = await decodeToPcm16(blob);
            await apiFetch('/voice/classroom-audio', {
              method: 'POST',
              body: { audio, session_id: state.classroom.sessionId, course_id: state.classroom.courseId }
            });
          } catch (e) { console.warn('[mic] 分片上传失败', e); }
          finally { mic.busy = false; }
        }
        if (mic.on) setTimeout(() => { try { rec.start(); scheduleStop(); } catch (e) {} }, 120);
      };
      let lastBlob = null;
      const scheduleStop = () => setTimeout(() => {
        if (mic.on && rec.state === 'recording') {
          const reader = new FileReader();
          rec.requestData ? null : null;
          rec.ondataavailable = (e) => { if (e.data && e.data.size) lastBlob = e.data; };
          rec.stop();
        }
      }, 3000);
      rec.start();
      scheduleStop();
    }
    let micStream = null;

    async function toggleMic() {
      if (mic.on) {
        mic.on = false;
        try { mic.recorder && mic.recorder.state !== 'inactive' && mic.recorder.stop(); } catch (e) {}
        mic.recorder = null;
        if (micStream) { micStream.getTracks().forEach(t => t.stop()); micStream = null; }
        elements.micToggle.textContent = '开启收音';
        elements.micToggle.classList.remove('recording');
        return;
      }
      // 首次开启前检查声纹注册
      try {
        const st = await apiFetch('/voice/status', { method: 'GET' });
        if (st && st.code === 0 && st.data && !st.data.enrolled) { openVoiceEnroll(); return; }
      } catch (e) {}
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mic.on = true;
      elements.micToggle.textContent = '收音中 · 点击停止';
      elements.micToggle.classList.add('recording');
      startMicLoop();
      mossSpeak('MOSS 已接入课堂音频通道。开始监听。'); // v2.7 收音即语音接入
    }

    // v2.10 学生/教师网页端声纹注册入口：登录后显示按钮，点击复用注册弹窗
    async function syncVoiceEnrollButton() {
      const btn = elements.voiceEnrollButton;
      if (!btn) return;
      btn.hidden = false;
      btn.textContent = '注册声纹';
      try {
        const st = await apiFetch('/voice/status', { method: 'GET' });
        if (st && st.code === 0 && st.data && st.data.enrolled) btn.textContent = '重新录制声纹';
      } catch (e) {}
    }

    function openVoiceEnroll() {
      elements.voiceEnrollModal.classList.add('open');
      elements.voiceEnrollModal.setAttribute('aria-hidden', 'false');
      elements.veStatus.textContent = '';
    }
    function closeVoiceEnroll() {
      elements.voiceEnrollModal.classList.remove('open');
      elements.voiceEnrollModal.setAttribute('aria-hidden', 'true');
    }
    async function enrollRecord() {
      if (!elements.veConsent.checked) { elements.veStatus.textContent = '请先勾选同意书'; return; }
      elements.veStatus.textContent = '录音中，请朗读上方文字…';
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const rec = new MediaRecorder(stream);
        const chunks = [];
        rec.ondataavailable = e => chunks.push(e.data);
        const done = new Promise(res => { rec.onstop = res; });
        rec.start();
        setTimeout(() => rec.stop(), 5000);
        await done;
        stream.getTracks().forEach(t => t.stop());
        elements.veStatus.textContent = '识别中…';
        const audio = await decodeToPcm16(new Blob(chunks));
        const r = await apiFetch('/voice/enroll', { method: 'POST', body: { audio, consent: true } });
        if (r && r.code === 0) {
          elements.veStatus.textContent = '注册成功，课堂收音将能识别你的发言';
          if (elements.voiceEnrollButton) elements.voiceEnrollButton.textContent = '重新录制声纹';
          setTimeout(() => { closeVoiceEnroll(); }, 900);
        } else {
          elements.veStatus.textContent = (r && r.message) || '注册失败';
        }
      } catch (e) {
        elements.veStatus.textContent = '麦克风不可用：' + (e.message || e);
      }
    }

    // v1.9 实时发言面板：轮询 voice_activity，最新一条高亮为"正在发言"
    async function refreshVoiceFeed() {
      if (!state.classroom.sessionId || !classroomIsReady()) return;
      try {
        const payload = await apiFetch('/collection', { method: 'POST', body: { name: 'voice_activity', where: { session_id: state.classroom.sessionId } } });
        renderVoiceFeed((payload && payload.data) || []);
      } catch (error) { console.warn('[星环教学中枢] 实时发言读取失败', error); }
    }
    let voiceSigCache = ''; // v2.12.1 性能优化
    function renderVoiceFeed(items) {
      const el = elements.voiceFeed;
      if (!el) return;
      const quickSig = (items || []).map((r) => (r.at || '') + ':' + (r.member_name || '') + ':' + (r.text || '')).join('|');
      if (quickSig && quickSig === voiceSigCache) return;
      voiceSigCache = quickSig;
      const rows = items.slice().sort((a, b) => Number(b.at || 0) - Number(a.at || 0)).slice(0, 30);
      clearNode(el);
      if (!rows.length) {
        const empty = document.createElement('div');
        empty.className = 'classroom-empty compact';
        empty.textContent = '学生发言经声纹识别后实时汇入';
        el.appendChild(empty);
        if (elements.voiceFeedMeta) elements.voiceFeedMeta.textContent = 'voice_activity · 等待数据';
        return;
      }
      rows.forEach((row, i) => {
        const item = document.createElement('div');
        item.className = 'voice-item' + (i === 0 ? ' latest' : '');
        const text = document.createElement('div');
        text.className = 'voice-text';
        const who = document.createElement('b');
        who.textContent = row.member_name || '成员';
        text.append(who, document.createTextNode('：' + (row.text || '')));
        const time = document.createElement('div');
        time.className = 'voice-time';
        time.textContent = shortTime(row.at);
        item.append(text, time);
        el.appendChild(item);
      });
      if (elements.voiceFeedMeta) elements.voiceFeedMeta.textContent = rows.length + ' 条发言 · 最新：' + (rows[0].member_name || '成员');
    }

    // v1.9 声纹注册名单
    async function refreshVoiceRoster() {
      if (!state.classroom.courseId || !classroomIsReady()) return;
      try {
        const payload = await apiFetch('/voice/roster?course_id=' + state.classroom.courseId + '&session_id=' + state.classroom.sessionId, { method: 'GET' });
        if (!payload || payload.code !== 0) {
          if (elements.voiceRosterMeta) elements.voiceRosterMeta.textContent = (payload && payload.message) || '读取失败';
          return;
        }
        renderVoiceRoster(payload.data || []);
      } catch (error) { console.warn('[星环教学中枢] 声纹名单读取失败', error); }
    }
    function renderVoiceRoster(students) {
      const el = elements.voiceRoster;
      if (!el) return;
      clearNode(el);
      if (!students.length) {
        const empty = document.createElement('div');
        empty.className = 'classroom-empty compact';
        empty.textContent = '暂无课程学生数据';
        el.appendChild(empty);
        return;
      }
      let on = 0;
      students.forEach(s => {
        if (s.voice_enrolled) on++;
        const chip = document.createElement('span');
        chip.className = 'vr-chip ' + (s.voice_enrolled ? 'vr-on' : 'vr-off');
        chip.textContent = (s.name || '成员') + (s.voice_enrolled ? '' : ' · 未注册');
        el.appendChild(chip);
      });
      if (elements.voiceRosterMeta) elements.voiceRosterMeta.textContent = '已注册声纹 ' + on + '/' + students.length;
    }

    // v2.6 MOSS 助教：驱动心跳 + 面板渲染 + 语音播报
    let mossSignature = '';
    // v2.6 学生声音：问题/观点两个区域 × AI 分类筛选
    const sv = { kind: 'question', category: '' };
    // v2.11 学生操作台状态：kind=问题/观点；checked=本次课是否已签到；selected=答题已选项
    const sc = { kind: 'question', checked: false, selected: new Set() };
    async function refreshStudentVoice() {
      if (!state.classroom.sessionId || !classroomIsReady()) return;
      try {
        const payload = await apiFetch('/collection', { method: 'POST', body: { name: 'class_posts', where: { session_id: state.classroom.sessionId } } });
        renderStudentVoice((payload && payload.data) || []);
      } catch (e) { console.warn('[sv] 读取失败', e); }
    }
    let svSigCache = ''; // v2.12.1 性能优化
    function renderStudentVoice(items) {
      const listEl = elements.svList;
      if (!listEl) return;
      const quickSig = sv.kind + '|' + sv.category + '|' + (items || []).map((r) => (r.at || '') + ':' + (r.content || '')).join('|');
      if (quickSig === svSigCache) return;
      svSigCache = quickSig;
      const rows = items.filter(x => x.kind === sv.kind)
        .sort((a, b) => Number(b.at || 0) - Number(a.at || 0));
      // 分类 chips
      const catCount = {};
      rows.forEach(x => { catCount[x.category || '其他'] = (catCount[x.category || '其他'] || 0) + 1; });
      clearNode(elements.svCats);
      const allBtn = document.createElement('span');
      allBtn.className = 'sv-cat' + (sv.category === '' ? ' active' : '');
      allBtn.textContent = '全部 ' + rows.length;
      allBtn.addEventListener('click', () => { sv.category = ''; renderStudentVoice(items); });
      elements.svCats.appendChild(allBtn);
      Object.keys(catCount).forEach(cat => {
        const c = document.createElement('span');
        c.className = 'sv-cat' + (sv.category === cat ? ' active' : '');
        c.textContent = cat + ' ' + catCount[cat];
        c.addEventListener('click', () => { sv.category = sv.category === cat ? '' : cat; renderStudentVoice(items); });
        elements.svCats.appendChild(c);
      });
      const shown = sv.category ? rows.filter(x => (x.category || '其他') === sv.category) : rows;
      clearNode(listEl);
      if (!shown.length) {
        const empty = document.createElement('div');
        empty.className = 'classroom-empty compact';
        empty.textContent = sv.kind === 'question' ? '暂无疑问，鼓励学生提问' : '暂无观点，鼓励学生表达';
        listEl.appendChild(empty);
      } else {
        shown.slice(0, 40).forEach(row => {
          const item = document.createElement('article');
          item.className = 'sv-item';
          const top = document.createElement('div');
          top.className = 'sv-top';
          const name = document.createElement('span');
          name.className = 'sv-name';
          name.textContent = row.member_name || '成员';
          const tag = document.createElement('span');
          tag.className = 'sv-cat-tag';
          tag.textContent = row.category || '其他';
          const time = document.createElement('span');
          time.className = 'sv-time';
          time.textContent = shortTime(row.at);
          top.append(name, tag, time);
          const text = document.createElement('div');
          text.className = 'sv-text';
          text.textContent = row.content || '';
          item.append(top, text);
          listEl.appendChild(item);
        });
      }
      if (elements.svMeta) elements.svMeta.textContent = (sv.kind === 'question' ? '问题' : '观点') + ' ' + shown.length + ' 条';
      state.svItems = items;
    }

    // v2.12 页面标签切换：课堂看板 / 学习资源 / 控制台（控制台学生显示"您暂无权限"）
    const tcHome = { parent: null, next: null }; // 记录教师控制条在课堂板块的原位置，切回时还原

    function moveTeacherBar(toSlot) {
      const bar = elements.teacherControlBar;
      if (!bar) return;
      if (toSlot) {
        if (!tcHome.parent) { tcHome.parent = bar.parentElement; tcHome.next = bar.nextElementSibling; }
        toSlot.appendChild(bar);
      } else if (tcHome.parent) {
        tcHome.parent.insertBefore(bar, tcHome.next);
      }
    }

    function switchPage(tab) {
      document.querySelectorAll('.page-tab').forEach((b) => {
        b.classList.toggle('active', b.dataset.tab === tab);
      });
      // 课堂板块整体显隐
      document.querySelectorAll('.tab-classroom').forEach((el) => {
        el.hidden = tab !== 'classroom';
      });
      /* v2.46 课程管理属于监控中枢：教师在课堂看板页可见 */
      if (tab === 'classroom') {
        var caEl = document.getElementById('courseAdmin');
        if (caEl) {
          if (canSeeTeacherBackend()) {
            caEl.style.display = 'block';
            caBind();
            caLoadSeries();
          } else {
            caEl.style.display = 'none';
          }
        }
      }
      if (elements.resourcesPage) {
        elements.resourcesPage.hidden = tab !== 'resources';
        if (tab === 'resources' && typeof renderAstroRes === 'function') renderAstroRes();
        if (tab === 'resources') loadVideos();
      }
      if (document.getElementById('workbenchPage')) {
        document.getElementById('workbenchPage').hidden = tab !== 'workbench';
        if (tab === 'workbench') { wbSetup(); wbLoad(); }
      }
      if (document.getElementById('communityPage')) {
        document.getElementById('communityPage').hidden = tab !== 'community';
        if (tab === 'community') { cmBind(); cmLoad(); }
      }
      if (elements.consolePage) {
        elements.consolePage.hidden = tab !== 'console';
        if (tab === 'console') {
          /* v2.46 控制台分级：3D 态势屏仅星环终端工作人员（超管/平台管理员）可见；
             任课教师仍可进控制台管理课程，但看不到态势屏 */
          /* v2.46 控制台仅星环终端工作人员（超管/平台管理员） */
          var u = state.user || {};
          var isStaff = u.super_admin === true || u.admin_scope === 'platform' || u.role === 'admin';
          if (isStaff) {
            elements.consoleDenied.hidden = true;
            elements.consoleSlot.hidden = false;
          } else {
            elements.consoleSlot.hidden = true;
            elements.consoleDenied.hidden = false;
          }
          var od = document.getElementById('opsDash');
          if (od) od.style.display = isStaff ? '' : 'none';
          var ogEl = document.getElementById('wbOrg');
          if (ogEl) {
            ogEl.hidden = !isStaff;
            if (isStaff) wbLoadOrgApps();
          }
        } else {
          moveTeacherBar(null); // 离开控制台页，把控制条放回课堂板块原位置
        }
      }
      if (state.chart) state.chart.resize(); // 切回课堂时图表尺寸校正
    }

    // v2.11 学生操作台：小程序课堂页功能网页版。数据来自 get_classroom_state 的 current_session.phase_payload
    function renderStudentConsole(data) {
      const wrap = elements.studentConsole;
      if (!wrap) return;
      const connected = state.classroom.sessionId && classroomIsReady();
      if (!connected || canSeeTeacherBackend()) { wrap.hidden = true; return; }
      wrap.hidden = false;
      const session = (data && data.current_session) || null;
      const pp = (session && session.phase_payload) || {};
      const phaseNames = { checkin: '课堂签到', quiz: '课堂答题', task: '小组任务', discuss: '自由讨论', idle: '课前准备' };
      elements.scPhaseMeta.textContent = '当前环节：' + (phaseNames[(session && session.phase) || 'idle'] || '课堂进行中');
      // 答题卡：有 quiz 环节才显示；my_response 存在即已提交
      const quiz = pp.quiz || null;
      if (quiz) {
        elements.scQuizCard.hidden = false;
        elements.scQuizQuestion.textContent = quiz.question || '本轮题目';
        renderScQuizOptions(quiz);
        const mine = quiz.my_response;
        if (mine) {
          elements.scQuizState.textContent = '已提交：' + (((mine.answers || [])).join('、'));
          elements.scQuizSubmit.disabled = true;
        } else if (state.classroom.sessionStatus === 'paused') {
          elements.scQuizState.textContent = '教师已暂停作答';
          elements.scQuizSubmit.disabled = true;
        } else {
          elements.scQuizState.textContent = quiz.quiz_type === 'multiple' ? '可多选' : '单选';
          elements.scQuizSubmit.disabled = false;
        }
      } else {
        elements.scQuizCard.hidden = true;
      }
      // 签到卡：有 checkin 环节才显示
      const checkin = pp.checkin || null;
      if (checkin) {
        elements.scCheckinCard.hidden = false;
        if (sc.checked) {
          elements.scCheckinState.textContent = '已签到';
          elements.scCheckinButton.disabled = true;
        } else {
          elements.scCheckinState.textContent = '点击按钮完成签到';
          elements.scCheckinButton.disabled = false;
        }
      } else {
        elements.scCheckinCard.hidden = true;
      }
      // 小组任务卡：有 task 环节才显示；group_summary 学生端只含本组
      const task = pp.task || null;
      if (task) {
        elements.scTaskCard.hidden = false;
        elements.scTaskRequirement.textContent = '任务要求：' + (task.requirement || '见教师布置');
        const myTask = (((data.group_summary || {}).items) || [])[0];
        if (myTask && myTask.submit_status === 'submitted') {
          elements.scTaskState.textContent = '你的小组已提交';
          elements.scTaskSubmit.disabled = true;
        } else {
          elements.scTaskState.textContent = '';
          elements.scTaskSubmit.disabled = false;
        }
      } else {
        elements.scTaskCard.hidden = true;
      }
      // 匿名提问开关跟随教师端设置
      const allowAnon = !state.classroom.chatSettings || state.classroom.chatSettings.allow_anonymous_questions !== false;
      elements.scChatAnon.checked = allowAnon;
      elements.scChatAnon.disabled = !allowAnon;
    }

    function renderScQuizOptions(quiz) {
      const box = elements.scQuizOptions;
      clearNode(box);
      sc.selected.clear();
      (quiz.options || []).forEach((opt) => {
        const key = String(opt.key !== undefined ? opt.key : (opt.label || opt.text || ''));
        const chip = document.createElement('span');
        chip.className = 'sc-opt';
        chip.textContent = opt.text || opt.label || key;
        chip.addEventListener('click', () => {
          if (quiz.quiz_type === 'multiple') {
            // 多选：可反复切换
            if (sc.selected.has(key)) { sc.selected.delete(key); chip.classList.remove('sel'); }
            else { sc.selected.add(key); chip.classList.add('sel'); }
          } else {
            // 单选：清空后只选当前
            sc.selected.clear();
            box.querySelectorAll('.sc-opt').forEach((c) => c.classList.remove('sel'));
            sc.selected.add(key);
            chip.classList.add('sel');
          }
        });
        box.appendChild(chip);
      });
    }

    async function scSubmitQuiz() {
      if (!sc.selected.size) { showToast('请先选择答案', true); return; }
      elements.scQuizSubmit.disabled = true;
      try {
        const r = await callCourseService('submit_quiz', {
          course_id: state.classroom.courseId,
          answers: Array.from(sc.selected)
        });
        showToast(r && r.already_submitted ? '本轮已提交过答案' : '答案已提交');
        sc.selected.clear();
        await refreshClassStats({ silent: true });
        await refreshClassroomChats();
      } catch (e) {
        showToast('提交失败：' + getErrorMessage(e), true);
        elements.scQuizSubmit.disabled = false;
      }
    }

    async function scSubmitCheckin() {
      elements.scCheckinButton.disabled = true;
      try {
        const r = await callCourseService('submit_checkin', { course_id: state.classroom.courseId });
        showToast(r && r.already_checked ? '你已签到过' : '签到成功');
        sc.checked = true;
        await refreshClassroomChats();
      } catch (e) {
        showToast('签到失败：' + getErrorMessage(e), true);
        elements.scCheckinButton.disabled = false;
      }
    }

    async function scSendChat() {
      const content = elements.scChatInput.value.trim();
      if (!content || !state.classroom.courseId) return;
      elements.scChatSend.disabled = true;
      try {
        const r = await callCourseService('send_classroom_chat', {
          course_id: state.classroom.courseId,
          content: content,
          is_anonymous: elements.scChatAnon.checked
        });
        if (r && r.muted) {
          showToast('教师已开启全员禁言', true);
        } else {
          showToast('已发送到提问广场');
          elements.scChatInput.value = '';
        }
        await refreshClassroomChats();
      } catch (e) {
        showToast('发送失败：' + getErrorMessage(e), true);
      } finally {
        elements.scChatSend.disabled = false;
      }
    }

    async function scSendPost() {
      const content = elements.scPostInput.value.trim();
      if (content.length < 2 || !state.classroom.sessionId) { showToast('内容至少 2 个字', true); return; }
      elements.scPostSend.disabled = true;
      try {
        const r = await apiFetch('/classroom/post', {
          method: 'POST',
          body: { session_id: state.classroom.sessionId, course_id: state.classroom.courseId, content: content, kind: sc.kind }
        });
        if (r && r.code === 0) {
          showToast('已提交，AI 归类：' + ((r.data && r.data.category) || '其他'));
          elements.scPostInput.value = '';
          refreshStudentVoice();
        } else {
          showToast((r && r.message) || '提交失败', true);
        }
      } catch (e) {
        showToast('提交失败', true);
      } finally {
        elements.scPostSend.disabled = false;
      }
    }

    async function scSubmitTask() {
      const content = elements.scTaskContent.value.trim();
      if (!content) { showToast('请填写任务内容', true); return; }
      elements.scTaskSubmit.disabled = true;
      try {
        const r = await callCourseService('submit_group_task', { course_id: state.classroom.courseId, content: content });
        showToast(r && r.already_submitted ? '小组已提交过' : '小组任务已提交');
        elements.scTaskContent.value = '';
        await refreshClassroomChats();
      } catch (e) {
        showToast('提交失败：' + getErrorMessage(e), true);
        elements.scTaskSubmit.disabled = false;
      }
    }

    async function sendMossChat() {
      const input = elements.mossInput;
      if (!input) return;
      const text = input.value.trim();
      if (!text || !state.classroom.sessionId) return;
      if (elements.mossSend) elements.mossSend.disabled = true;
      input.value = '';
      try {
        const r = await apiFetch('/moss/chat', { method: 'POST', body: { session_id: state.classroom.sessionId, text } });
        if (r && r.code === 0 && r.data && r.data.ueg) {
          showUegModal();
          refreshMossFeed();
        } else if (r && r.code === 0 && r.data && r.data.reply) {
          refreshMossFeed();
        } else if (r && r.message) {
          showToast(r.message, true);
        }
      } catch (e) { showToast('MOSS 暂时无法回应', true); }
      finally { if (elements.mossSend) elements.mossSend.disabled = false; }
    }

    async function driveMossTick() {
      if (!state.classroom.sessionId || !classroomIsReady()) return;
      try {
        await apiFetch('/moss/tick', { method: 'POST', body: { session_id: state.classroom.sessionId } });
      } catch (e) { console.warn('[moss] tick 失败', e); }
    }
    async function refreshMossFeed() {
      if (!state.classroom.sessionId || !classroomIsReady()) return;
      try {
        const payload = await apiFetch('/collection', { method: 'POST', body: { name: 'moss_events', where: { session_id: state.classroom.sessionId } } });
        renderMossFeed((payload && payload.data) || []);
      } catch (e) { console.warn('[moss] 读取失败', e); }
    }
    function renderMossFeed(events) {
      const el = elements.mossFeed;
      if (!el) return;
      // v2.12.1 性能优化：数据没变就不重建 DOM（每 5 秒轮询不再整屏重绘）
      const quickSig = (events || []).map((r) => (r.at || '') + ':' + (r.text || '')).join('|');
      if (quickSig === mossSignature) return;
      const tagNames = { correct: '纠正', supplement: '补充', question: '提问', chat: '对话' };
      const rows = events.slice().sort((a, b) => Number(b.at || 0) - Number(a.at || 0)).slice(0, 20);
      clearNode(el);
      if (!rows.length) {
        const empty = document.createElement('div');
        empty.className = 'classroom-empty compact';
        empty.textContent = 'MOSS 正在旁听课堂，关键时机会自动介入';
        el.appendChild(empty);
        if (elements.mossFeedMeta) elements.mossFeedMeta.textContent = '自动提问 · 纠错 · 补充';
        return;
      }
      rows.forEach((row, i) => {
        const item = document.createElement('article');
        item.className = 'moss-item';
        const tag = document.createElement('span');
        tag.className = 'moss-tag ' + (row.type || 'supplement');
        tag.textContent = tagNames[row.type] || '补充';
        const body = document.createElement('div');
        if (row.type === 'chat' && row.reason) {
          const q = document.createElement('div');
          q.className = 'moss-q';
          q.textContent = row.reason;
          body.appendChild(q);
        }
        const text = document.createElement('div');
        text.className = 'moss-text';
        text.textContent = row.text || '';
        body.appendChild(text);
        if (row.reason) {
          const reason = document.createElement('div');
          reason.className = 'moss-reason';
          reason.textContent = '依据：' + row.reason;
          body.appendChild(reason);
        }
        item.append(tag, body);
        el.appendChild(item);
      });
      // 新事件语音播报（20 秒节流，复用 MOSS 声线）
      const sig = rows.map(r => (r.at || '') + ':' + (r.text || '')).join('|');
      if (mossSignature && sig !== mossSignature) {
        const latest = rows[0];
        if (latest && latest.text && Date.now() > mossCooldownUntil) {
          mossSpeak(String(latest.text).replace(/^(更正|补充|提问)：/, '$1。'), null);
          mossCooldownUntil = Date.now() + 20000;
        }
      }
      mossSignature = sig;
      if (elements.mossFeedMeta) elements.mossFeedMeta.textContent = rows.length + ' 次介入';
    }

    // v1.6 课堂警报：轮询 course_events（切屏/离开应用），聚合并红色警报
    async function refreshCheatEvents() {
      if (!state.classroom.sessionId || !classroomIsReady()) return;
      try {
        const payload = await apiFetch('/collection', { method: 'POST', body: { name: 'course_events', where: { session_id: state.classroom.sessionId, event: 'cheat' } } });
        renderCheatAlerts((payload && payload.data) || []);
      } catch (error) {
        console.warn('[星环教学中枢] 课堂警报读取失败', error);
      }
    }

    let cheatSignature = '';

    let cheatSigCache = ''; // v2.12.1 性能优化
    function renderCheatAlerts(events) {
      const listEl = elements.cheatAlertList;
      if (!listEl) return;
      {
        const agg = new Map();
        (events || []).forEach((ev) => {
          const key = String(ev.student_id || ev.student_name || '未知');
          const cur = agg.get(key) || { count: 0 };
          cur.count += 1;
          agg.set(key, cur);
        });
        const quickSig = Array.from(agg.values()).map((r) => r.count).join(',') + ':' + (events || []).length;
        if (quickSig === cheatSigCache) return; // 数据没变，跳过重渲染
        cheatSigCache = quickSig;
      }
      const board = listEl.closest('.cheat-block');
      const map = new Map();
      (events || []).forEach(ev => {
        const key = String(ev.student_id || ev.student_name || '未知');
        const cur = map.get(key) || { name: ev.student_name || '成员', count: 0, last: 0 };
        cur.count += 1;
        const t = Number(ev.time || 0);
        if (t > cur.last) cur.last = t;
        map.set(key, cur);
      });
      const rows = Array.from(map.values()).sort((a, b) => b.count - a.count || b.last - a.last);
      clearNode(listEl);
      if (!rows.length) {
        cheatSignature = '';
        board.classList.remove('has-alert');
        const empty = document.createElement('div');
        empty.className = 'classroom-empty compact';
        empty.textContent = '暂无警报，课堂状态正常';
        listEl.appendChild(empty);
        if (elements.cheatAlertMeta) elements.cheatAlertMeta.textContent = '切屏/离开应用事件';
        updateCheatBanner(null);
        return;
      }
      board.classList.add('has-alert');
      // v1.7 新事件触发全屏 MOSS 警报（签名变化 = 有人新增切屏，且不在冷却期）
      const signature = rows.map(r => r.name + ':' + r.count).join('|');
      if (cheatSignature && signature !== cheatSignature && Date.now() > mossCooldownUntil) {
        const newNames = rows.filter(r => {
          const prev = (cheatSignature.split('|').find(s => s.indexOf(r.name + ':') === 0) || r.name + ':0').split(':')[1];
          return r.count > Number(prev);
        }).map(r => r.name);
        if (newNames.length) showMossAlert(newNames);
      }
      cheatSignature = signature;
      rows.forEach(row => {
        const item = document.createElement('article');
        item.className = 'cheat-item';
        const avatar = document.createElement('div');
        avatar.className = 'cheat-avatar';
        avatar.textContent = String(row.name).slice(0, 1);
        const copy = document.createElement('div');
        const name = document.createElement('div');
        name.className = 'cheat-name';
        name.textContent = row.name;
        const sub = document.createElement('div');
        sub.className = 'cheat-sub';
        sub.textContent = row.last ? ('最近 ' + shortTime(row.last)) : '时间未知';
        copy.append(name, sub);
        const count = document.createElement('span');
        count.className = 'cheat-count';
        count.textContent = row.count + ' 次';
        item.append(avatar, copy, count);
        listEl.appendChild(item);
      });
      if (elements.cheatAlertMeta) elements.cheatAlertMeta.textContent = rows.length + ' 人触发警报';
      updateCheatBanner(rows);
    }

    function updateCheatBanner(rows) {
      let banner = document.querySelector('.cheat-banner');
      if (!rows || !rows.length) {
        if (banner) banner.classList.remove('show');
        return;
      }
      if (!banner) {
        const board = elements.cheatAlertList && elements.cheatAlertList.closest('.cheat-block');
        if (!board) return;
        banner = document.createElement('div');
        banner.className = 'cheat-banner';
        board.appendChild(banner);
      }
      const top = rows.slice(0, 3).map(r => r.name + '（' + r.count + '次）').join('、');
      banner.textContent = '课堂警报：' + top + (rows.length > 3 ? ' 等 ' + rows.length + ' 人' : '') + ' 疑似上课切屏，请教师关注';
      banner.classList.add('show');
      // 新事件提示音式震动（仅网页标题闪烁）
      if (document.title.indexOf('【警报】') !== 0) {
        document.title = '【警报】' + document.title.replace(/^【警报】/, '');
        setTimeout(() => { document.title = document.title.replace(/^【警报】/, ''); }, 5000);
      }
    }

    // v1.3 待作答名单 + 答题完成率：由后端 get_class_stats 的全班名单(students)与本轮作答(answers)计算
    function renderPendingList(stats) {
      if (!elements.pendingList) return;
      const students = (stats && stats.students) || [];
      const answers = (stats && stats.answers) || [];
      const answeredIds = new Set(answers.map(item => String(item.student_id)));
      const pending = students.filter(item => !answeredIds.has(String(item.student_id)));
      const total = students.length;
      const completion = total ? Math.round((answeredIds.size / total) * 100) : 0;
      if (elements.classCompletionRate) setClassroomStat(elements.classCompletionRate, completion, '%');
      clearNode(elements.pendingList);
      if (!total) {
        const empty = document.createElement('div');
        empty.className = 'classroom-empty compact';
        empty.textContent = '本轮暂无作答数据';
        elements.pendingList.appendChild(empty);
        if (elements.pendingListMeta) elements.pendingListMeta.textContent = '本轮未提交的学生';
        return;
      }
      if (!pending.length) {
        const done = document.createElement('div');
        done.className = 'classroom-empty compact';
        done.textContent = '全部完成作答';
        elements.pendingList.appendChild(done);
      } else {
        pending.forEach(item => {
          const chip = document.createElement('span');
          chip.className = 'pending-chip';
          chip.textContent = item.student_name || '成员';
          elements.pendingList.appendChild(chip);
        });
      }
      if (elements.pendingListMeta) {
        elements.pendingListMeta.textContent = pending.length + ' 人未交 · 完成率 ' + completion + '%';
      }
    }

    function studentAccuracyMap(stats) {
      const map = new Map();
      ((stats && stats.students) || []).forEach((student) => {
        map.set(String(student.student_id), {
          accuracy: Number(student.accuracy || 0),
          total: Number(student.total || 0)
        });
      });
      return map;
    }

    function renderAnswerTable(stats) {
      const answers = ((stats && stats.answers) || []).slice().sort((a, b) =>
        Number(a.submitted_at || 0) - Number(b.submitted_at || 0)
      );
      const accuracy = studentAccuracyMap(stats);
      state.classroom.answers = answers;
      state.classroom.students = (stats && stats.students) || [];
      clearNode(elements.answerTableBody);

      if (!answers.length) {
        elements.answerTableEmpty.hidden = false;
        elements.answerTableWrap.hidden = true;
        elements.answerTableEmpty.textContent = '本轮课堂还没有学生提交答案。';
        return;
      }

      answers.forEach((answer) => {
        const row = document.createElement('tr');
        const studentCell = document.createElement('td');
        studentCell.textContent = answer.student_name || '成员';
        const answerCell = document.createElement('td');
        answerCell.textContent = (answer.selected_answers || []).join('、') || '未选择';
        const resultCell = document.createElement('td');
        const result = document.createElement('span');
        result.className = 'answer-result' + (answer.is_correct ? '' : ' wrong');
        result.textContent = answer.is_correct ? '正确' : '错误';
        resultCell.appendChild(result);
        const accuracyCell = document.createElement('td');
        const history = accuracy.get(String(answer.student_id));
        accuracyCell.textContent = history && history.total ? history.accuracy + '%' : '--';
        const timeCell = document.createElement('td');
        timeCell.textContent = shortTime(answer.submitted_at);
        row.append(studentCell, answerCell, resultCell, accuracyCell, timeCell);
        elements.answerTableBody.appendChild(row);
      });

      elements.answerTableEmpty.hidden = true;
      elements.answerTableWrap.hidden = false;
      elements.answerTableWrap.scrollTop = 0;
    }

    function renderWrongOptions(stats) {
      const options = (stats && stats.wrong_options) || [];
      clearNode(elements.wrongOptionList);
      if (!options.length) {
        const empty = document.createElement('div');
        empty.className = 'classroom-empty';
        empty.textContent = '暂无错题分布，或本轮尚无错误作答。';
        elements.wrongOptionList.appendChild(empty);
        return;
      }

      options.forEach((option) => {
        const item = document.createElement('article');
        item.className = 'wrong-option-item';
        const top = document.createElement('div');
        top.className = 'wrong-option-top';
        const key = document.createElement('span');
        key.className = 'wrong-option-key';
        key.textContent = '选项 ' + String(option.key || '-');
        const count = document.createElement('span');
        count.className = 'wrong-option-count';
        count.textContent = Number(option.count || 0) + ' 人次';
        top.append(key, count);
        const names = document.createElement('p');
        names.className = 'wrong-option-names';
        names.textContent = (option.student_names || []).length
          ? (option.student_names || []).join('、')
          : '暂无学生名单';
        item.append(top, names);
        elements.wrongOptionList.appendChild(item);
      });
    }

    function sortClassroomChats(chats) {
      return (chats || []).slice().sort((a, b) =>
        Number(b.time || b.created_at_ms || 0) - Number(a.time || a.created_at_ms || 0)
      );
    }

    function renderQuestionFeed(settings) {
      const chats = sortClassroomChats(state.classroom.chats).slice(0, 50);
      const hasBaseline = state.classroom.knownChatIds.size > 0;
      clearNode(elements.classQuestionFeed);
      const allowAnonymous = !settings || settings.allow_anonymous_questions !== false;
      elements.anonymousState.textContent = allowAnonymous ? '匿名提问已开启' : '匿名提问已关闭';
      setClassroomStat(elements.classQuestionCount, chats.length, '条');

      if (!chats.length) {
        const empty = document.createElement('div');
        empty.className = 'classroom-empty';
        empty.textContent = '还没有同学提问，提问广场正在等待第一束好奇。';
        elements.classQuestionFeed.appendChild(empty);
        return;
      }

      chats.forEach((chat) => {
        const chatKey = String(chat._key || chat._id || [chat.session_id, chat.student_id, chat.time, chat.content].join('|'));
        const isNewChat = hasBaseline && !state.classroom.knownChatIds.has(chatKey);
        const item = document.createElement('article');
        item.className = 'class-question' + (chat.is_anonymous ? ' anonymous' : '') + (isNewChat ? ' just-arrived' : '');
        const avatar = document.createElement('div');
        avatar.className = 'class-question-avatar';
        avatar.textContent = chat.is_anonymous ? '?' : String(chat.student_name || '成').slice(0, 1);
        const body = document.createElement('div');
        const meta = document.createElement('div');
        meta.className = 'class-question-meta';
        const author = document.createElement('span');
        author.className = 'class-question-author';
        author.textContent = chat.student_name || '成员';
        const time = document.createElement('span');
        time.className = 'class-question-time';
        time.textContent = shortTime(chat.time);
        meta.append(author, time);
        if (chat.is_anonymous) {
          const tag = document.createElement('span');
          tag.className = 'class-question-anon';
          tag.textContent = '匿名';
          meta.appendChild(tag);
        }
        const content = document.createElement('p');
        content.className = 'class-question-content';
        content.textContent = chat.content || '';
        body.append(meta, content);
        item.append(avatar, body);
        elements.classQuestionFeed.appendChild(item);
      });
      state.classroom.knownChatIds = new Set(state.classroom.chats.map((chat) =>
        String(chat._key || chat._id || [chat.session_id, chat.student_id, chat.time, chat.content].join('|'))
      ));
      elements.classQuestionFeed.scrollTop = 0;
    }

    function mergeClassroomChats(nextChats) {
      const merged = new Map();
      [...state.classroom.chats, ...(nextChats || [])].forEach((chat) => {
        const key = String(chat._id || [chat.session_id, chat.student_id, chat.time, chat.content].join('|'));
        merged.set(key, { ...chat, _key: key });
      });
      state.classroom.chats = sortClassroomChats(Array.from(merged.values())).slice(0, 80);
      renderQuestionFeed(state.classroom.chatSettings);
    }

    async function refreshClassStats(options = {}) {
      if (!state.classroom.courseId || !state.classroom.sessionId || !classroomIsReady()) return;
      try {
        const stats = await callCourseService('get_class_stats', {
          course_id: state.classroom.courseId,
          session_id: state.classroom.sessionId
        });
        state.classroom.stats = stats;
        renderClassroomStats(stats);
        renderAnswerTable(stats);
        renderWrongOptions(stats);
        renderAnswerOptionList(stats);
        applySessionStatus(stats.session_status);
        state.classroom.connectionMode = state.classroom.answerWatchActive && state.classroom.chatWatchActive &&
          state.classroom.pollWatchActive && state.classroom.groupWatchActive
          ? 'watch'
          : 'poll';
        if (!options.silent) {
          elements.classroomBoardNote.textContent = state.classroom.connectionMode === 'watch'
            ? '答题、提问、投票与小组任务实时监听已连接；聚合统计由云函数刷新。'
            : '部分实时监听不可用，当前通过 3 秒自动同步课堂数据。';
        }
      } catch (error) {
        console.error('[星环实验大屏] 课堂统计读取失败', error);
        elements.answerTableMeta.textContent = '统计同步失败';
        elements.classroomBoardNote.textContent = '统计同步失败：' + getErrorMessage(error);
      }
    }

    async function refreshClassroomChats() {
      if (!state.classroom.courseId || !classroomIsReady()) return;
      try {
        const data = await callCourseService('get_classroom_state', {
          course_id: state.classroom.courseId
        });
        state.classroom.chatSettings = data.chat_settings || { allow_anonymous_questions: true };
        state.classroom.role = data.role || state.classroom.role || '';
        if (data.current_session) applySessionStatus(data.current_session);
        if (data.group_summary && Array.isArray(data.group_summary.items) && data.group_summary.items.length) {
          state.classroom.groupTasks = data.group_summary.items;
          renderGroupSubmissionWall();
        }
        updateTeacherControls();
        mergeClassroomChats(data.chats || []);
        renderStudentConsole(data);
      } catch (error) {
        console.warn('[星环实验大屏] 课堂提问轮询失败', error);
      }
    }

    function scheduleClassStatsRefresh() {
      clearTimeout(state.classroom.statsTimer);
      state.classroom.statsTimer = setTimeout(() => refreshClassStats({ silent: true }), 260);
    }

    function startClassroomPolling() {
      if (state.classroom.pollTimer) return;
      state.classroom.connectionMode = 'poll';
      // v2.12.1 性能优化：轮询 5 秒（原 3 秒），9 个并发请求降为可承受节奏
      state.classroom.pollTimer = setInterval(() => {
        refreshClassStats({ silent: true });
        refreshClassroomChats();
        refreshAuxiliaryCollections();
        refreshCheatEvents();
        refreshVoiceFeed();
        refreshVoiceRoster();
        refreshMossFeed();
        refreshStudentVoice();
      }, 5000);
      // MOSS 助教心跳：每 75 秒一次（服务端 60 秒节流）
      clearInterval(state.mossTickTimer);
      state.mossTickTimer = setInterval(driveMossTick, 75000);
      driveMossTick();
      elements.classroomBoardNote.textContent = '实时监听不可用，当前通过 3 秒云函数同步课堂数据。';
    }

    function stopClassroomPolling() {
      clearInterval(state.classroom.pollTimer);
      state.classroom.pollTimer = null;
    }

    function closeClassroomWatches() {
      (state.classroom.watches || []).forEach((watcher) => {
        try {
          if (typeof watcher === 'function') watcher();
          else if (watcher && typeof watcher.close === 'function') watcher.close();
          else if (watcher && typeof watcher.unsubscribe === 'function') watcher.unsubscribe();
        } catch (error) {
          console.warn('[星环实验大屏] 关闭课堂实时监听失败', error);
        }
      });
      state.classroom.watches = [];
      state.classroom.answerWatchActive = false;
      state.classroom.chatWatchActive = false;
      state.classroom.pollWatchActive = false;
      state.classroom.groupWatchActive = false;
    }

    function disconnectClassroomBoard(keepSelection = false) {
      clearInterval(state.mossTickTimer);
      if (elements.mossFeed) {
        clearNode(elements.mossFeed);
        const mEmpty = document.createElement('div');
        mEmpty.className = 'classroom-empty compact';
        mEmpty.textContent = 'MOSS 正在旁听课堂，关键时机会自动介入';
        elements.mossFeed.appendChild(mEmpty);
      }
      trtcLeave();
      document.getElementById('trtcPanel').hidden = true;
      const tb2 = document.getElementById('trtcButton');
      if (tb2) tb2.hidden = true;
      if (typeof mic !== 'undefined' && mic.on) toggleMic();
      if (elements.micToggle) elements.micToggle.disabled = true;
      if (elements.studentConsole) elements.studentConsole.hidden = true;
      sc.checked = false;
      sc.selected.clear();
      closeClassroomWatches();
      stopClassroomPolling();
      clearTimeout(state.classroom.statsTimer);
      state.classroom.statsTimer = null;
      state.classroom.stats = null;
      state.classroom.answers = [];
      state.classroom.students = [];
      state.classroom.chats = [];
      state.classroom.polls = [];
      state.classroom.groupTasks = [];
      state.classroom.role = '';
      state.classroom.sessionStatus = 'running';
      state.classroom.roundNumber = 1;
      state.classroom.diagnosis = null;
      state.classroom.previousOptionCounts = {};
      state.classroom.previousPollCounts = {};
      state.classroom.knownChatIds = new Set();
      state.classroom.connectionMode = 'idle';
      document.body.classList.remove('classroom-paused');
      if (!keepSelection) {
        state.classroom.courseId = '';
        state.classroom.sessionId = '';
      }
    }

    // SCF 架构：无实时推送，统一 3 秒轮询（与小程序课堂页同策略）
    async function connectClassroomWatch() { return false; }

    async function connectClassroomBoard(sessionId, courseId) {
      if (!sessionId || !courseId || !classroomIsReady()) return;
      disconnectClassroomBoard(true);
      state.classroom.sessionId = sessionId;
      state.classroom.courseId = courseId;
      state.classroom.diagnosis = null;
      elements.classroomRefreshButton.disabled = false;
      elements.micToggle.disabled = false;
      const tb = document.getElementById('trtcButton');
      if (tb) tb.hidden = false;
      elements.answerTableEmpty.hidden = false;
      elements.answerTableWrap.hidden = true;
      elements.answerTableEmpty.textContent = '正在连接课堂实时数据...';
      elements.answerTableMeta.textContent = '连接中';
      elements.classroomBoardNote.textContent = '正在建立答题、提问、投票与小组任务实时监听...';
      elements.aiDiagnosisCard.hidden = true;

      const answersOk = false, chatsOk = false, pollsOk = false, groupsOk = false;
      startClassroomPolling();
      await Promise.allSettled([
        refreshClassStats(),
        refreshClassroomChats(),
        refreshAuxiliaryCollections()
      ]);
      elements.classroomBoardNote.textContent = answersOk && chatsOk && pollsOk && groupsOk
        ? '四路实时监听已连接；暂停、统计与 AI 诊断均由当前教师身份驱动。'
        : '部分实时监听不可用，已自动使用轮询同步。';
      console.log('[星环实验大屏] 课堂面板已连接', {
        courseId,
        sessionId,
        answersRealtime: answersOk,
        chatsRealtime: chatsOk,
        pollsRealtime: pollsOk,
        groupsRealtime: groupsOk
      });
    }

    async function loadClassroomCourses() {
      if (!classroomIsReady()) {
        setClassroomUnavailable('登录天文协会成员账号后，可选择进行中的课堂并查看实时数据。');
        return;
      }
      elements.classroomCourseSelect.disabled = true;
      elements.classroomRefreshButton.disabled = true;
      setClassroomUnavailable('正在读取可参与的进行中课堂...');
      try {
        const data = await callCourseService('list_courses');
        const liveCourses = (data.courses || []).filter((course) => course.current_session_id);
        state.classroom.courses = liveCourses;
        clearNode(elements.classroomCourseSelect);
        if (!liveCourses.length) {
          const option = document.createElement('option');
          option.value = '';
          option.textContent = '当前没有进行中的课堂';
          elements.classroomCourseSelect.appendChild(option);
          setClassroomUnavailable('当前没有进行中的课堂。教师开启课次后，这里会自动出现。');
          elements.classroomBoardNote.textContent = '等待课程开启后重新登录或点击同步。';
          return;
        }

        liveCourses.forEach((course) => {
          const option = document.createElement('option');
          option.value = course.current_session_id;
          option.dataset.courseId = course._id;
          option.textContent = course.name + (course.teacher_name ? ' · ' + course.teacher_name : '');
          elements.classroomCourseSelect.appendChild(option);
        });

        const preferred = liveCourses.find((course) =>
          String(course.current_session_id) === String(state.classroom.sessionId)
        ) || liveCourses[0];
        elements.classroomCourseSelect.value = preferred.current_session_id;
        elements.classroomCourseSelect.disabled = false;
        await connectClassroomBoard(preferred.current_session_id, preferred._id);
      } catch (error) {
        console.error('[星环实验大屏] 课程读取失败', error);
        setClassroomUnavailable('课程读取失败：' + getErrorMessage(error), true);
        elements.classroomBoardNote.textContent = '请确认已登录天文协会成员账号，并且 courseService 已部署最新版本。';
      }
    }

    function handleClassroomCourseChange() {
      const option = elements.classroomCourseSelect.selectedOptions[0];
      if (!option || !option.value || !option.dataset.courseId) return;
      connectClassroomBoard(option.value, option.dataset.courseId);
    }

    async function refreshClassroomBoard() {
      if (!state.classroom.courseId) {
        await loadClassroomCourses();
        return;
      }
      elements.classroomRefreshButton.disabled = true;
      try {
        await Promise.all([
          refreshClassStats(),
          refreshClassroomChats(),
          refreshAuxiliaryCollections()
        ]);
        showToast('课堂数据已同步');
      } finally {
        elements.classroomRefreshButton.disabled = false;
      }
    }

    async function initializeChart() {
      await ensureECharts();
      state.chart = window.echarts.init(elements.experimentChart, null, { renderer: 'canvas' });
      state.chart.setOption(buildChartOption(), true);
      const resize = () => state.chart && state.chart.resize();
      window.addEventListener('resize', resize);
      if (window.ResizeObserver) {
        new ResizeObserver(resize).observe(elements.experimentChart);
      }
      console.log('[星环实验大屏] ECharts 初始化完成');
    }

    async function initializeCloudbase() {
      // v2(SCF 架构)：无需浏览器直连 CloudBase，全部经 SCF 网关
      console.log('[星环教学中枢] SCF 网关模式', SCF_API);
      hideHubNav();
      setAnonymous();
      setConnection('online', 'SCF 网关已连接');
      logStep('网关就绪', '匿名可浏览公开数据');
      await loadRecords();
    }

    function bindEvents() {
      bindPpt();
      document.querySelectorAll('[data-org]').forEach((button) => {
        button.addEventListener('click', () => activateOrg(button.dataset.org));
      });
      elements.headerLoginButton.addEventListener('click', openLogin);
      elements.sessionLoginButton.addEventListener('click', openLogin);
      elements.loginForm.addEventListener('submit', submitLogin);
      const mossCloseBtn = document.getElementById('mossClose');
      if (mossCloseBtn) mossCloseBtn.addEventListener('click', hideMossAlert);
      elements.refreshButton.addEventListener('click', () => loadRecords({ toast: true }));
      elements.addRecordButton.addEventListener('click', addTestRecord);
      elements.classroomCourseSelect.addEventListener('change', handleClassroomCourseChange);
      elements.classroomRefreshButton.addEventListener('click', refreshClassroomBoard);
      elements.pauseAnswersButton.addEventListener('click', () => runTeacherControl('pause'));
      elements.resumeAnswersButton.addEventListener('click', () => runTeacherControl('resume'));
      elements.resetStageButton.addEventListener('click', () => runTeacherControl('reset'));
      elements.generateDiagnosisButton.addEventListener('click', generateAIDiagnosis);
      elements.micToggle.addEventListener('click', toggleMic);
      const gateBtn = document.getElementById('gateGoConsole');
      if (gateBtn) gateBtn.addEventListener('click', () => switchPage('console'));
      // v2.16.4 新建系列：全局健壮绑定（任何状态都可用，失败必弹原因）
      const caSeriesAddBtn = document.getElementById('caSeriesAdd');
      if (caSeriesAddBtn) caSeriesAddBtn.onclick = async () => {
        try {
          const nameEl = document.getElementById('caSeriesName');
          const name = (nameEl.value || '').trim();
          if (!name) { showToast('请输入系列名称', true); return; }
          const r = await caApi('/lecture/series/save', { title: name });
          console.warn('[ca] 新建系列返回', JSON.stringify(r));
          if (r && r.code === 0) {
            nameEl.value = '';
            caState.seriesId = r.data._id;
            await caLoadSeries();
            showToast('系列已创建');
          } else {
            showToast('创建失败：' + ((r && r.message) || '未知错误'), true);
          }
        } catch (e) {
          console.error('[ca] 新建系列异常', e);
          showToast('创建异常：' + (e.message || e), true);
        }
      };
      document.querySelectorAll('.wb-tab').forEach(t => t.onclick = () => {
        document.querySelectorAll('.wb-tab').forEach(x => x.classList.toggle('active', x === t));
        document.getElementById('wbMembers').hidden = t.dataset.wbt !== 'members';
        document.getElementById('wbRes').hidden = t.dataset.wbt !== 'res';
        if (t.dataset.wbt === 'res') wbLoadRes();
        document.getElementById('wbOrg').hidden = t.dataset.wbt !== 'orgapp';
        if (t.dataset.wbt === 'orgapp') wbLoadOrgApps();
        /* v2.46 动态页签面板互斥 */
        var dyn = { wbMe: 1, wbPlatform: 1, wbOpLogs: 1 };
        Object.keys(dyn).forEach(function (id) { var el = document.getElementById(id); if (el) el.hidden = true; });
      });
      const wbSearchEl = document.getElementById('wbSearch');
      if (wbSearchEl) wbSearchEl.oninput = wbRenderMembers;
      // v2.22 顶栏中枢入口
      document.querySelectorAll('.nav-hub-item').forEach(b => {
        b.addEventListener('click', () => enterHub(b.dataset.hub));
      });
      const navMon = document.getElementById('navMonitor');
      if (navMon) navMon.addEventListener('click', () => enterHub('classroom'));
      // v2.28 导航跳转钉死
      const navHome = document.getElementById('navHome');
      if (navHome) navHome.addEventListener('click', () => {
        showLanding();
        const sp3 = document.getElementById('shopPage');
        if (sp3) sp3.hidden = true;
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      const navPartners = document.getElementById('navPartners');
      if (navPartners) navPartners.addEventListener('click', () => { openPartners(); });
      const navShop = document.getElementById('navShop');
      if (navShop) navShop.addEventListener('click', () => enterShop());
      // 首页锚点（星环/入驻星系等）回到首页视图
      document.querySelectorAll('.top-nav-link:not(.nav-hub-item):not(#navShop):not(#navHome):not(#navPartners), .top-nav-anchor').forEach(b => {
        b.addEventListener('click', () => {
          if (hubMode) showLanding();
          const sp2 = document.getElementById('shopPage');
          if (sp2) sp2.hidden = true;
          if (!hubMode) document.querySelectorAll('.landing-only').forEach(el => { el.hidden = false; });
        });
      });
      const ljo = document.getElementById('lectureJoinOnline');
      if (ljo) ljo.addEventListener('click', () => ocJoin('online'));
      const ljc = document.getElementById('lectureJoinCheckin');
      if (ljc) ljc.addEventListener('click', () => ocJoin('checkin'));
      const ocCloseBtn = document.getElementById('ocClose');
      if (ocCloseBtn) ocCloseBtn.addEventListener('click', ocClose);
      const ocAskBtn = document.getElementById('ocAskBtn');
      if (ocAskBtn) ocAskBtn.addEventListener('click', ocAsk);
      const lsCloseBtn = document.getElementById('lsClose');
      if (lsCloseBtn) lsCloseBtn.addEventListener('click', lsClose);
      const trtcBtn = document.getElementById('trtcButton');
      if (trtcBtn) trtcBtn.addEventListener('click', () => {
        const panel = document.getElementById('trtcPanel');
        panel.hidden = !panel.hidden;
        if (!panel.hidden) trtcUpdatePanel();
      });
      const trtcJoinBtn = document.getElementById('trtcJoin');
      if (trtcJoinBtn) trtcJoinBtn.addEventListener('click', trtcJoin);
      const trtcLeaveBtn = document.getElementById('trtcLeave');
      if (trtcLeaveBtn) trtcLeaveBtn.addEventListener('click', trtcLeave);
      const trtcMuteBtn = document.getElementById('trtcMute');
      if (trtcMuteBtn) trtcMuteBtn.addEventListener('click', trtcToggleMute);
      const trtcCamBtn = document.getElementById('trtcCam');
      if (trtcCamBtn) trtcCamBtn.addEventListener('click', trtcToggleCamera);
      if (elements.mossVoiceToggle) {
        syncMossVoiceBtn();
        elements.mossVoiceToggle.addEventListener('click', () => {
          mossVoiceState.muted = !mossVoiceState.muted;
          localStorage.setItem('moss_voice_muted', mossVoiceState.muted ? '1' : '0');
          syncMossVoiceBtn();
          if (!mossVoiceState.muted) mossSpeak('MOSS 语音输出已恢复。');
        });
      }
      if (elements.voiceEnrollButton) elements.voiceEnrollButton.addEventListener('click', openVoiceEnroll);
      // v2.12 页面标签切换 + 学习资源提取码复制
      document.querySelectorAll('.page-tab').forEach((b) => {
        b.addEventListener('click', () => switchPage(b.dataset.tab));
      });
      document.querySelectorAll('.res-code').forEach((btn) => {
        btn.addEventListener('click', () => {
          const code = btn.dataset.code || '';
          if (navigator.clipboard) {
            navigator.clipboard.writeText(code).then(() => showToast('提取码 ' + code + ' 已复制'));
          } else {
            showToast('提取码：' + code);
          }
        });
      });
      // v2.12.1 性能优化：标签页切后台暂停轮询，回来自动恢复
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          stopClassroomPolling();
        } else if (state.classroom.sessionId && classroomIsReady()) {
          startClassroomPolling();
        }
      });
      // v2.11 学生操作台事件
      if (elements.scQuizSubmit) elements.scQuizSubmit.addEventListener('click', scSubmitQuiz);
      if (elements.scCheckinButton) elements.scCheckinButton.addEventListener('click', scSubmitCheckin);
      if (elements.scChatSend) elements.scChatSend.addEventListener('click', scSendChat);
      if (elements.scPostSend) elements.scPostSend.addEventListener('click', scSendPost);
      if (elements.scTaskSubmit) elements.scTaskSubmit.addEventListener('click', scSubmitTask);
      if (elements.scKindQ) elements.scKindQ.addEventListener('click', () => {
        sc.kind = 'question';
        elements.scKindQ.classList.add('sv-active'); elements.scKindO.classList.remove('sv-active');
      });
      if (elements.scKindO) elements.scKindO.addEventListener('click', () => {
        sc.kind = 'opinion';
        elements.scKindO.classList.add('sv-active'); elements.scKindQ.classList.remove('sv-active');
      });
      if (elements.scChatInput) elements.scChatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') scSendChat(); });
      if (elements.scPostInput) elements.scPostInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') scSendPost(); });
      elements.veRecord.addEventListener('click', enrollRecord);
      elements.veCancel.addEventListener('click', closeVoiceEnroll);
      if (elements.mossSend) elements.mossSend.addEventListener('click', sendMossChat);
      if (elements.svTabQ) elements.svTabQ.addEventListener('click', () => {
        sv.kind = 'question';
        elements.svTabQ.classList.add('sv-active'); elements.svTabO.classList.remove('sv-active');
        if (state.svItems) renderStudentVoice(state.svItems);
      });
      if (elements.svTabO) elements.svTabO.addEventListener('click', () => {
        sv.kind = 'opinion';
        elements.svTabO.classList.add('sv-active'); elements.svTabQ.classList.remove('sv-active');
        if (state.svItems) renderStudentVoice(state.svItems);
      });
      if (elements.mossInput) elements.mossInput.addEventListener('confirm', (e) => { if (e.detail.value) sendMossChat(); });
      // v1.5 门禁：点击遮罩与 Esc 不再允许跳过登录
    }

    async function boot() {
      bindElements();
      bindEvents();
      activateOrg(state.activeOrg);
      updateClock();
      setInterval(updateClock, 1000);
      renderRecordList();
      renderStats();
      setClassroomUnavailable('登录天文协会成员账号后，可选择进行中的课堂并查看实时数据。');
      updateTeacherControls();
      renderAnswerOptionList(null);
      renderPollDistribution();
      renderGroupSubmissionWall();
      logStep('页面初始化', '正在加载依赖');
      try {
        await initializeChart();
        await initializeCloudbase();
      } catch (error) {
        console.error('[星环教学中枢] 初始化失败', error);
        setConnection('error', '初始化失败');
        elements.chartLoading.classList.add('hidden');
        elements.consoleMessage.textContent = '初始化失败 · ' + getErrorMessage(error);
        showToast('初始化失败：' + getErrorMessage(error), true);
      }
      // v1.4 默认进入登录页；v2.12.6 若从协会官网 SSO 跳转则跳过
      // v2.34 链接带账密自动登录（?username=&password=，登录后抹掉地址栏）
      const au = new URLSearchParams(location.search);
      if (au.get('username') && au.get('password')) {
        try {
          const lp = await apiFetch('/login', { method: 'POST', body: { username: au.get('username'), password: au.get('password') } });
          if (lp && lp.code === 0 && lp.data && lp.data.token) {
            localStorage.setItem('hub_token', lp.data.token);
            setLoggedIn({ ...(lp.data.user || {}), token: lp.data.token });
            history.replaceState(null, '', location.pathname);
            setTimeout(() => enterHub('classroom'), 300);
          } else {
            showToast((lp && lp.message) || '自动登录失败，请手动登录', true);
            openLogin();
          }
        } catch (e) { openLogin(); }
        return;
      }
      const mqU = new URLSearchParams(location.search);
      if ((mqU.get('q') || mqU.get('lec')) && window.innerWidth < 768 && 'ontouchstart' in window) {
        mmBoot(); // v2.31 手机扫码 → 极简模式
      } else if (!(await trySsoLogin())) {
        // v2.32 桌面端：本地令牌静默恢复，失败再弹登录
        let restored = false;
        const savedTok = localStorage.getItem('hub_token');
        if (savedTok) {
          try {
            const meR = await apiFetch('/me', { method: 'POST', body: { token: savedTok } });
            if (meR && meR.code === 0) {
              state.user = { ...meR.data, token: savedTok };
              setLoggedIn(state.user);
              restored = true;
            } else { localStorage.removeItem('hub_token'); }
          } catch (e) {}
        }
        if (!restored) openLogin();
        mqBootFromUrl();
      }
    }

    boot();

    /* ============================================================
       v2.43 公开注册：注册即可登录，数据入成员库
       ============================================================ */
    function openRegister() {
      if (document.getElementById('xhRegModal')) { document.getElementById('xhRegModal').classList.add('open'); return; }
      var modal = document.createElement('div');
      modal.className = 'modal'; modal.id = 'xhRegModal';
      modal.innerHTML = [
        '<div class="ui-card" style="width:min(430px,92vw)">',
        '  <h3 style="margin:0 0 4px;font-size:18px;letter-spacing:.1em;color:#eaf2fb">注册星环账号</h3>',
        '  <p style="margin:0;color:#5c7194;font-size:12px">注册成功后自动登录</p>',
        '  <div style="display:grid;gap:12px;margin:16px 0" id="xhRegFields">',
        '    <div class="field"><label>姓名</label><input id="xrName" maxlength="40" placeholder="你的称呼" /></div>',
        '    <div class="field"><label>账号（拼音小写全拼）</label><input id="xrUser" maxlength="40" autocomplete="username" placeholder="账号" /></div>',
        '    <div class="field"><label>密码（至少 4 位）</label><input id="xrPwd" type="password" maxlength="64" autocomplete="new-password" placeholder="密码" /></div>',
        '    <div class="field"><label>确认密码</label><input id="xrPwd2" type="password" maxlength="64" autocomplete="new-password" placeholder="再输一遍密码" /></div>',
        '  </div>',
        '  <div class="modal-msg" id="xrMsg" style="min-height:18px;color:#f0a8a8;font-size:12px"></div>',
        '  <div style="display:flex;gap:10px;justify-content:flex-end">',
        '    <button class="btn" id="xrCancel" type="button" style="min-height:36px;font-size:13px">取 消</button>',
        '    <button class="btn btn-gold" id="xrOk" type="button" style="min-height:36px;font-size:13px">注册并登录</button>',
        '  </div>',
        '</div>'
      ].join('\n');
      document.body.appendChild(modal);
      document.getElementById('xrCancel').onclick = function () { modal.classList.remove('open'); };
      modal.addEventListener('click', function (e) { if (e.target === modal) modal.classList.remove('open'); });
      document.getElementById('xrOk').onclick = doRegister;
      ['xrUser', 'xrPwd', 'xrPwd2'].forEach(function (id) {
        document.getElementById(id).addEventListener('keydown', function (e) { if (e.key === 'Enter') doRegister(); });
      });
      modal.classList.add('open');
    }
    async function doRegister() {
      var msg = document.getElementById('xrMsg');
      msg.textContent = ''; msg.style.color = '#f0a8a8';
      var name = document.getElementById('xrName').value.trim();
      var username = document.getElementById('xrUser').value.trim();
      var password = document.getElementById('xrPwd').value;
      var password2 = document.getElementById('xrPwd2').value;
      var org = '';
      if (!username || !password) { msg.textContent = '账号和密码必填'; return; }
      if (password.length < 6) { msg.textContent = '密码至少 6 位'; return; }
      if (password !== password2) { msg.textContent = '两次密码不一致'; return; }
      var btn = document.getElementById('xrOk');
      btn.disabled = true; btn.textContent = '注册中…';
      try {
        var r = await apiFetch('/register', { method: 'POST', body: { name: name, username: username, password: password, org: org } });
        if (r && r.code === 0 && r.data && r.data.token) {
          localStorage.setItem('hub_token', r.data.token);
          setLoggedIn({ ...(r.data.user || {}), token: r.data.token });
          document.getElementById('xhRegModal').classList.remove('open');
          showToast('注册成功，已自动登录（游客身份，可在工作台完善资料）');
        } else {
          msg.textContent = (r && r.message) || '注册失败，请稍后重试';
        }
      } catch (e) {
        msg.textContent = '网络异常，请重试';
      } finally {
        btn.disabled = false; btn.textContent = '注册并登录';
      }
    }
    window.XHNav = Object.assign(window.XHNav || {}, { openRegister: openRegister });

    /* 入驻申请转交后端（原前端演示改为真实提交） */
    window.XHOrgApply = async function (entry) {
      try { await apiFetch('/org/apply', { method: 'POST', body: entry }); } catch (e) {}
    };

    /* ============================================================
       v2.43 平台管理（仅 super_admin 可见；界面不出现任何人名）
       分级：平台任命各社团主管理员 → 社团主管理员任命本社主管
       ============================================================ */
    async function wbLoadPlatform() {
      var box = document.getElementById('wbPlatform');
      if (!box) return;
      var r = await wbCall('web_platform_members');
      if (!r || r.code !== 0) {
        box.querySelector('#wbPfTbody').innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--faint)">读取失败：' + ((r && r.message) || '无权限') + '</td></tr>';
        return;
      }
      var rows = r.data || [];
      document.getElementById('wbPfCount').textContent = rows.length + ' 个注册用户';
      document.getElementById('wbPfTbody').innerHTML = rows.map(function (m) {
        var isPlatform = m.admin_scope === 'platform';
        var roleName = isPlatform ? '星环终端管理员' : m.role === 'admin' ? '社团主管理员' : (m.subadmin ? '社团主管' : '成员');
        var btns = '<button class="ap-mini" onclick="wbPfReset(\'' + m._id + '\',\'' + (m.name || m.username) + '\')">改密</button>' +
          (isPlatform
            ? '<button class="ap-mini" onclick="wbPfRevoke(\'' + m._id + '\')">撤销平台管理员</button>'
            : '<button class="ap-mini" onclick="wbPfMakePlatform(\'' + m._id + '\')">设为平台管理员</button>') +
          (m.role === 'admin'
            ? '<button class="ap-mini" onclick="wbPfRevoke(\'' + m._id + '\')">撤销主管理员</button>'
            : '<button class="ap-mini" onclick="wbPfMakeAdmin(\'' + m._id + '\',\'' + (m.org || 'astro') + '\')">设为主管理员</button>') +
          '<button class="ap-mini danger" onclick="wbPfDel(\'' + m._id + '\',\'' + (m.name || m.username) + '\')">删除</button>';
        return '<tr><td>' + (m.name || '-') + '</td><td>' + (m.username || '-') + '</td><td>' + (m.org || '-') + '</td><td>' + roleName + '</td><td><div class="ap-rowbtns">' + btns + '</div></td></tr>';
      }).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--faint)">暂无用户</td></tr>';
    }
    window.wbPfMakeAdmin = async function (id, org) {
      var r = await wbCall('web_platform_set_role', { member_id: id, role: 'admin', org: org });
      showToast((r && r.code === 0) ? '已任命为社团主管理员' : ('失败：' + ((r && r.message) || '')), !(r && r.code === 0));
      wbLoadPlatform();
    };
    window.wbPfMakePlatform = async function (id) {
      var r = await wbCall('web_platform_set_role', { member_id: id, role: 'platform_admin' });
      showToast((r && r.code === 0) ? '已任命为星环终端管理员' : ('失败：' + ((r && r.message) || '')), !(r && r.code === 0));
      wbLoadPlatform();
    };
    window.wbPfRevoke = async function (id) {
      var r = await wbCall('web_platform_set_role', { member_id: id, role: 'member' });
      showToast((r && r.code === 0) ? '已撤销管理员' : ('失败：' + ((r && r.message) || '')), !(r && r.code === 0));
      wbLoadPlatform();
    };
    window.wbPfReset = async function (id, name) { if (window.wbResetPwd) return window.wbResetPwd(id, name); };
    window.wbPfDel = async function (id, name) { if (window.wbDelMember) return window.wbDelMember(id, name); };

    /* v2.46 资料表单读写 */
    function fillProfileForm() {
      var u = state.user || {};
      document.querySelectorAll('[data-pf]').forEach(function (input) {
        input.value = u[input.dataset.pf] || '';
      });
    }
    async function saveProfile() {
      var msg = document.getElementById('wbMeMsg');
      var body = {};
      document.querySelectorAll('[data-pf]').forEach(function (input) {
        body[input.dataset.pf] = input.value.trim();
      });
      if (!body.school || !body.campus || !body.major) {
        msg.style.color = '#f0a8a8'; msg.textContent = '学校、校区、专业为必填';
        return;
      }
      var btn = document.getElementById('wbMeSave');
      btn.disabled = true; btn.textContent = '保存中…';
      try {
        var r = await wbCall('web_update_profile', body);
        if (r && r.code === 0) {
          state.user = Object.assign({}, state.user, r.data || {});
          msg.style.color = '#86b5a0'; msg.textContent = '已保存';
          showToast('资料已更新');
        } else {
          msg.style.color = '#f0a8a8'; msg.textContent = (r && r.message) || '保存失败';
        }
      } catch (e) {
        msg.style.color = '#f0a8a8'; msg.textContent = '网络异常';
      } finally {
        btn.disabled = false; btn.textContent = '保存资料';
      }
    }

    /* v2.46 操作日志公示：读取并渲染（兼容两种日志字段） */
    window.wbLoadOpLogs = async function () {
      var tbody = document.getElementById('wbLogTbody');
      if (!tbody) return;
      var r = await wbCall('web_am_logs', {});
      if (!r || r.code !== 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--faint)">读取失败：' + ((r && r.message) || '') + '</td></tr>';
        return;
      }
      var rows = (r.data || []).slice(0, 100);
      document.getElementById('wbLogCount').textContent = rows.length + ' 条';
      tbody.innerHTML = rows.map(function (it) {
        var t = it.at || it.time || 0;
        var time = t ? new Date(Number(t)).toLocaleString('zh-CN', { hour12: false }) : '';
        var who = it.actor_name || it.operator_name || '-';
        var target = it.target_name || '-';
        var detail = it.detail || '';
        if (!detail && (it.old_value !== undefined || it.new_value !== undefined)) {
          detail = String(it.old_value || '') + ' → ' + String(it.new_value || '');
        }
        return '<tr><td style="white-space:nowrap">' + time + '</td><td>' + who + '</td><td>' + (it.action || '-') + '</td><td>' + target + '</td><td>' + (detail || '-') + '</td></tr>';
      }).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--faint)">暂无操作记录</td></tr>';
    };

    /* v2.46 公开资料库（入驻星系页，免登录可读公开档资料） */
    window.loadPublicRes = async function () {
      var box = document.getElementById('pubResList');
      if (!box || box.dataset.loaded) return;
      box.dataset.loaded = '1';
      try {
        var resp = await fetch(SCF_API + '/res/list', { method: 'GET' });
        var payload = await resp.json();
        var list = (payload && payload.data) || [];
        var links = list.filter(function (d) { return d.visibility === 'public' && d.kind === 'link' && d.url; });
        box.innerHTML = links.map(function (d) {
          return '<a class="pub-res-item" href="' + d.url + '" target="_blank" rel="noopener"><b>' + d.title + '</b><span>' + (d.by || '') + '</span></a>';
        }).join('') || '<p class="pub-res-empty">暂无公开资料</p>';
      } catch (e) {
        box.innerHTML = '<p class="pub-res-empty">公开资料载入失败</p>';
      }
    };

    /* v2.53 视频直传：网关签名 → 浏览器 PUT 到 COS（不过服务器、大小不限）→ 自动登记清单 */
    function uploadVideoFlow() {
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = 'video/mp4,video/webm,video/*';
      input.onchange = async function () {
        var file = input.files[0];
        if (!file) return;
        var btn = document.getElementById('xhVideoUp');
        var title = (file.name.replace(/\.[^.]+$/, '') || '未命名视频').slice(0, 60);
        try {
          btn.disabled = true; btn.textContent = '获取上传凭证…';
          var tk = localStorage.getItem('hub_token') || '';
          var sg = await fetch(SCF_API + '/video-sign', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Member-Token': tk }, body: JSON.stringify({ filename: file.name }) });
          var sgj = await sg.json();
          if (!sgj || sgj.code !== 0) { showToast((sgj && sgj.message) || '签名失败', true); btn.disabled = false; btn.textContent = '上传视频'; return; }
          btn.textContent = '上传中 0%';
          await new Promise(function (res, rej) {
            var xhr = new XMLHttpRequest();
            xhr.open('PUT', sgj.data.url, true);
            xhr.setRequestHeader('Authorization', sgj.data.auth);
            xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');
            xhr.upload.onprogress = function (e) {
              if (e.lengthComputable) btn.textContent = '上传中 ' + Math.round(e.loaded / e.total * 100) + '%';
            };
            xhr.onload = function () { (xhr.status === 200) ? res() : rej(new Error('COS ' + xhr.status)); };
            xhr.onerror = function () { rej(new Error('网络错误')); };
            xhr.send(file);
          });
          btn.textContent = '登记清单…';
          var rg = await fetch(SCF_API + '/video-register', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Member-Token': tk }, body: JSON.stringify({ key: sgj.data.key, title: title }) });
          var rgj = await rg.json();
          if (!rgj || rgj.code !== 0) { showToast((rgj && rgj.message) || '登记失败', true); }
          else { showToast('上传完成，已上架'); loadVideos(); }
        } catch (e) {
          showToast('上传失败：' + (e.message || e), true);
        } finally {
          btn.disabled = false; btn.textContent = '上传视频';
        }
      };
      input.click();
    }
