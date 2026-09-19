import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const helpers = readFileSync(new URL('../jxa/utils/helpers.js', import.meta.url), 'utf8');
const inputs = [
  '2026-09-12', // Reported PDT regression
  '2027-01-15', // PST
  '2026-03-08', // Spring DST transition
  '2026-11-01', // Fall DST transition
  '2028-02-29', // Leap day
  ' 2026-09-12 ',
  '0099-09-12',
  '2026-09-12T00:00:00.000Z',
  '2026-09-12T09:30:00-07:00',
  '2026-09-12T09:30:00',
  '2026-02-30', '2026-13-01', '2026-00-10', '2026-09-00',
  '', null, 'not-a-date'
];

// Run the actual shared helper without accessing OmniFocus. Exercise both
// Node and the production JXA engine, each in a fresh timezone environment.
const probe = `${helpers}\nJSON.stringify(${JSON.stringify(inputs)}.map(function(input) {
  const date = parseDate(input);
  return date ? {
    local: [date.getFullYear(), date.getMonth() + 1, date.getDate(),
      date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds()],
    iso: date.toISOString()
  } : null;
}));`;

const zones = {
  'America/Los_Angeles': [
    '2026-09-13T00:00:00.000Z', '2027-01-16T01:00:00.000Z',
    '2026-03-09T00:00:00.000Z', '2026-11-02T01:00:00.000Z'
  ],
  UTC: [
    '2026-09-12T17:00:00.000Z', '2027-01-15T17:00:00.000Z',
    '2026-03-08T17:00:00.000Z', '2026-11-01T17:00:00.000Z'
  ],
  'Asia/Tokyo': [
    '2026-09-12T08:00:00.000Z', '2027-01-15T08:00:00.000Z',
    '2026-03-08T08:00:00.000Z', '2026-11-01T08:00:00.000Z'
  ]
};

for (const engine of ['node', 'jxa']) {
  for (const [timezone, expectedISO] of Object.entries(zones)) {
    test(`parseDate: ${engine} in ${timezone}`, {
      skip: engine === 'jxa' && process.platform !== 'darwin'
    }, () => {
      const command = engine === 'jxa' ? 'osascript' : process.execPath;
      const args = engine === 'jxa'
        ? ['-l', 'JavaScript', '-e', probe]
        : ['--input-type=commonjs', '-e', `console.log(eval(${JSON.stringify(probe)}))`];
      const dates = JSON.parse(execFileSync(command, args, {
        env: { ...process.env, TZ: timezone }, encoding: 'utf8', timeout: 10000
      }));

      for (let i = 0; i < 7; i++) {
        const calendar = inputs[i].trim().split('-').map(Number);
        assert.deepEqual(dates[i]?.local, [...calendar, 17, 0, 0, 0], inputs[i]);
      }
      assert.deepEqual(dates.slice(0, 4).map(date => date.iso), expectedISO);
      assert.equal(dates[7].iso, '2026-09-12T00:00:00.000Z', 'Preserve explicit UTC instant');
      assert.equal(dates[8].iso, '2026-09-12T16:30:00.000Z', 'Preserve explicit offset');
      assert.deepEqual(dates[9].local, [2026, 9, 12, 9, 30, 0, 0], 'Preserve local timestamp');
      assert.deepEqual(dates.slice(10), Array(7).fill(null), 'Reject invalid dates');
    });
  }
}
