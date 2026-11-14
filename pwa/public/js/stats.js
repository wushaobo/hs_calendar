// 工作日集合与月度统计。纯函数，不碰 DOM / IndexedDB / fetch。

import {
  addDays,
  eachDateInMonth,
  isDateString,
  monthBounds,
  monthKeyOf,
  monthKind,
  weekdayMon0,
} from './dates.js';

export const THRESHOLD = 0.3;
const VALID_STATUSES = new Set(['on_site', 'leave']);

function asEntryMap(entries, label) {
  if (entries === undefined) return new Map();
  if (!Array.isArray(entries)) {
    throw new Error(`${label} 必须是数组`);
  }
  const map = new Map();
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object' || !isDateString(entry.date)) {
      throw new Error(`${label} 中存在非法日期`);
    }
    if (map.has(entry.date)) {
      throw new Error(`${label} 中日期重复：${entry.date}`);
    }
    map.set(entry.date, typeof entry.name === 'string' ? entry.name : '');
  }
  return map;
}

export function buildCalendarIndex(calendarJson) {
  if (!calendarJson || typeof calendarJson !== 'object') {
    throw new Error('节假日数据不是有效对象');
  }
  if (calendarJson.schemaVersion !== undefined && calendarJson.schemaVersion !== 1) {
    throw new Error('节假日数据 schemaVersion 不支持');
  }
  if (calendarJson.timezone !== undefined && calendarJson.timezone !== 'Asia/Shanghai') {
    throw new Error('节假日数据时区不是 Asia/Shanghai');
  }

  const holidayMap = asEntryMap(calendarJson.holidays, 'holidays');
  const overrideMap = asEntryMap(calendarJson.workdayOverrides, 'workdayOverrides');

  for (const date of overrideMap.keys()) {
    if (holidayMap.has(date)) {
      throw new Error(`节假日与调休补班日冲突：${date}`);
    }
  }

  const dataYears = new Set();
  for (const date of holidayMap.keys()) dataYears.add(Number(date.slice(0, 4)));
  for (const date of overrideMap.keys()) dataYears.add(Number(date.slice(0, 4)));

  return {
    holidayMap,
    overrideMap,
    holidaySet: new Set(holidayMap.keys()),
    overrideSet: new Set(overrideMap.keys()),
    dataVersion: typeof calendarJson.dataVersion === 'string' ? calendarJson.dataVersion : null,
    dataYears,
  };
}

export function isWorkday(dateStr, cal) {
  if (!isDateString(dateStr)) return false;
  if (cal.overrideSet.has(dateStr)) return true;
  if (cal.holidaySet.has(dateStr)) return false;
  const weekday = weekdayMon0(dateStr);
  return weekday !== null && weekday <= 4;
}

export function workdaysOfMonth(monthKey, cal) {
  return eachDateInMonth(monthKey).filter((date) => isWorkday(date, cal));
}

export function countWorkdaysBetween(startDate, endDate, cal) {
  if (!isDateString(startDate) || !isDateString(endDate) || startDate > endDate) return 0;
  let count = 0;
  let current = startDate;
  while (current <= endDate) {
    if (isWorkday(current, cal)) count += 1;
    current = addDays(current, 1);
  }
  return count;
}

export function calcNeed(workingDays) {
  return Math.floor((3 * workingDays + 9) / 10);
}

export function calcRatePercent(onSiteDays, workingDays) {
  if (workingDays <= 0) return null;
  // 以 0.1% 为单位的整数半向上舍入，避免浮点误差。
  return Math.floor((2 * onSiteDays * 1000 + workingDays) / (2 * workingDays)) / 10;
}

export function validateMarkInput({ date, status, today, cal }) {
  if (!isDateString(date)) {
    return { ok: false, code: 'bad_date', message: '日期格式应为 YYYY-MM-DD' };
  }
  if (!VALID_STATUSES.has(status)) {
    return { ok: false, code: 'bad_status', message: '状态无效' };
  }
  if (!isDateString(today)) {
    return { ok: false, code: 'bad_today', message: '今天日期无效' };
  }
  if (
    date > today &&
    (status !== 'leave' || monthKeyOf(date) !== monthKeyOf(today))
  ) {
    return { ok: false, code: 'future', message: '未来日期不可记录' };
  }
  if (!isWorkday(date, cal)) {
    return { ok: false, code: 'non_workday', message: '非工作日不可记录' };
  }
  return { ok: true };
}

export function computeMonthStats({ month, today, records, cal }) {
  const bounds = monthBounds(month);
  if (!bounds || !isDateString(today)) return null;
  const kind = monthKind(month, today);
  if (kind === 'future') return null;

  const workdays = workdaysOfMonth(month, cal);
  const w0 = workdays.length;
  const workdaySet = new Set(workdays);

  // 同一天最多一条记录；数组输入按后写覆盖处理，与 IndexedDB 主键一致。
  const byDate = new Map();
  for (const record of Array.isArray(records) ? records : []) {
    if (!record || !isDateString(record.date)) continue;
    if (monthKeyOf(record.date) !== month) continue;
    byDate.set(record.date, record);
  }

  let leaveDays = 0;
  let onSiteDays = 0;
  let futureLeaveDays = 0;
  const invalidRecords = [];

  for (const record of byDate.values()) {
    // 未来只允许请假（当前月）；未来到岗仍视为失效记录。
    const valid =
      workdaySet.has(record.date) &&
      VALID_STATUSES.has(record.status) &&
      (record.date <= today || record.status === 'leave');
    if (!valid) {
      invalidRecords.push({ date: record.date, status: record.status });
      continue;
    }
    if (record.status === 'leave') {
      leaveDays += 1;
      if (record.date > today) futureLeaveDays += 1;
    } else {
      onSiteDays += 1;
    }
  }

  invalidRecords.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  if (leaveDays > w0) {
    return {
      w0,
      leave_days: leaveDays,
      working_days: 0,
      on_site_days: onSiteDays,
      need: null,
      remain: null,
      rate_percent: null,
      remaining_workdays: null,
      feasible: null,
      result_status: 'data_error',
      invalid_records: invalidRecords,
    };
  }

  const workingDays = Math.max(0, w0 - leaveDays);
  if (workingDays === 0) {
    return {
      w0,
      leave_days: leaveDays,
      working_days: 0,
      on_site_days: onSiteDays,
      need: 0,
      remain: 0,
      rate_percent: null,
      remaining_workdays: null,
      feasible: null,
      result_status: 'no_need',
      invalid_records: invalidRecords,
    };
  }

  const need = calcNeed(workingDays);
  const remain = Math.max(0, need - onSiteDays);
  const ratePercent = calcRatePercent(onSiteDays, workingDays);

  let remainingWorkdays = null;
  let feasible = null;
  let resultStatus;

  if (kind === 'current') {
    // S 表示今天到月末还能到岗的可用工作日：扣除已预排的未来请假。
    // 今天的请假不扣，沿用「S 含今天、不因今天已有记录扣减」的既有口径。
    remainingWorkdays = Math.max(
      0,
      countWorkdaysBetween(today, bounds.end, cal) - futureLeaveDays,
    );
    feasible = remainingWorkdays >= remain;
    if (remain === 0) resultStatus = 'qualified';
    else if (!feasible) resultStatus = 'too_late';
    else resultStatus = 'needs_days';
  } else if (remain === 0) {
    resultStatus = 'qualified';
  } else {
    resultStatus = 'below_target_ended';
  }

  return {
    w0,
    leave_days: leaveDays,
    working_days: workingDays,
    on_site_days: onSiteDays,
    need,
    remain,
    rate_percent: ratePercent,
    remaining_workdays: remainingWorkdays,
    feasible,
    result_status: resultStatus,
    invalid_records: invalidRecords,
  };
}
