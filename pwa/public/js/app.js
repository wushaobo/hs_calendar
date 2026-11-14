// 应用入口：状态、渲染、交互、Service Worker 注册。

import {
  addMonths,
  formatDisplayDate,
  formatMonthTitle,
  formatWeekdayCn,
  isMonthKey,
  isWeekend,
  monthGrid,
  monthKeyOf,
  monthKind,
  nowIso,
  todayInShanghai,
} from './dates.js';
import {
  buildCalendarIndex,
  computeMonthStats,
  isWorkday,
  validateMarkInput,
} from './stats.js';
import {
  deleteRecord,
  getAllRecords,
  putRecord,
  readStoredCalendar,
  seedCalendar,
} from './db.js';

const els = {
  monthTitle: document.getElementById('monthTitle'),
  dataWarning: document.getElementById('dataWarning'),
  prevMonth: document.getElementById('prevMonth'),
  nextMonth: document.getElementById('nextMonth'),
  statsLine1: document.getElementById('statsLine1'),
  statsLine2: document.getElementById('statsLine2'),
  statsLine3: document.getElementById('statsLine3'),
  retryBtn: document.getElementById('retryBtn'),
  invalidNotice: document.getElementById('invalidNotice'),
  calendar: document.getElementById('calendar'),
  sheetBackdrop: document.getElementById('sheetBackdrop'),
  actionSheet: document.getElementById('actionSheet'),
  sheetTitle: document.getElementById('sheetTitle'),
  sheetSubtitle: document.getElementById('sheetSubtitle'),
  actionButtons: Array.from(document.querySelectorAll('#actionSheet [data-action]')),
  invalidSheet: document.getElementById('invalidSheet'),
  invalidList: document.getElementById('invalidList'),
  invalidClose: document.getElementById('invalidClose'),
  toast: document.getElementById('toast'),
};

const state = {
  today: todayInShanghai(),
  viewMonth: null,
  cal: null,
  records: new Map(),
  stats: null,
  invalidRecords: [],
  selectedDate: null,
  bootState: 'loading',
  fatalMessage: '',
};

let booting = false;
let timersStarted = false;
let swStarted = false;
let toastTimer = null;
let suppressClickUntil = 0;
let touchStart = null;

function isValidStatus(status) {
  return status === 'on_site' || status === 'leave';
}

function statusText(status) {
  if (status === 'on_site') return '到岗';
  if (status === 'leave') return '请假';
  return String(status ?? '未知');
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.hidden = false;
  if (toastTimer) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    els.toast.hidden = true;
    toastTimer = null;
  }, 2000);
}

function resetStats() {
  els.statsLine1.textContent = '';
  els.statsLine1.title = '';
  els.statsLine2.textContent = '';
  els.statsLine2.className = 'stats-line stats-line-2';
  els.statsLine2.hidden = true;
  els.statsLine3.textContent = '';
  els.statsLine3.className = 'stats-line stats-line-3';
  els.statsLine3.hidden = true;
  els.retryBtn.hidden = true;
}

function renderHeader() {
  if (state.bootState === 'fatal') {
    els.monthTitle.textContent = state.viewMonth
      ? formatMonthTitle(state.viewMonth)
      : '到岗会疯';
  } else if (!state.viewMonth || !state.cal) {
    els.monthTitle.textContent = '加载中…';
  } else {
    els.monthTitle.textContent = formatMonthTitle(state.viewMonth);
  }

  const year = state.viewMonth ? Number(state.viewMonth.slice(0, 4)) : null;
  const showWarning =
    state.bootState === 'ready' &&
    Boolean(state.cal) &&
    year !== null &&
    !state.cal.dataYears.has(year);
  els.dataWarning.hidden = !showWarning;
  els.dataWarning.title = showWarning
    ? '该年份节假日数据待补，暂按周一至周五计算'
    : '';
}

function renderStats() {
  resetStats();

  if (state.bootState === 'loading') {
    els.statsLine1.textContent = '加载中…';
    return;
  }

  if (state.bootState === 'fatal') {
    els.statsLine1.textContent = '无法加载数据';
    els.statsLine1.title = state.fatalMessage;
    els.statsLine2.textContent = state.fatalMessage;
    els.statsLine2.hidden = false;
    els.statsLine2.classList.add('is-bad');
    els.retryBtn.hidden = false;
    return;
  }

  if (!isMonthKey(state.viewMonth)) {
    els.statsLine1.textContent = '暂无数据';
    return;
  }

  if (monthKind(state.viewMonth, state.today) === 'future') {
    els.statsLine1.textContent = '未来月份，暂不可记录';
    return;
  }

  const stats = state.stats;
  if (!stats) {
    els.statsLine1.textContent = '暂无数据';
    return;
  }

  els.statsLine1.textContent = `已到岗 ${stats.on_site_days} 天 / 工作日 ${stats.working_days} 天`;
  const rate = stats.rate_percent === null ? '—' : stats.rate_percent.toFixed(1);
  let line2 = '';
  let line3 = '';
  let line3Class = '';

  switch (stats.result_status) {
    case 'needs_days':
      line2 = `占比 ${rate}% · 达标需 ${stats.need} 天 · 还需 ${stats.remain} 天`;
      line3 = `剩余 ${stats.remaining_workdays} 个工作日，来得及`;
      break;
    case 'too_late':
      line2 = `占比 ${rate}% · 达标需 ${stats.need} 天 · 还需 ${stats.remain} 天`;
      line3 = `剩余 ${stats.remaining_workdays} 个工作日，已来不及`;
      line3Class = 'is-late';
      break;
    case 'qualified':
      line2 = `占比 ${rate}% · 达标需 ${stats.need} 天`;
      if (monthKind(state.viewMonth, state.today) === 'current') {
        line3 = `已合格 · 剩余 ${stats.remaining_workdays} 个工作日`;
        if (stats.on_site_days > stats.need) {
          line3 += ` · 超出 ${stats.on_site_days - stats.need} 天`;
        }
      } else {
        line3 = '已合格 · 本月已结束';
      }
      break;
    case 'below_target_ended':
      line2 = `占比 ${rate}% · 达标需 ${stats.need} 天 · 还需 ${stats.remain} 天`;
      line3 = '未达标（本月已结束）';
      line3Class = 'is-late';
      break;
    case 'no_need':
      line2 = '占比 — · 达标需 0 天 · 本月无需到岗';
      els.statsLine2.classList.add('is-ok');
      break;
    case 'data_error':
      line2 = '数据异常，请检查请假记录';
      els.statsLine2.classList.add('is-bad');
      break;
    default:
      line2 = '暂无数据';
      break;
  }

  els.statsLine2.textContent = line2;
  els.statsLine2.hidden = !line2;
  els.statsLine3.textContent = line3;
  els.statsLine3.hidden = !line3;
  if (line3Class) els.statsLine3.classList.add(line3Class);
}

function collectInvalidRecords() {
  if (state.stats) return state.stats.invalid_records;
  if (!state.cal || !isMonthKey(state.viewMonth)) return [];
  if (monthKind(state.viewMonth, state.today) !== 'future') return [];

  return Array.from(state.records.values())
    .filter(
      (record) =>
        record &&
        typeof record.date === 'string' &&
        record.date.startsWith(`${state.viewMonth}-`),
    )
    .filter(
      (record) =>
        !isValidStatus(record.status) ||
        record.date > state.today ||
        !isWorkday(record.date, state.cal),
    )
    .map((record) => ({ date: record.date, status: record.status }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

function renderCalendar() {
  els.calendar.replaceChildren();

  if (!state.cal || !isMonthKey(state.viewMonth)) {
    els.calendar.dataset.rows = '6';
    return;
  }

  const grid = monthGrid(state.viewMonth);
  if (!grid) {
    els.calendar.dataset.rows = '6';
    return;
  }

  els.calendar.dataset.rows = String(grid.rows);
  const invalidDates = new Set(state.invalidRecords.map((item) => item.date));
  const monthNumber = Number(state.viewMonth.slice(5, 7));

  for (const date of grid.cells) {
    if (!date) {
      const blank = document.createElement('div');
      blank.className = 'day-cell is-blank';
      blank.setAttribute('aria-hidden', 'true');
      els.calendar.append(blank);
      continue;
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'day-cell';
    button.dataset.date = date;

    const holiday = state.cal.holidayMap.get(date) || '';
    const isOverride = state.cal.overrideSet.has(date);
    const record = state.records.get(date);
    const invalid = invalidDates.has(date);

    if (isOverride) button.classList.add('is-override');
    else if (holiday) button.classList.add('is-holiday');
    else if (isWeekend(date)) button.classList.add('is-weekend');

    if (record && record.status === 'on_site') button.classList.add('is-on-site');
    else if (record && record.status === 'leave') button.classList.add('is-leave');

    if (date === state.today) button.classList.add('is-today');
    if (invalid) button.classList.add('is-invalid');

    const dayNumber = document.createElement('span');
    dayNumber.className = 'day-num';
    dayNumber.textContent = String(Number(date.slice(8, 10)));
    button.append(dayNumber);

    if (record && record.status === 'on_site') {
      const check = document.createElement('span');
      check.className = 'mark-check';
      button.append(check);
    } else if (record && record.status === 'leave') {
      const sub = document.createElement('span');
      sub.className = 'day-sub';
      sub.textContent = '假';
      button.append(sub);
    } else if (holiday) {
      const sub = document.createElement('span');
      sub.className = 'day-sub';
      sub.textContent = holiday || '休';
      button.append(sub);
    }

    if (isOverride) {
      const badge = document.createElement('span');
      badge.className = 'day-badge';
      badge.textContent = '班';
      button.append(badge);
    }

    const labelParts = [
      `${monthNumber}月${Number(date.slice(8, 10))}日`,
      formatWeekdayCn(date),
    ];
    if (holiday) labelParts.push(holiday || '公休假');
    if (isOverride) labelParts.push('调休补班');
    if (record) {
      labelParts.push(`${statusText(record.status)}${invalid ? '，已失效' : ''}`);
    }
    if (date === state.today) labelParts.push('今天');
    button.setAttribute('aria-label', labelParts.join('，'));

    button.addEventListener('click', () => handleDateClick(date));
    els.calendar.append(button);
  }
}

function renderNotice() {
  const count = state.invalidRecords.length;
  if (count > 0) {
    els.invalidNotice.textContent = `有 ${count} 条失效记录，点击处理`;
    els.invalidNotice.hidden = false;
  } else {
    els.invalidNotice.hidden = true;
  }
}

function renderAll() {
  if (state.bootState === 'ready' && state.cal && isMonthKey(state.viewMonth)) {
    state.stats = computeMonthStats({
      month: state.viewMonth,
      today: state.today,
      records: Array.from(state.records.values()),
      cal: state.cal,
    });
    state.invalidRecords = collectInvalidRecords();
  } else {
    state.stats = null;
    state.invalidRecords = [];
  }

  renderHeader();
  renderStats();
  renderCalendar();
  renderNotice();

  if (!els.invalidSheet.hidden) {
    if (state.invalidRecords.length === 0) closeSheets();
    else renderInvalidList();
  }
}

function showSheet(kind) {
  els.sheetBackdrop.hidden = false;
  els.actionSheet.hidden = kind !== 'action';
  els.invalidSheet.hidden = kind !== 'invalid';
}

function closeSheets() {
  els.sheetBackdrop.hidden = true;
  els.actionSheet.hidden = true;
  els.invalidSheet.hidden = true;
  els.actionSheet.classList.remove('is-invalid-only');
  state.selectedDate = null;
}

function openActionSheet(date, invalid) {
  const record = state.records.get(date);
  state.selectedDate = date;
  els.sheetTitle.textContent = `${formatDisplayDate(date, state.today)} ${formatWeekdayCn(date)}`;

  if (invalid && record) {
    els.sheetSubtitle.textContent = `当前：${statusText(record.status)}（已失效，不计入统计）`;
  } else if (record) {
    els.sheetSubtitle.textContent = `当前：${statusText(record.status)}`;
  } else {
    els.sheetSubtitle.textContent = '当前：未标记';
  }

  els.actionSheet.classList.toggle('is-invalid-only', Boolean(invalid));
  for (const button of els.actionButtons) {
    const action = button.dataset.action;
    button.classList.toggle('is-current', !invalid && Boolean(record) && action === record.status);
    if (action === 'on_site' || action === 'leave') {
      button.hidden = Boolean(invalid);
    } else {
      button.hidden = false;
    }
  }

  showSheet('action');
}

function handleDateClick(date) {
  if (Date.now() < suppressClickUntil) return;
  if (state.bootState !== 'ready' || !state.cal) return;

  const today = todayInShanghai();
  if (today !== state.today) {
    state.today = today;
    renderAll();
  }

  const record = state.records.get(date);
  const future = date > state.today;
  const workday = isWorkday(date, state.cal);
  const recordInvalid =
    Boolean(record) && (future || !workday || !isValidStatus(record.status));

  if (recordInvalid) {
    openActionSheet(date, true);
    return;
  }
  if (workday && !future) {
    openActionSheet(date, false);
    return;
  }
  showToast(future ? '未来日期不可记录' : '非工作日不可记录');
}

async function commitStatus(date, status) {
  if (!isValidStatus(status) || !state.cal) return;

  const today = todayInShanghai();
  const validation = validateMarkInput({ date, status, today, cal: state.cal });
  if (!validation.ok) {
    showToast(validation.message);
    state.today = today;
    closeSheets();
    renderAll();
    return;
  }

  const record = { date, status, updated_at: nowIso() };
  try {
    await putRecord(record);
    state.records.set(date, record);
    state.today = today;
    closeSheets();
    renderAll();
    showToast(`已标记 ${formatDisplayDate(date, state.today)} ${statusText(status)}`);
  } catch (error) {
    console.error(error);
    showToast('保存失败，请重试');
  }
}

async function clearSelected(date) {
  const record = state.records.get(date);
  if (!record) {
    closeSheets();
    showToast('该日无记录');
    return;
  }

  try {
    await deleteRecord(date);
    state.records.delete(date);
    closeSheets();
    renderAll();
    showToast(`已清除 ${formatDisplayDate(date, state.today)} 记录`);
  } catch (error) {
    console.error(error);
    showToast('保存失败，请重试');
  }
}

function renderInvalidList() {
  els.invalidList.replaceChildren();
  for (const item of state.invalidRecords) {
    const li = document.createElement('li');
    const label = document.createElement('span');
    label.textContent = `${formatDisplayDate(item.date, state.today)} ${statusText(item.status)}`;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'invalid-clear';
    button.textContent = '清除';
    button.addEventListener('click', () => clearInvalidRecord(item.date));

    li.append(label, button);
    els.invalidList.append(li);
  }
}

function openInvalidSheet() {
  if (state.invalidRecords.length === 0) return;
  renderInvalidList();
  showSheet('invalid');
}

async function clearInvalidRecord(date) {
  try {
    await deleteRecord(date);
    state.records.delete(date);
    renderAll();
    if (state.invalidRecords.length > 0) {
      renderInvalidList();
    } else {
      closeSheets();
    }
    showToast(`已清除 ${formatDisplayDate(date, state.today)} 记录`);
  } catch (error) {
    console.error(error);
    showToast('保存失败，请重试');
  }
}

function navigateMonth(delta) {
  if (state.bootState !== 'ready') return;
  const next = addMonths(state.viewMonth, delta);
  if (!next) return;
  state.viewMonth = next;
  closeSheets();
  renderAll();
}

async function reloadRecords() {
  const records = await getAllRecords();
  state.records = new Map(
    records
      .filter((record) => record && typeof record.date === 'string')
      .map((record) => [record.date, record]),
  );
  renderAll();
}

function setupSwipe() {
  els.calendar.addEventListener(
    'touchstart',
    (event) => {
      if (event.touches.length !== 1) {
        touchStart = null;
        return;
      }
      touchStart = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    },
    { passive: true },
  );

  els.calendar.addEventListener(
    'touchend',
    (event) => {
      if (!touchStart) return;
      const touch = event.changedTouches[0];
      const dx = touch.clientX - touchStart.x;
      const dy = touch.clientY - touchStart.y;
      touchStart = null;
      if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        suppressClickUntil = Date.now() + 350;
        navigateMonth(dx < 0 ? 1 : -1);
      }
    },
    { passive: true },
  );

  els.calendar.addEventListener(
    'touchcancel',
    () => {
      touchStart = null;
    },
    { passive: true },
  );
}

function setupEvents() {
  els.prevMonth.addEventListener('click', () => navigateMonth(-1));
  els.nextMonth.addEventListener('click', () => navigateMonth(1));
  els.invalidNotice.addEventListener('click', openInvalidSheet);
  els.invalidClose.addEventListener('click', closeSheets);
  els.sheetBackdrop.addEventListener('click', closeSheets);
  els.retryBtn.addEventListener('click', () => boot());

  for (const button of els.actionButtons) {
    button.addEventListener('click', () => {
      const action = button.dataset.action;
      const date = state.selectedDate;
      if (!date) return;
      if (action === 'cancel') {
        closeSheets();
        return;
      }
      if (action === 'clear') {
        clearSelected(date);
        return;
      }
      commitStatus(date, action);
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeSheets();
  });

  setupSwipe();
}

function startTimers() {
  if (timersStarted) return;
  timersStarted = true;

  window.setInterval(() => {
    const today = todayInShanghai();
    if (today !== state.today) {
      state.today = today;
      renderAll();
    }
  }, 60000);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    if (state.bootState !== 'ready') return;
    const today = todayInShanghai();
    if (today !== state.today) state.today = today;
    reloadRecords().catch((error) => console.warn('刷新记录失败', error));
  });
}

function registerServiceWorker() {
  if (swStarted) return;
  swStarted = true;
  if (!('serviceWorker' in navigator)) return;

  const secure =
    location.protocol === 'https:' ||
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1' ||
    location.hostname === '[::1]';
  if (!secure) return;

  const hadController = Boolean(navigator.serviceWorker.controller);

  navigator.serviceWorker
    .register('./sw.js', { scope: './', updateViaCache: 'none' })
    .then((registration) => {
      registration.update().catch(() => {});
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && hadController) {
            showToast('新版本已就绪，下次打开生效');
          }
        });
      });
    })
    .catch((error) => console.warn('Service Worker 注册失败', error));
}

async function boot() {
  if (booting) return;
  booting = true;
  state.bootState = 'loading';
  state.fatalMessage = '';
  renderAll();
  registerServiceWorker();

  try {
    let calendarJson = null;

    try {
      const response = await fetch('./data/holidays.json');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      calendarJson = await response.json();
      state.cal = buildCalendarIndex(calendarJson);
    } catch (fetchError) {
      const stored = await readStoredCalendar();
      if (!stored.holidays.length && !stored.workdayOverrides.length) {
        throw new Error('节假日数据加载失败，请联网后重试');
      }
      state.cal = buildCalendarIndex(stored);
    }

    if (calendarJson) {
      try {
        await seedCalendar(calendarJson);
      } catch (seedError) {
        console.warn('节假日数据写入 IndexedDB 失败', seedError);
      }
    }

    const records = await getAllRecords();
    state.records = new Map(
      records
        .filter((record) => record && typeof record.date === 'string')
        .map((record) => [record.date, record]),
    );
    state.today = todayInShanghai();
    if (!isMonthKey(state.viewMonth)) {
      state.viewMonth = monthKeyOf(state.today);
    }
    state.bootState = 'ready';
    renderAll();
    startTimers();
  } catch (error) {
    console.error(error);
    state.bootState = 'fatal';
    state.fatalMessage = error && error.message ? error.message : '加载失败，请重试';
    renderAll();
  } finally {
    booting = false;
  }
}

setupEvents();
boot();
