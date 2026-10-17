//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database } from '@dxos/echo';
import * as Architecture from '@dxos/plugin-canvas/Architecture';
import type * as Drawing from '@dxos/plugin-illustrator/Drawing';

export type DrawingKey = 'orgChart' | 'architectureDiagram' | 'requestFlow' | 'roadmap' | 'escalation';

export type Drawings = Record<DrawingKey, Drawing.Drawing>;

type Commands = Architecture.CompiledDiagrams[string];
type Element = Extract<Commands[number], { op: 'upsert-object' }>['object']['elements'][number];
type Box = Extract<Element, { kind: 'rect' | 'ellipse' | 'diamond' | 'triangle' }>;
type Arrow = Extract<Element, { kind: 'arrow' }>;
type Style = Pick<Box, 'color' | 'fill' | 'stroke' | 'weight'>;

const rect = (id: string, x: number, y: number, w: number, h: number, text: string, style: Style = {}): Element => ({
  kind: 'rect',
  id,
  x,
  y,
  w,
  h,
  text,
  ...style,
});

const ellipse = (id: string, x: number, y: number, w: number, h: number, text: string, style: Style = {}): Element => ({
  kind: 'ellipse',
  id,
  x,
  y,
  w,
  h,
  text,
  ...style,
});

const arrow = (from: string, to: string, options: Pick<Arrow, 'text' | 'stroke' | 'color'> = {}): Element => ({
  kind: 'arrow',
  id: `${from}-${to}`,
  from,
  to,
  ...options,
});

const label = (id: string, x: number, y: number, text: string, w?: number): Element => ({
  kind: 'text',
  id,
  x,
  y,
  text,
  weight: 's',
  ...(w ? { w } : {}),
});

/** A drawing is one scene object at the canvas origin; arrows bind to its boxes by element id. */
const scene = (elements: Element[]): Commands => [
  { op: 'upsert-object', object: { id: 'drawing', origin: { x: 0, y: 0 }, scale: 1, elements } },
];

const ORG_CHART_REPORTS = [
  ['omar', 'Omar Haddad\nStaff Engineer, cache engine', 'blue'],
  ['felix', 'Felix Andersen\nBackend, cache engine', 'blue'],
  ['hana', 'Hana Sato\nSoftware Engineer', 'blue'],
  ['june', 'June Okonkwo\nAPI and billing', 'blue'],
  ['tomas', 'Tomás Vidal\nFrontend', 'blue'],
  ['anika', 'Anika Rao\nSRE', 'blue'],
  ['lucia', 'Lucía Ferreira\nProduct', 'green'],
  ['ben', 'Ben Achterberg\nDesign', 'green'],
  ['kofi', 'Kofi Mensah\nDeveloper Relations', 'green'],
] as const;

const makeOrgChart = () =>
  scene([
    rect('astrid', 720, 0, 200, 90, 'Astrid Holm\nEngineering Manager', { color: 'violet' }),
    ...ORG_CHART_REPORTS.flatMap(([id, text, color], index) => [
      rect(id, index * 180, 220, 160, 90, text, { color }),
      arrow('astrid', id),
    ]),
    arrow('omar', 'hana', { text: 'onboarding buddy', stroke: 'dashed', color: 'grey' }),
    label('note', 0, 360, 'Everyone reports to Astrid. Engineering in blue.', 600),
  ]);

const makeArchitectureDiagram = () =>
  scene([
    rect('cli', 0, 160, 180, 90, 'Cairn CLI\n(CI runners, laptops)', { color: 'black' }),
    rect('edge', 260, 160, 180, 90, 'Edge gateway\nCloudflare Workers', { color: 'orange' }),
    rect('auth', 260, 0, 180, 80, 'Auth\ntokens, SSO', { color: 'violet' }),
    rect('index', 520, 160, 180, 90, 'Index service\nkey → digest', { color: 'blue' }),
    rect('meter', 520, 0, 180, 80, 'Usage meter', { color: 'green' }),
    rect('dashboard', 0, 0, 180, 80, 'Dashboard\nComposer plugin', { color: 'black' }),
    ellipse('postgres', 780, 160, 170, 90, 'Postgres\nvia Hyperdrive', { color: 'blue' }),
    ellipse('r2', 260, 340, 180, 90, 'R2\nhot blobs', { color: 'orange' }),
    ellipse('s3', 520, 340, 180, 90, 'S3\norigin, cold blobs', { color: 'yellow' }),
    ellipse('stripe', 780, 0, 170, 80, 'Stripe', { color: 'green' }),
    arrow('cli', 'edge', { text: 'HTTPS' }),
    arrow('dashboard', 'edge'),
    arrow('edge', 'auth'),
    arrow('edge', 'index'),
    arrow('index', 'postgres'),
    arrow('edge', 'r2', { text: 'presigned GET/PUT' }),
    arrow('r2', 's3', { text: 'miss fill', stroke: 'dashed' }),
    arrow('index', 'meter', { text: 'bytes served' }),
    arrow('meter', 'stripe', { text: 'metered usage' }),
  ]);

const REQUEST_STEPS = [
  ['cli', 'Cairn CLI\nhash inputs → action key', 'black'],
  ['edge', 'Edge worker\nverify token', 'orange'],
  ['index', 'Index\nlook up key', 'blue'],
  ['r2', 'R2\nserve blob', 'orange'],
  ['verify', 'CLI\nverify digest, restore', 'black'],
] as const;

const makeRequestFlow = () =>
  scene([
    ...REQUEST_STEPS.map(([id, text, color], index) => rect(id, index * 230, 0, 180, 90, text, { color })),
    arrow('cli', 'edge', { text: '1 GET /v2/cache/:key' }),
    arrow('edge', 'index', { text: '2 lookup' }),
    arrow('index', 'r2', { text: '3 hit: presign' }),
    arrow('r2', 'verify', { text: '4 bytes' }),
    rect('build', 230, 200, 180, 90, 'Miss: CLI builds\nlocally', { color: 'red' }),
    rect('commit', 460, 200, 180, 90, 'PUT blob, then\ncompare-and-set key', { color: 'red' }),
    arrow('index', 'build', { text: 'miss', stroke: 'dashed' }),
    arrow('build', 'commit'),
  ]);

// Bars are [label, start, end] in days from the reference date, clipped to the quarter.
const ROADMAP_LANES = [
  [
    'cache',
    'Cairn 1.8',
    'blue',
    [
      ['Remote cache v2 beta', -40, 2],
      ['1.8 GA', 2, 20],
    ],
  ],
  [
    'billing',
    'Billing',
    'green',
    [
      ['Stripe metering shadow', -20, 15],
      ['Usage invoices live', 15, 45],
    ],
  ],
  [
    'soc2',
    'SOC 2',
    'violet',
    [
      ['Policies and controls', -30, 25],
      ['Type I audit', 30, 70],
    ],
  ],
  [
    'offsite',
    'Offsite',
    'orange',
    [
      ['Planning', -30, 37],
      ['Saltmarsh Lodge', 38, 41],
    ],
  ],
] as const;

const DAY_MS = 86_400_000;

const makeRoadmap = (now: Date) => {
  const LANE_H = 90;
  const DAY_W = 10;
  const quarter = Math.floor(now.getUTCMonth() / 3) * 3;
  const start = Date.UTC(now.getUTCFullYear(), quarter, 1);
  const end = Date.UTC(now.getUTCFullYear(), quarter + 3, 1);
  const x = (time: number) => 180 + ((Math.min(Math.max(time, start), end) - start) / DAY_MS) * DAY_W;
  const months = [0, 1, 2].map((index) => {
    const month = new Date(Date.UTC(now.getUTCFullYear(), quarter + index, 1));
    return label(
      `month-${index}`,
      x(month.getTime()),
      0,
      month.toLocaleDateString('en-GB', { timeZone: 'UTC', month: 'long' }),
      200,
    );
  });
  // The canvas has no free lines, so the reference date is a hairline box.
  const today = rect('today', x(now.getTime()) - 1, 40, 2, 480, '', { color: 'red', fill: 'solid', stroke: 'dashed' });
  const lanes = ROADMAP_LANES.flatMap(([id, name, color, bars], lane) => {
    const y = 60 + lane * (LANE_H + 20);
    return [
      rect(`lane-${id}`, 0, y, 160, LANE_H, name, { color: 'grey' }),
      ...bars.map(([text, from, to], bar) => {
        const left = x(now.getTime() + from * DAY_MS);
        const width = Math.max(x(now.getTime() + to * DAY_MS) - left, 40);
        return rect(`${id}-${bar}`, left, y + 15, width, LANE_H - 30, text, { color, fill: 'solid', weight: 's' });
      }),
    ];
  });
  return scene([...months, ...lanes, today]);
};

const makeEscalation = () =>
  scene([
    rect('alert', 0, 0, 180, 80, 'PostHog alert fires', { color: 'red' }),
    rect('primary', 240, 0, 180, 80, 'Primary on-call\nack in 15 min', { color: 'orange' }),
    { kind: 'diamond', id: 'sev', x: 480, y: -20, w: 160, h: 120, text: 'SEV1?', color: 'black' },
    rect('secondary', 240, 180, 180, 80, 'Secondary: Omar\nif no ack', { color: 'orange' }),
    rect('ic', 700, 0, 180, 80, 'Astrid takes\nincident command', { color: 'violet' }),
    rect('comms', 700, 180, 180, 80, 'Lucía: status page,\ncustomer email', { color: 'green' }),
    rect('vendor', 940, 0, 180, 80, 'Vendor support\nCloudflare', { color: 'grey' }),
    arrow('alert', 'primary'),
    arrow('primary', 'secondary', { text: '15 min', stroke: 'dashed' }),
    arrow('primary', 'sev'),
    arrow('sev', 'ic', { text: 'yes' }),
    arrow('ic', 'comms'),
    arrow('ic', 'vendor', { text: 'provider fault' }),
  ]);

/** The five canvas drawings the handbook and planning documents embed. Spec: `CONTENT.md` § Drawings. */
export const makeDrawings = Effect.fnUntraced(function* () {
  const { db } = yield* Database.Service;
  const { now } = yield* SampleSpace.Clock;
  const quarter = Math.floor(now.getUTCMonth() / 3) + 1;
  const drawing = (name: string, commands: Commands) => Architecture.addCanvasDrawing(db, { name, commands });
  const drawings: Drawings = {
    orgChart: drawing('Alien Labs org chart', makeOrgChart()),
    architectureDiagram: drawing('Cairn architecture', makeArchitectureDiagram()),
    requestFlow: drawing('Cache request flow', makeRequestFlow()),
    roadmap: drawing(`Q${quarter} roadmap timeline`, makeRoadmap(now)),
    escalation: drawing('On-call escalation', makeEscalation()),
  };
  return drawings;
});
