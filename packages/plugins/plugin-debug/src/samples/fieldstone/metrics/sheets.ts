//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Obj } from '@dxos/echo';
import * as Sheet from '@dxos/plugin-sheet/Sheet';
import * as SheetRange from '@dxos/plugin-sheet/SheetRange';

import { type Random, prng } from '../projects/util.ts';

export type SheetKey =
  | 'hitRate'
  | 'agentRuns'
  | 'buildTimes'
  | 'requestHeatmap'
  | 'customerHealth'
  | 'requestsByCountry';

export type Sheets = Record<SheetKey, Sheet.Sheet>;

type Value = string | number | undefined;

const COLUMNS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const jitter = (random: Random, spread: number): number => (random() * 2 - 1) * spread;

const normal = (random: Random): number => (random() + random() + random() - 1.5) * 2;

const round = (value: number, digits = 1): number => Number(value.toFixed(digits));

const makeChartSheet = ({
  key,
  name,
  header,
  rows,
  chart,
  firstColumnSize,
}: {
  key: SheetKey;
  name: string;
  header: ReadonlyArray<string>;
  rows: ReadonlyArray<ReadonlyArray<Value>>;
  chart: Pick<Sheet.ChartProperties, 'type' | 'regression'>;
  firstColumnSize?: number;
}): Sheet.Sheet => {
  const cells = Object.fromEntries(
    [header, ...rows].flatMap((row, r) =>
      row.flatMap((value, c) => (value === undefined ? [] : [[`${COLUMNS[c]}${r + 1}`, { value }]])),
    ),
  );
  const last = COLUMNS[header.length - 1];
  const sheet = Sheet.make({
    name,
    rows: rows.length + 1,
    columns: header.length,
    cells,
    ranges: SheetRange.headerRanges(cells, `A1:${last}1`),
    charts: [{ name, range: `A1:${last}${rows.length + 1}`, header: true, grid: true, ...chart }],
  });
  if (firstColumnSize) {
    Obj.update(sheet, (sheet) => {
      sheet.columnMeta[sheet.columns[0]] = { size: firstColumnSize };
    });
  }
  return sheet;
};

const OKAPI_RECOVERY: Record<number, number> = { [-35]: 0, [-34]: 0, [-33]: 41, [-32]: 63, [-31]: 78, [-30]: 86 };

const LUMEN_SIGNED = -21;

const makeHitRate = () => {
  const random = prng('metrics.hitRate');
  const rows = Array.from({ length: 60 }, (_, index) => {
    const day = index - 59;
    const progress = index / 59;
    const okapi = OKAPI_RECOVERY[day] ?? 92 + jitter(random, 2);
    const lumen = day < LUMEN_SIGNED ? undefined : 80 - 30 * Math.exp((LUMEN_SIGNED - day) / 4) + jitter(random, 2);
    return [
      day,
      round(88 + jitter(random, 2)),
      round(45 + 25 * progress + jitter(random, 3)),
      round(okapi),
      lumen === undefined ? undefined : round(lumen),
    ];
  });
  return makeChartSheet({
    key: 'hitRate',
    name: 'Cache hit rate, last 60 days',
    header: ['Day', 'Northpine', 'Meridian', 'Okapi', 'Lumen'],
    rows,
    chart: { type: 'xy' },
  });
};

const skewTowardSmall = (random: Random): number => random() ** 1.3;

const AGENT_PROFILES = [
  { agent: 'Builder', tokensK: [150, 700], minutesPerK: 0.06, setupMinutes: [3, 8] },
  { agent: 'Reviewer', tokensK: [80, 450], minutesPerK: 0.03, setupMinutes: [2, 6] },
  { agent: 'Triage', tokensK: [5, 120], minutesPerK: 0.05, setupMinutes: [4, 26] },
  { agent: 'Scribe', tokensK: [100, 650], minutesPerK: 0.01, setupMinutes: [0.5, 2] },
] as const;

const makeAgentRuns = () => {
  const random = prng('metrics.agentRuns');
  const rows = AGENT_PROFILES.flatMap(
    ({ tokensK: [min, max], minutesPerK, setupMinutes: [setupMin, setupMax] }, column) =>
      Array.from({ length: 50 }, () => {
        const tokens = Math.round(min + (max - min) * skewTowardSmall(random));
        const setup = setupMin + (setupMax - setupMin) * random();
        const minutes = Math.max(0.2, (setup + tokens * minutesPerK) * (1 + 0.15 * normal(random)));
        return [tokens, ...AGENT_PROFILES.map((_, index) => (index === column ? round(minutes) : undefined))];
      }),
  );
  return makeChartSheet({
    key: 'agentRuns',
    name: 'Agent runs',
    header: ['Tokens (k)', ...AGENT_PROFILES.map(({ agent }) => agent)],
    rows,
    chart: { type: 'scatter' },
  });
};

const BUILD_PROFILES = [
  { customer: 'Okapi', hitRate: 80, spread: 9, minutes: 32, slope: -0.45, noise: 3 },
  { customer: 'Northpine', hitRate: 62, spread: 9, minutes: 20, slope: -0.3, noise: 2.5 },
  { customer: 'Meridian', hitRate: 45, spread: 9, minutes: 10, slope: -0.15, noise: 1.5 },
] as const;

const makeBuildTimes = () => {
  const random = prng('metrics.buildTimes');
  const rows = BUILD_PROFILES.flatMap(({ hitRate: centre, spread, minutes, slope, noise }, column) =>
    Array.from({ length: 40 }, () => {
      const hitRate = round(Math.min(99, centre + spread * normal(random)));
      const duration = Math.max(1, minutes + slope * (hitRate - centre) + noise * normal(random));
      return [hitRate, ...BUILD_PROFILES.map((_, index) => (index === column ? round(duration) : undefined))];
    }),
  );
  return makeChartSheet({
    key: 'buildTimes',
    name: 'Build time vs. cache hit rate',
    header: ['Cache hit rate (%)', ...BUILD_PROFILES.map(({ customer }) => customer)],
    rows,
    chart: { type: 'scatter', regression: true },
  });
};

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const HOURS = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, '0'));

const bump = (hour: number, centre: number, width: number) => Math.exp(-(((hour - centre) / width) ** 2));

const makeRequestHeatmap = () => {
  const random = prng('metrics.requestHeatmap');
  const rows = DAYS.map((day, index) => {
    const weekday = index < 5 ? 1 : 0.2;
    return [
      day,
      ...HOURS.map((_, hour) => {
        const people = 120 * bump(hour, 12, 3.5) + 100 * bump(hour, 18.5, 3);
        const nightlyCi = hour === 2 ? 90 : 0;
        return Math.round(20 + weekday * people + nightlyCi + jitter(random, 6));
      }),
    ];
  });
  return makeChartSheet({
    key: 'requestHeatmap',
    name: 'Cache requests by weekday and hour (UTC)',
    header: ['Day', ...HOURS],
    rows,
    chart: { type: 'heatmap' },
  });
};

const HEALTH = [
  ['Usage', 9, 3, 7, 4],
  ['Hit rate', 9, 6, 9, 7],
  ['Adoption', 8, 4, 7, 5],
  ['Satisfaction', 8, 7, 3, 9],
  ['Expansion', 7, 8, 4, 6],
  ['Engagement', 8, 6, 5, 9],
] as const;

const makeCustomerHealth = () =>
  makeChartSheet({
    key: 'customerHealth',
    name: 'Customer health',
    header: ['Measure', 'Northpine', 'Meridian', 'Okapi', 'Lumen'],
    rows: HEALTH,
    chart: { type: 'radar' },
  });

const COUNTRIES = [
  ['United States of America', 412],
  ['Germany', 168],
  ['United Kingdom', 141],
  ['Canada', 96],
  ['France', 84],
  ['Netherlands', 72],
  ['Japan', 64],
  ['India', 58],
  ['Spain', 41],
  ['Australia', 39],
  ['Portugal', 38],
  ['Poland', 36],
  ['Italy', 33],
  ['Switzerland', 31],
  ['South Korea', 29],
  ['Ireland', 27],
  ['Brazil', 26],
  ['Sweden', 24],
  ['Norway', 22],
  ['Denmark', 20],
  ['Israel', 19],
  ['Finland', 18],
  ['Austria', 15],
  ['Czechia', 14],
  ['Mexico', 12],
  ['Taiwan', 11],
  ['New Zealand', 9],
  ['Argentina', 8],
  ['South Africa', 7],
  ['Indonesia', 6],
] as const;

const makeRequestsByCountry = () =>
  makeChartSheet({
    key: 'requestsByCountry',
    name: 'Cache requests by country, last 30 days',
    header: ['Country', 'Requests (M)'],
    rows: COUNTRIES,
    chart: { type: 'map' },
    firstColumnSize: 220,
  });

export const makeSheets = Effect.fnUntraced(function* () {
  const sheets: Sheets = {
    hitRate: makeHitRate(),
    agentRuns: makeAgentRuns(),
    buildTimes: makeBuildTimes(),
    requestHeatmap: makeRequestHeatmap(),
    customerHealth: makeCustomerHealth(),
    requestsByCountry: makeRequestsByCountry(),
  };
  for (const sheet of Object.values(sheets)) {
    yield* Database.add(sheet);
  }
  return sheets;
});
