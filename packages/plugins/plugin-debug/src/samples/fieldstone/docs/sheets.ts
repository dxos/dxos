//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database } from '@dxos/echo';
import * as Sheet from '@dxos/plugin-sheet/Sheet';
import * as SheetRange from '@dxos/plugin-sheet/SheetRange';

export type SheetKey = 'pricing' | 'vendorSpend' | 'cloudCost' | 'incidentTimeline' | 'hiring';

export type Sheets = Record<SheetKey, Sheet.Sheet>;

type Cells = Record<string, { value: string | number }>;

const COLUMNS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Writes `rows` into cells from `A<start>`, one array per row. */
const table = (rows: ReadonlyArray<ReadonlyArray<string | number | undefined>>, start = 1): Cells =>
  Object.fromEntries(
    rows.flatMap((row, r) =>
      row.flatMap((value, c) => (value === undefined ? [] : [[`${COLUMNS[c]}${start + r}`, { value }]])),
    ),
  );

const monthLabel = (date: Date, offset: number): string => {
  const month = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offset, 1));
  return month.toLocaleDateString('en-GB', { timeZone: 'UTC', month: 'short', year: 'numeric' });
};

/** A `DATE()` formula, so the sheet stores a date it can subtract rather than a string. */
const dateFormula = (iso: string): string => {
  const date = new Date(iso);
  return `=DATE(${date.getUTCFullYear()},${date.getUTCMonth() + 1},${date.getUTCDate()})`;
};

const makePricing = () => {
  const cells = table([
    ['Tier', 'Base / month', 'Included GB', 'Overage / GB', 'Typical GB', 'Monthly price'],
    ['Free', 0, 10, 0, 8, '=B2+MAX(0,E2-C2)*D2'],
    ['Team', 99, 250, 0.08, 400, '=B3+MAX(0,E3-C3)*D3'],
    ['Business', 499, 2000, 0.06, 3500, '=B4+MAX(0,E4-C4)*D4'],
    ['Enterprise', 2400, 15000, 0.04, 22000, '=B5+MAX(0,E5-C5)*D5'],
  ]);
  return Sheet.make({
    name: 'Cairn plans',
    rows: 5,
    columns: 6,
    cells,
    ranges: SheetRange.headerRanges(cells, 'A1:F1'),
  });
};

// R2 took over hot-blob serving three months before the reference date, which is where the Cloudflare line flattens.
const VENDOR_SPEND = [
  ['GitHub', 410, 410, 430, 430, 450, 450, 450, 470, 470, 490, 490, 510],
  ['Stripe', 290, 310, 330, 360, 380, 410, 450, 480, 520, 560, 610, 650],
  ['Cloudflare', 10400, 10700, 11020, 11540, 11950, 12480, 13100, 13620, 13500, 14000, 14600, 15200],
] as const;

const makeVendorSpend = (now: Date) => {
  const months = Array.from({ length: 12 }, (_, index) => monthLabel(now, index - 11));
  const vendorRows = VENDOR_SPEND.map(([vendor, ...spend], index) => [
    vendor,
    ...spend,
    `=SUM(B${index + 2}:M${index + 2})`,
  ]);
  const totalRow = [
    'Total',
    ...Array.from({ length: 13 }, (_, index) => `=SUM(${COLUMNS[index + 1]}2:${COLUMNS[index + 1]}4)`),
  ];

  const cells = table([['Vendor', ...months, 'Total'], ...vendorRows, totalRow]);
  return Sheet.make({
    name: 'Vendor spend, last 12 months',
    rows: 5,
    columns: 14,
    cells,
    ranges: SheetRange.headerRanges(cells, 'A1:N1'),
  });
};

const makeCloudCost = (now: Date) => {
  const cells = {
    ...table([
      ['Month', 'Compute and S3', 'Workers and R2', 'Total'],
      [`${monthLabel(now, 0)} (actual)`, 12700, 2500, '=B2+C2'],
      ...Array.from({ length: 6 }, (_, index) => {
        const row = index + 3;
        return [monthLabel(now, index + 1), `=B${row - 1}*(1+G2)`, `=C${row - 1}*(1+G3)`, `=B${row}+C${row}`];
      }),
      ['Next 6 months', '=SUM(B3:B8)', '=SUM(C3:C8)', '=SUM(D3:D8)'],
    ]),
    F1: { value: 'Growth / month' },
    F2: { value: 'Compute and S3' },
    G2: { value: 0.03 },
    F3: { value: 'Workers and R2' },
    G3: { value: 0.08 },
  };
  return Sheet.make({
    name: 'Cloud cost forecast',
    rows: 9,
    columns: 7,
    cells,
    ranges: [...SheetRange.headerRanges(cells, 'A1:D1'), ...SheetRange.headerRanges(cells, 'F1:G1')],
  });
};

// Minutes after detection; detection is Okapi's first report, five weeks before the reference date.
const INCIDENT_ROWS = [
  [0, 'Okapi CI reports a SHA-256 mismatch restoring ledger-svc test binaries', 'Sam Reyes (Okapi)'],
  [7, 'Page acknowledged, SEV2 opened', 'Anika'],
  [18, 'Reproduced: two writers raced on one action key; index points at blob B, R2 holds bytes from A', 'Omar'],
  [26, 'Raised to SEV1, Astrid takes incident command', 'Astrid'],
  [34, "Okapi's namespace switched to read-only", 'Anika'],
  [41, 'Status page updated, Okapi told to bypass the remote cache', 'Lucía'],
  [55, "Index audit finds 214 keys with mismatched digests in Okapi's namespace", 'Felix'],
  [70, 'Affected keys purged from the index and R2', 'Felix'],
  [95, 'Okapi rebuilds with --no-remote-cache; release candidate is clean', 'Sam Reyes (Okapi)'],
  [130, 'Hotfix written: index commit becomes compare-and-set on the content digest', 'Omar'],
  [190, 'Hotfix deployed to the edge workers and the index service', 'Anika'],
  [205, "Writes re-enabled for Okapi's namespace", 'Anika'],
  [240, 'Mitigated; SEV1 downgraded to monitoring', 'Astrid'],
  [1440, 'Fleet-wide audit: 3 other orgs had colliding writes, none restored corrupt bytes', 'Felix'],
  [1620, 'Call with Nadia and Sam: timeline, impact, next steps', 'Astrid'],
  [2880, 'Root cause: the CLI left the CC toolchain variable out of the action key', 'Omar'],
  [4320, 'Concurrent-writer regression test lands in CI', 'Felix'],
  [7200, 'CLI 1.7.3 ships: toolchain env in the key, digest verified on every restore', 'Omar'],
  [12960, 'Postmortem draft shared with Okapi', 'Astrid'],
  [14400, 'Postmortem review held; incident closed', 'Astrid'],
] as const;

const makeIncidentTimeline = (detected: Date) => {
  const time = (minutes: number) =>
    new Date(detected.getTime() + minutes * 60_000).toISOString().slice(0, 16).replace('T', ' ');
  const rows = INCIDENT_ROWS.map(([minutes, event, owner], index) => [
    minutes,
    time(minutes),
    event,
    owner,
    `=A${index + 2}/60`,
  ]);
  const cells = {
    ...table([['T+ minutes', 'Time (UTC)', 'Event', 'Owner', 'Hours since detection'], ...rows]),
    C23: { value: 'Days to close' },
    E23: { value: '=A21/1440' },
  };
  return Sheet.make({
    name: 'Okapi incident timeline',
    rows: 23,
    columns: 5,
    cells,
    ranges: SheetRange.headerRanges(cells, 'A1:E1'),
  });
};

const makeHiring = (clock: SampleSpace.Clock['Service']) => {
  const roles = [
    ['Senior Backend Engineer, cache engine', 'Astrid', 'Onsite', 62, 4],
    ['Site Reliability Engineer', 'Astrid', 'Offer', 80, 1],
    ['Solutions Engineer', 'Lucía', 'Phone screen', 30, 9],
    ['Frontend Engineer', 'Astrid', 'Take-home', 45, 3],
    ['Developer Advocate, EU', 'Lucía', 'Sourcing', 12, 14],
  ] as const;
  const cells = {
    ...table([
      ['Role', 'Hiring manager', 'Stage', 'Opened', 'Days open', 'Candidates'],
      ...roles.map(([role, manager, stage, daysAgo, candidates], index) => [
        role,
        manager,
        stage,
        dateFormula(clock.daysAgo(daysAgo)),
        `=H1-D${index + 2}`,
        candidates,
      ]),
    ]),
    G1: { value: 'As of' },
    H1: { value: dateFormula(clock.now.toISOString()) },
  };
  return Sheet.make({
    name: 'Open roles',
    rows: 6,
    columns: 8,
    cells,
    ranges: [...SheetRange.headerRanges(cells, 'A1:F1'), { range: 'G1', key: SheetRange.styleKey, value: 'header' }],
  });
};

/** The five sheets the planning and incident documents embed. Spec: `CONTENT.md` § Sheets. */
export const makeSheets = Effect.fnUntraced(function* () {
  const clock = yield* SampleSpace.Clock;
  const detected = new Date(clock.daysAgo(35, 14));
  detected.setUTCMinutes(5);
  const sheets: Sheets = {
    pricing: makePricing(),
    vendorSpend: makeVendorSpend(clock.now),
    cloudCost: makeCloudCost(clock.now),
    incidentTimeline: makeIncidentTimeline(detected),
    hiring: makeHiring(clock),
  };
  for (const sheet of Object.values(sheets)) {
    yield* Database.add(sheet);
  }
  return sheets;
});
