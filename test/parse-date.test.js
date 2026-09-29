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

// ---------------------------------------------------------------------------
// Field-aware default times (issue #1)
// ---------------------------------------------------------------------------

// Run a probe body against the real helper in a fresh process. `settings`
// replaces the OmniFocus settings read so these tests never touch OmniFocus:
// an object is returned as the configured times, null makes the read throw.
function runProbe(engine, timezone, settings, body) {
  const stub = settings === null
    ? 'readDefaultTimeSettings = function () { throw new Error("settings unavailable"); };'
    : `readDefaultTimeSettings = function () { return ${JSON.stringify(settings)}; };`;
  const source = `${helpers}\n${stub}\nJSON.stringify((function () {${body}})());`;
  const command = engine === 'jxa' ? 'osascript' : process.execPath;
  const args = engine === 'jxa'
    ? ['-l', 'JavaScript', '-e', source]
    : ['--input-type=commonjs', '-e', `console.log(eval(${JSON.stringify(source)}))`];
  return JSON.parse(execFileSync(command, args, {
    env: { ...process.env, TZ: timezone }, encoding: 'utf8', timeout: 10000
  }));
}

const bareInputs = ['2026-10-01', 'today', 'tomorrow', 'yesterday', '+3d', '-2w', 'next week'];
const fieldProbe = `
  var fields = ['due', 'defer', 'planned'];
  var out = {};
  fields.forEach(function (field) {
    out[field] = ${JSON.stringify(bareInputs)}.map(function (input) {
      var d = parseDate(input, field);
      return d ? [d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds()] : null;
    });
  });
  out.day = (function () {
    var d = parseDate('2026-10-01', 'defer');
    return [d.getFullYear(), d.getMonth() + 1, d.getDate()];
  })();
  out.explicit = fields.map(function (field) {
    return [
      parseDate('2026-10-01T09:30:00', field).getHours(),
      parseDate('2026-10-01T09:30:00', field).getMinutes(),
      parseDate('2026-10-01T00:00:00.000Z', field).toISOString()
    ];
  });
  out.noField = ${JSON.stringify(bareInputs)}.map(function (input) {
    var d = parseDate(input);
    return [d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds()];
  });
  out.unknownField = parseDate('2026-10-01', 'bogus').getHours();
  out.invalid = [parseDate('not-a-date', 'defer'), parseDate('2026-02-30', 'due'), parseDate('', 'planned')];
  return out;
`;

const times = (clock) => bareInputs.map(() => clock);

for (const engine of ['node', 'jxa']) {
  const skip = engine === 'jxa' && process.platform !== 'darwin';

  for (const timezone of Object.keys(zones)) {
    test(`parseDate field defaults: factory fallback, ${engine} in ${timezone}`, { skip }, () => {
      const out = runProbe(engine, timezone, null, fieldProbe);
      assert.deepEqual(out.due, times([17, 0, 0, 0]), 'due falls back to 17:00');
      assert.deepEqual(out.defer, times([0, 0, 0, 0]), 'defer falls back to 00:00');
      assert.deepEqual(out.planned, times([9, 0, 0, 0]), 'planned falls back to 09:00');
      assert.deepEqual(out.day, [2026, 10, 1], 'bare date keeps its local calendar day');
      assert.deepEqual(out.noField, times([17, 0, 0, 0]), 'no field argument behaves as 1.1.1');
      assert.equal(out.unknownField, 17, 'unknown field behaves as no field');
      assert.deepEqual(out.invalid, [null, null, null], 'invalid dates stay null');
      for (const explicit of out.explicit) {
        assert.deepEqual(explicit, [9, 30, '2026-10-01T00:00:00.000Z'], 'explicit timestamps keep their time');
      }
    });

    test(`parseDate field defaults: configured times, ${engine} in ${timezone}`, { skip }, () => {
      const out = runProbe(engine, timezone,
        { due: '07:00:00', defer: '06:15', planned: '09:30:45' }, fieldProbe);
      assert.deepEqual(out.due, times([7, 0, 0, 0]));
      assert.deepEqual(out.defer, times([6, 15, 0, 0]));
      assert.deepEqual(out.planned, times([9, 30, 45, 0]));
      assert.deepEqual(out.noField, times([17, 0, 0, 0]), 'no field argument ignores settings');
      for (const explicit of out.explicit) {
        assert.deepEqual(explicit, [9, 30, '2026-10-01T00:00:00.000Z'], 'explicit timestamps keep their time');
      }
    });
  }

  test(`parseDate field defaults: unusable setting values fall back, ${engine}`, { skip }, () => {
    const out = runProbe(engine, 'America/Los_Angeles',
      { due: 'null', defer: '25:00', planned: 'garbage' }, fieldProbe);
    assert.deepEqual(out.due, times([17, 0, 0, 0]));
    assert.deepEqual(out.defer, times([0, 0, 0, 0]));
    assert.deepEqual(out.planned, times([9, 0, 0, 0]));
  });

  test(`parseDate field defaults: settings are read once per script, ${engine}`, { skip }, () => {
    const reads = runProbe(engine, 'America/Los_Angeles', { due: '07:00' }, `
      var count = 0;
      var inner = readDefaultTimeSettings;
      readDefaultTimeSettings = function () { count++; return inner(); };
      parseDate('today', 'due'); parseDate('tomorrow', 'defer'); parseDate('+3d', 'planned');
      parseDate('2026-10-01T09:30:00', 'due'); parseDate('today');
      return count;
    `);
    assert.equal(reads, 1);
  });

  test(`requireDate rejects unparseable input, ${engine}`, { skip }, () => {
    const out = runProbe(engine, 'America/Los_Angeles', null, `
      var results = [];
      ['next friday', '3d', '2026-02-30'].forEach(function (input) {
        try { requireDate(input, 'defer'); results.push('accepted'); }
        catch (e) { results.push(e.message.split('. ')[0]); }
      });
      results.push(requireDate('2026-10-01', 'defer').getHours());
      return results;
    `);
    assert.deepEqual(out, [
      'Invalid defer date: next friday',
      'Invalid defer date: 3d',
      'Invalid defer date: 2026-02-30',
      0
    ]);
  });

  for (const timezone of Object.keys(zones)) {
    test(`localDateKey uses the local calendar day, ${engine} in ${timezone}`, { skip }, () => {
      const out = runProbe(engine, timezone, null, `
        return [
          localDateKey(new Date(2026, 9, 1, 17, 0, 0)),
          localDateKey(new Date(2026, 9, 1, 0, 0, 0)),
          localDateKey(new Date(2026, 9, 1, 23, 59, 59)),
          localDateKey(new Date(2027, 0, 5, 17, 0, 0))
        ];
      `);
      assert.deepEqual(out, ['2026-10-01', '2026-10-01', '2026-10-01', '2027-01-05']);
    });

    test(`parseDate search bounds cover the whole day, ${engine} in ${timezone}`, { skip }, () => {
      const out = runProbe(engine, timezone, null, `
        var reads = 0;
        readDefaultTimeSettings = function () { reads++; return {}; };
        var parts = function (d) {
          return [d.getFullYear(), d.getMonth() + 1, d.getDate(),
            d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds()];
        };
        var clock = function (d) { return parts(d).slice(3); };
        return {
          after: parts(parseDate('2026-10-01', 'after')),
          before: parts(parseDate('2026-10-01', 'before')),
          relativeAfter: ['today', 'tomorrow', '+3d', '-2w'].map(function (i) { return clock(parseDate(i, 'after')); }),
          relativeBefore: ['today', 'tomorrow', '+3d', '-2w'].map(function (i) { return clock(parseDate(i, 'before')); }),
          explicit: [clock(parseDate('2026-10-01T09:30:00', 'after')), clock(parseDate('2026-10-01T09:30:00', 'before'))],
          reads: reads
        };
      `);
      assert.deepEqual(out.after, [2026, 10, 1, 0, 0, 0, 0], 'lower bound is the start of the day');
      assert.deepEqual(out.before, [2026, 10, 1, 23, 59, 59, 999], 'upper bound is the end of the day');
      assert.deepEqual(out.relativeAfter, Array(4).fill([0, 0, 0, 0]));
      assert.deepEqual(out.relativeBefore, Array(4).fill([23, 59, 59, 999]));
      assert.deepEqual(out.explicit, [[9, 30, 0, 0], [9, 30, 0, 0]], 'explicit timestamps keep their time');
      assert.equal(out.reads, 0, 'search bounds never read OmniFocus settings');
    });

    test(`parseDate completion dates are never later today, ${engine} in ${timezone}`, { skip }, () => {
      const out = runProbe(engine, timezone, null, `
        var reads = 0;
        readDefaultTimeSettings = function () { reads++; return {}; };
        var pad = function (n) { return (n < 10 ? '0' : '') + n; };
        var started = Date.now();
        var now = new Date();
        var todayIso = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
        var clock = function (d) { return [d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds()]; };
        var result = {
          today: ['today', 'TODAY', todayIso, '+0d', '-0d'].map(function (i) {
            return parseDate(i, 'completion').getTime() - started;
          }),
          past: ['yesterday', '-2d', '-1w', '2026-09-12'].map(function (i) { return clock(parseDate(i, 'completion')); }),
          pastDay: localDateKey(parseDate('2026-09-12', 'completion')),
          future: clock(parseDate('tomorrow', 'completion')),
          explicit: clock(parseDate('2026-09-12T21:45:00', 'completion')),
          invalid: parseDate('next friday', 'completion'),
          finished: Date.now() - started,
          reads: reads
        };
        return result;
      `);
      for (const elapsed of out.today) {
        assert.ok(elapsed >= 0 && elapsed <= out.finished, `a bare date that is today stamps now (${elapsed}ms)`);
      }
      assert.deepEqual(out.past, Array(4).fill([12, 0, 0, 0]), 'other bare dates land at noon');
      assert.equal(out.pastDay, '2026-09-12', 'bare date keeps its local calendar day');
      assert.deepEqual(out.future, [12, 0, 0, 0]);
      assert.deepEqual(out.explicit, [21, 45, 0, 0], 'explicit timestamps keep their time');
      assert.equal(out.invalid, null);
      assert.equal(out.reads, 0, 'completion dates never read OmniFocus settings');
    });
  }
}

// ---------------------------------------------------------------------------
// Accepted forms: anything else is rejected, never guessed at
// ---------------------------------------------------------------------------

const timestamps = [
  // [input, expected ISO instant, or local [y, m, d, h, mi, s, ms]]
  ['2026-10-01T09:30', [2026, 10, 1, 9, 30, 0, 0]],
  ['2026-10-01T09:30:15', [2026, 10, 1, 9, 30, 15, 0]],
  ['2026-10-01T09:30:15.250', [2026, 10, 1, 9, 30, 15, 250]],
  ['2026-10-01 09:30', [2026, 10, 1, 9, 30, 0, 0]],
  [' 2026-10-01t09:30:15 ', [2026, 10, 1, 9, 30, 15, 0]],
  ['2028-02-29T23:59:59', [2028, 2, 29, 23, 59, 59, 0]],
  ['2026-10-01T09:30:15Z', '2026-10-01T09:30:15.000Z'],
  ['2026-10-01T09:30:15z', '2026-10-01T09:30:15.000Z'],
  ['2026-10-01T09:30:15.250Z', '2026-10-01T09:30:15.250Z'],
  ['2026-10-01T09:30:15-07:00', '2026-10-01T16:30:15.000Z'],
  ['2026-10-01T09:30:15-0700', '2026-10-01T16:30:15.000Z'],
  ['2026-10-01T09:30+05:30', '2026-10-01T04:00:00.000Z'],
  ['2026-10-01T00:30:00+02:00', '2026-09-30T22:30:00.000Z']
];

const rejected = [
  '10/1/2026', '10-01-2026', 'Oct 1 2026', 'October 1, 2026', 'Oct 1', '1 Oct 2026',
  '2026-10-1', '2026-1-01', '20261001', '2026', '2026-10', '1', '0',
  '2026-02-30T09:00:00', '2026-13-01T09:00:00', '2026-10-01T24:00:00',
  '2026-10-01T09:60:00', '2026-10-01T09:30:60', '2026-10-01T09', '2026-10-01T',
  '2026-10-01Z', '2026-10-01T09:30:15+25:00', '2026-10-01T09:30:15+07:60',
  'friday', 'next friday', 'next monday', 'noon', 'now', '3d', '+2h', '+3', 'd'
];

for (const engine of ['node', 'jxa']) {
  const skip = engine === 'jxa' && process.platform !== 'darwin';

  for (const timezone of Object.keys(zones)) {
    test(`parseDate accepts ISO timestamps only, ${engine} in ${timezone}`, { skip }, () => {
      const out = runProbe(engine, timezone, null, `
        var parts = function (d) {
          return [d.getFullYear(), d.getMonth() + 1, d.getDate(),
            d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds()];
        };
        return {
          accepted: ${JSON.stringify(timestamps.map(t => t[0]))}.map(function (input) {
            var d = parseDate(input, 'defer');
            return d ? { local: parts(d), iso: d.toISOString() } : null;
          }),
          rejected: ${JSON.stringify(rejected)}.map(function (input) {
            var d = parseDate(input, 'defer');
            return d ? d.toString() : null;
          })
        };
      `);
      timestamps.forEach(([input, expected], i) => {
        assert.ok(out.accepted[i], `${input} should parse`);
        if (typeof expected === 'string') assert.equal(out.accepted[i].iso, expected, input);
        else assert.deepEqual(out.accepted[i].local, expected, input);
      });
      rejected.forEach((input, i) => {
        assert.equal(out.rejected[i], null, `${input} should be rejected`);
      });
    });
  }

  test(`requireDate names the accepted forms, ${engine}`, { skip }, () => {
    const out = runProbe(engine, 'America/Los_Angeles', null, `
      try { requireDate('10/1/2026', 'due'); return 'accepted'; }
      catch (e) { return e.message; }
    `);
    assert.match(out, /^Invalid due date: 10\/1\/2026\. /);
    for (const form of ['today', 'tomorrow', '+3d', 'YYYY-MM-DD', 'YYYY-MM-DDTHH:MM']) {
      assert.ok(out.includes(form), `message should mention ${form}: ${out}`);
    }
  });
}
