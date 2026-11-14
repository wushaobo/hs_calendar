// 零依赖验收脚本：读取 requirement/test-cases.json 的 12 条黄金用例。
// 运行：node tools/verify-cases.mjs

import { readFileSync } from 'node:fs';
import {
  addMonths,
  formatMonthTitle,
  monthBounds,
  todayInShanghai,
  weekdayMon0,
} from '../public/js/dates.js';
import {
  buildCalendarIndex,
  calcRatePercent,
  computeMonthStats,
  validateMarkInput,
} from '../public/js/stats.js';

const suite = JSON.parse(
  readFileSync(new URL('../../requirement/test-cases.json', import.meta.url), 'utf8'),
);

function deepEqual(actual, expected) {
  if (Object.is(actual, expected)) return true;
  if (typeof actual !== typeof expected) return false;
  if (actual === null || expected === null) return false;
  if (Array.isArray(actual) || Array.isArray(expected)) {
    if (!Array.isArray(actual) || !Array.isArray(expected) || actual.length !== expected.length) {
      return false;
    }
    return actual.every((item, index) => deepEqual(item, expected[index]));
  }
  if (typeof actual === 'object') {
    const actualKeys = Object.keys(actual);
    const expectedKeys = Object.keys(expected);
    if (actualKeys.length !== expectedKeys.length) return false;
    return expectedKeys.every((key) => deepEqual(actual[key], expected[key]));
  }
  return false;
}

const failures = [];

function check(label, condition, detail = '') {
  if (condition) {
    console.log(`  ok  ${label}`);
  } else {
    failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
    console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

const cal = buildCalendarIndex(suite.calendar);

console.log(`黄金用例（${suite.cases.length} 条）`);
for (const testCase of suite.cases) {
  const actual = computeMonthStats({
    month: testCase.month,
    today: testCase.today,
    records: testCase.records,
    cal,
  });
  const mismatches = [];
  for (const key of Object.keys(testCase.expected)) {
    if (!actual || !deepEqual(actual[key], testCase.expected[key])) {
      mismatches.push(
        `${key}: expected ${JSON.stringify(testCase.expected[key])} got ${JSON.stringify(actual?.[key])}`,
      );
    }
  }
  check(testCase.id, mismatches.length === 0, mismatches.join('; '));
}

console.log('补充断言');
check('addMonths 跨年 +1', addMonths('2026-12', 1) === '2027-01');
check('addMonths 跨年 -1', addMonths('2026-01', -1) === '2025-12');
check(
  'todayInShanghai 按 Asia/Shanghai',
  todayInShanghai(new Date('2026-11-15T16:30:00Z')) === '2026-11-16',
);
check('calcRatePercent 31.25 半向上', calcRatePercent(5, 16) === 31.3);
check('calcRatePercent 21.0526 半向上', calcRatePercent(4, 19) === 21.1);
check('calcRatePercent 30 整', calcRatePercent(6, 20) === 30);
check('formatMonthTitle', formatMonthTitle('2026-11') === '2026 年 11 月');
check('monthBounds 2026-02', monthBounds('2026-02').days === 28);
check('weekdayMon0 2026-11-16 是周一', weekdayMon0('2026-11-16') === 0);

const futureStats = computeMonthStats({
  month: '2026-12',
  today: '2026-11-16',
  records: [],
  cal,
});
check('未来月返回 null', futureStats === null);

const futureWeekend = validateMarkInput({
  date: '2026-11-21',
  status: 'on_site',
  today: '2026-11-16',
  cal,
});
check('未来周末优先报未来日期', futureWeekend.ok === false && futureWeekend.code === 'future');

const futureRecord = computeMonthStats({
  month: '2026-11',
  today: '2026-11-16',
  records: [{ date: '2026-11-20', status: 'on_site' }],
  cal,
});
check(
  '未来日期记录进入 invalid_records',
  futureRecord.on_site_days === 0 &&
    deepEqual(futureRecord.invalid_records, [{ date: '2026-11-20', status: 'on_site' }]),
);

const holidayRecord = computeMonthStats({
  month: '2026-10',
  today: '2026-11-16',
  records: [{ date: '2026-10-01', status: 'on_site' }],
  cal,
});
check(
  '公休假记录进入 invalid_records',
  holidayRecord.on_site_days === 0 &&
    deepEqual(holidayRecord.invalid_records, [{ date: '2026-10-01', status: 'on_site' }]),
);

const historicalQualified = computeMonthStats({
  month: '2026-10',
  today: '2026-11-16',
  records: ['2026-10-08', '2026-10-09', '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15'].map(
    (date) => ({ date, status: 'on_site' }),
  ),
  cal,
});
check(
  '历史月 qualified',
  historicalQualified.result_status === 'qualified' &&
    historicalQualified.remaining_workdays === null &&
    historicalQualified.feasible === null,
);

const duplicateRecord = computeMonthStats({
  month: '2026-11',
  today: '2026-11-16',
  records: [
    { date: '2026-11-02', status: 'leave' },
    { date: '2026-11-02', status: 'on_site' },
  ],
  cal,
});
check(
  '同日记录后写覆盖',
  duplicateRecord.leave_days === 0 && duplicateRecord.on_site_days === 1,
);

// 构造一个整月没有工作日的日历，验证 no_need / 除零分支。
const noWorkdayHolidays = [];
for (let d = 1; d <= 31; d += 1) {
  const date = `2026-03-${String(d).padStart(2, '0')}`;
  if (weekdayMon0(date) <= 4) noWorkdayHolidays.push({ date, name: '整月假' });
}
const noWorkdayCal = buildCalendarIndex({ holidays: noWorkdayHolidays, workdayOverrides: [] });
const noWorkdayStats = computeMonthStats({
  month: '2026-03',
  today: '2026-03-31',
  records: [],
  cal: noWorkdayCal,
});
check(
  'W0=0 → no_need',
  noWorkdayStats.w0 === 0 &&
    noWorkdayStats.working_days === 0 &&
    noWorkdayStats.rate_percent === null &&
    noWorkdayStats.result_status === 'no_need',
);

if (failures.length > 0) {
  console.error(`\n${failures.length} 项失败：`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('\n全部通过。');
}
