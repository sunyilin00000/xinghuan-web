
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
      nankai_astro: { label: '南开天协', school: '南开大学' }
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
        elements.consoleMessage.textContent = '数据库读取失败，请检查集合存在性与匿名读权限 · ' + getErrorMessage(error);
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
        setLoggedIn({ ...(data.user || { username }), token: data.token || (data.user && data.user.token) });
        setConnection('online', '已连接');
        showToast('登录成功');
        await Promise.allSettled([loadRecords(), loadClassroomCourses()]);
      } catch (error) {
        console.error('[星环实验大屏] 网页登录失败', error);
        elements.loginError.textContent = getErrorMessage(error);
        elements.loginError.classList.add('show');
        setConnection('error', '登录失败');
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
    function canSeeTeacherBackend() {
      const u = state.user || {};
      const isAdminUser = u.super_admin === true || u.role === 'admin' || u.course_teacher === true;
      return isAdminUser && state.classroom.role === 'teacher';
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
      if (command === 'reset' && !window.confirm('重置当前环节会清空本轮作答统计，并进入下一轮。确定继续吗？')) return;
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
        elements.aiDiagnosisContent.innerHTML = '<p>诊断生成失败，请检查教师权限与 aiService 部署状态。</p>';
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
      if (elements.resourcesPage) elements.resourcesPage.hidden = tab !== 'resources';
      if (elements.consolePage) {
        elements.consolePage.hidden = tab !== 'console';
        if (tab === 'console') {
          if (canSeeTeacherBackend()) {
            elements.consoleDenied.hidden = true;
            elements.consoleSlot.hidden = false;
            moveTeacherBar(elements.consoleSlot);
            elements.teacherControlBar.hidden = false;
          } else {
            elements.consoleSlot.hidden = true;
            elements.consoleDenied.hidden = false;
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
        : '部分集合受实时监听权限限制，已自动使用 3 秒轮询兜底。';
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
      // v1.4 默认进入登录页：任何身份都先登录，取消可回匿名看板
      openLogin();
    }

    boot();
  