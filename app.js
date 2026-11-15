
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
        'aiDiagnosisCard', 'aiDiagnosisContent', 'aiDiagnosisMeta'
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
    }

    function setAnonymous() {
      disconnectClassroomBoard();
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
      setClassroomUnavailable('登录天文协会成员账号后，可选择进行中的课堂并查看实时数据。');
    }

    function openLogin() {
      if (state.mode === 'custom') {
        showToast('当前已登录为 ' + (state.user.name || state.user.username || '成员'));
        return;
      }
      elements.loginError.classList.remove('show');
      elements.loginError.textContent = '';
      elements.loginModal.classList.add('open');
      elements.loginModal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      setTimeout(() => elements.username.focus(), 80);
    }

    function closeLogin() {
      elements.loginModal.classList.remove('open');
      elements.loginModal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      elements.password.value = '';
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
      elements.submitLoginButton.textContent = '正在验证';
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
        elements.submitLoginButton.textContent = '登录';
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

    function updateTeacherControls() {
      const isTeacher = state.classroom.role === 'teacher';
      if (elements.teacherControlBar) elements.teacherControlBar.hidden = !isTeacher;
      if (elements.generateDiagnosisButton) elements.generateDiagnosisButton.hidden = !isTeacher;
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
        elements.generateDiagnosisButton.textContent = '🤖 生成 AI 诊断';
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
      state.classroom.pollTimer = setInterval(() => {
        refreshClassStats({ silent: true });
        refreshClassroomChats();
        refreshAuxiliaryCollections();
      }, 3000);
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
      document.querySelectorAll('[data-org]').forEach((button) => {
        button.addEventListener('click', () => activateOrg(button.dataset.org));
      });
      elements.headerLoginButton.addEventListener('click', openLogin);
      elements.sessionLoginButton.addEventListener('click', openLogin);
      elements.closeLoginButton.addEventListener('click', closeLogin);
      elements.cancelLoginButton.addEventListener('click', closeLogin);
      elements.loginForm.addEventListener('submit', submitLogin);
      elements.refreshButton.addEventListener('click', () => loadRecords({ toast: true }));
      elements.addRecordButton.addEventListener('click', addTestRecord);
      elements.classroomCourseSelect.addEventListener('change', handleClassroomCourseChange);
      elements.classroomRefreshButton.addEventListener('click', refreshClassroomBoard);
      elements.pauseAnswersButton.addEventListener('click', () => runTeacherControl('pause'));
      elements.resumeAnswersButton.addEventListener('click', () => runTeacherControl('resume'));
      elements.resetStageButton.addEventListener('click', () => runTeacherControl('reset'));
      elements.generateDiagnosisButton.addEventListener('click', generateAIDiagnosis);
      elements.loginModal.addEventListener('click', (event) => {
        if (event.target === elements.loginModal) closeLogin();
      });
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && elements.loginModal.classList.contains('open')) closeLogin();
      });
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
        console.error('[星环实验大屏] 初始化失败', error);
        setConnection('error', '初始化失败');
        elements.chartLoading.classList.add('hidden');
        elements.consoleMessage.textContent = '初始化失败 · ' + getErrorMessage(error);
        showToast('初始化失败：' + getErrorMessage(error), true);
      }
    }

    boot();
  