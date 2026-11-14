// 所有日期计算的唯一入口。除本文件外，其他模块不要直接使用 Date / Intl。
// 日期一律用 YYYY-MM-DD 字符串表示，星期以周一为第一天。

export const TIMEZONE = 'Asia/Shanghai';
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAY_NAMES = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

function pad2(n) {
  return String(n).padStart(2, '0');
}

export function isDateString(value) {
  return parseDate(value) !== null;
}

export function isMonthKey(value) {
  return typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function parseDate(value) {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (m < 1 || m > 12 || d < 1) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
    return null;
  }
  return { y, m, d };
}

export function formatDate(y, m, d) {
  return `${String(y).padStart(4, '0')}-${pad2(m)}-${pad2(d)}`;
}

export function epochDay(dateStr) {
  const parsed = parseDate(dateStr);
  if (!parsed) return null;
  return Math.floor(Date.UTC(parsed.y, parsed.m - 1, parsed.d) / DAY_MS);
}

export function fromEpochDay(dayNumber) {
  const dt = new Date(dayNumber * DAY_MS);
  return formatDate(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

export function addDays(dateStr, delta) {
  const day = epochDay(dateStr);
  if (day === null) return null;
  return fromEpochDay(day + delta);
}

export function monthKeyOf(dateStr) {
  return isDateString(dateStr) ? dateStr.slice(0, 7) : null;
}

export function addMonths(monthKey, delta) {
  if (!isMonthKey(monthKey)) return null;
  const year = Number(monthKey.slice(0, 4));
  const month = Number(monthKey.slice(5, 7));
  const total = year * 12 + (month - 1) + delta;
  const nextYear = Math.floor(total / 12);
  const nextMonth = ((total % 12) + 12) % 12 + 1;
  return `${String(nextYear).padStart(4, '0')}-${pad2(nextMonth)}`;
}

export function compareDates(a, b) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function compareMonth(a, b) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function monthBounds(monthKey) {
  if (!isMonthKey(monthKey)) return null;
  const year = Number(monthKey.slice(0, 4));
  const month = Number(monthKey.slice(5, 7));
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    start: `${monthKey}-01`,
    end: `${monthKey}-${pad2(days)}`,
    days,
  };
}

export function weekdayMon0(dateStr) {
  const day = epochDay(dateStr);
  if (day === null) return null;
  // 1970-01-01 是周四；Monday=0 时值为 3。
  return ((day + 3) % 7 + 7) % 7;
}

export function isWeekend(dateStr) {
  const weekday = weekdayMon0(dateStr);
  return weekday !== null && weekday >= 5;
}

export function monthKind(monthKey, today) {
  const todayMonth = monthKeyOf(today);
  if (!todayMonth || !isMonthKey(monthKey)) return null;
  const cmp = compareMonth(monthKey, todayMonth);
  if (cmp === 0) return 'current';
  return cmp < 0 ? 'past' : 'future';
}

export function monthGrid(monthKey) {
  const bounds = monthBounds(monthKey);
  if (!bounds) return null;
  const lead = weekdayMon0(bounds.start);
  const cells = [];
  for (let i = 0; i < lead; i += 1) cells.push(null);
  for (let d = 1; d <= bounds.days; d += 1) {
    cells.push(`${monthKey}-${pad2(d)}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return { cells, rows: cells.length / 7 };
}

export function eachDateInMonth(monthKey) {
  const bounds = monthBounds(monthKey);
  if (!bounds) return [];
  return Array.from({ length: bounds.days }, (_, i) => `${monthKey}-${pad2(i + 1)}`);
}

export function formatMMDD(dateStr) {
  if (!isDateString(dateStr)) return dateStr;
  return `${dateStr.slice(5, 7)}/${dateStr.slice(8, 10)}`;
}

export function formatDisplayDate(dateStr, today) {
  if (!isDateString(dateStr)) return dateStr;
  const todayYear = isDateString(today) ? today.slice(0, 4) : '';
  if (todayYear && dateStr.slice(0, 4) !== todayYear) {
    return `${dateStr.slice(0, 4)}/${dateStr.slice(5, 7)}/${dateStr.slice(8, 10)}`;
  }
  return formatMMDD(dateStr);
}

export function formatMonthTitle(monthKey) {
  if (!isMonthKey(monthKey)) return '';
  return `${Number(monthKey.slice(0, 4))} 年 ${Number(monthKey.slice(5, 7))} 月`;
}

export function formatWeekdayCn(dateStr) {
  const weekday = weekdayMon0(dateStr);
  return weekday === null ? '' : WEEKDAY_NAMES[weekday];
}

export function todayInShanghai(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const values = {};
  for (const part of parts) {
    if (part.type !== 'literal') values[part.type] = part.value;
  }
  return `${values.year}-${values.month}-${values.day}`;
}

export function nowIso() {
  return new Date().toISOString();
}
