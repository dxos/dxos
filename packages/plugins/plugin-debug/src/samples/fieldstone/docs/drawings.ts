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

export type Commands = Architecture.CompiledDiagrams[string];
type Element = Extract<Commands[number], { op: 'upsert-object' }>['object']['elements'][number];
type Box = Extract<Element, { kind: 'rect' | 'ellipse' | 'diamond' | 'triangle' }>;
type Arrow = Extract<Element, { kind: 'arrow' }>;
type Style = Pick<Box, 'color' | 'fill' | 'stroke' | 'weight'>;

/**
 * Every box of a drawing is this size, as the DXOS Architecture diagrams' boxes are: the canvas sets a box's label at
 * 24px on 32px lines (two minor grid units), so 128px holds three lines with a grid unit above and below.
 */
export const BOX = { w: 256, h: 128 };

/** The lines a box label may take. */
export const MAX_LINES = 3;

/** The canvas's line height for a box label, in scene px. */
export const LINE_HEIGHT = 32;

/** A box label's average glyph width at 24px, on the generous side; the label is padded a grid unit either side. */
const CHAR_W = 13;
const TEXT_PAD = 16;

/** A link caption's average glyph width at 14px, and the run it loses to its backdrop and the arrowheads. */
const CAPTION_CHAR_W = 8.5;
const CAPTION_CLEARANCE = 40;

/** The lines `text` wraps to in a box `width` wide, estimated by greedy word wrap; infinite when a word cannot fit. */
export const lineCount = (text: string, width: number): number => {
  const room = Math.floor((width - TEXT_PAD * 2) / CHAR_W);
  return text.split('\n').reduce((lines, paragraph) => {
    let count = 1;
    let used = 0;
    for (const word of paragraph.split(' ')) {
      const length = used === 0 ? word.length : used + 1 + word.length;
      if (used > 0 && length > room) {
        count++;
        used = word.length;
      } else {
        used = length;
      }
      // The canvas never breaks inside a word, so one wider than the box is clipped.
      if (used > room) {
        return Infinity;
      }
    }
    return lines + count;
  }, 0);
};

/** The horizontal run a link caption needs to show in full. */
export const captionRun = (text: string): number => Math.ceil(text.length * CAPTION_CHAR_W + CAPTION_CLEARANCE);

/** The narrowest width, on the minor grid, at which `text` wraps to at most {@link MAX_LINES} lines. */
const fitWidth = (text: string): number => {
  let width = 64;
  while (lineCount(text, width) > MAX_LINES) {
    width += 16;
  }
  return width;
};

type Shape = Box['kind'];

/** A grid of {@link BOX}-sized cells `gap` apart, so a drawing's boxes match and line up; ids double as arrow ends. */
const grid = (gap: { x: number; y: number }) => {
  const at = (col: number, row: number) => ({ x: col * (BOX.w + gap.x), y: row * (BOX.h + gap.y) });
  const box =
    (kind: Shape) =>
    (id: string, col: number, row: number, text: string, style: Style = {}): Element => ({
      kind,
      id,
      ...at(col, row),
      ...BOX,
      text,
      ...style,
    });
  return { at, rect: box('rect'), ellipse: box('ellipse'), diamond: box('diamond') };
};

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

// Omar and Hana sit side by side so the buddy link runs between them rather than through Felix.
const ORG_CHART_REPORTS = [
  ['omar', 'Omar Haddad\nStaff Engineer, cache engine', 'blue'],
  ['hana', 'Hana Sato\nSoftware Engineer', 'blue'],
  ['felix', 'Felix Andersen\nBackend, cache engine', 'blue'],
  ['june', 'June Okonkwo\nAPI and billing', 'blue'],
  ['tomas', 'Tomás Vidal\nFrontend', 'blue'],
  ['anika', 'Anika Rao\nSRE', 'blue'],
  ['lucia', 'Lucía Ferreira\nProduct', 'green'],
  ['ben', 'Ben Achterberg\nDesign', 'green'],
  ['kofi', 'Kofi Mensah\nDeveloper Relations', 'green'],
] as const;

const makeOrgChart = () => {
  const { at, rect } = grid({ x: 192, y: 128 });
  const middle = (ORG_CHART_REPORTS.length - 1) / 2;
  return scene([
    rect('astrid', middle, 0, 'Astrid Holm\nEngineering Manager', { color: 'violet' }),
    ...ORG_CHART_REPORTS.flatMap(([id, text, color], index) => [
      rect(id, index, 1, text, { color }),
      arrow('astrid', id),
    ]),
    arrow('omar', 'hana', { text: 'onboarding buddy', stroke: 'dashed', color: 'grey' }),
    label('note', 0, at(0, 2).y, 'Everyone reports to Astrid. Engineering in blue.', 600),
  ]);
};

const makeArchitectureDiagram = () => {
  const { rect, ellipse } = grid({ x: 160, y: 96 });
  return scene([
    rect('dashboard', 0, 0, 'Dashboard\nComposer plugin', { color: 'black' }),
    rect('auth', 1, 0, 'Auth\ntokens, SSO', { color: 'violet' }),
    rect('meter', 2, 0, 'Usage meter', { color: 'green' }),
    ellipse('stripe', 3, 0, 'Stripe', { color: 'green' }),
    rect('cli', 0, 1, 'Cairn CLI\n(CI runners, laptops)', { color: 'black' }),
    rect('edge', 1, 1, 'Edge gateway\nCloudflare Workers', { color: 'orange' }),
    rect('index', 2, 1, 'Index service\nkey -> digest', { color: 'blue' }),
    ellipse('postgres', 3, 1, 'Postgres\nvia Hyperdrive', { color: 'blue' }),
    ellipse('r2', 1, 2, 'R2\nhot blobs', { color: 'orange' }),
    ellipse('s3', 2, 2, 'S3\norigin, cold blobs', { color: 'yellow' }),
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
};

const REQUEST_STEPS = [
  ['cli', 'Cairn CLI\nhash inputs -> action key', 'black'],
  ['edge', 'Edge worker\nverify token', 'orange'],
  ['index', 'Index\nlook up key', 'blue'],
  ['r2', 'R2\nserve blob', 'orange'],
  ['verify', 'CLI\nverify digest, restore', 'black'],
] as const;

const makeRequestFlow = () => {
  const { rect } = grid({ x: 224, y: 96 });
  return scene([
    ...REQUEST_STEPS.map(([id, text, color], index) => rect(id, index, 0, text, { color })),
    arrow('cli', 'edge', { text: '1 GET /v2/cache/:key' }),
    arrow('edge', 'index', { text: '2 lookup' }),
    arrow('index', 'r2', { text: '3 hit: presign' }),
    arrow('r2', 'verify', { text: '4 bytes' }),
    rect('build', 1, 1, 'Miss: CLI builds\nlocally', { color: 'red' }),
    rect('commit', 2, 1, 'PUT blob, then\ncompare-and-set key', { color: 'red' }),
    arrow('index', 'build', { text: 'miss', stroke: 'dashed' }),
    arrow('build', 'commit'),
  ]);
};

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

/** The gap between lanes, and between a bar and the next in its lane. */
const ROADMAP_GAP = 16;

const makeRoadmap = (now: Date) => {
  const DAY_W = 10;
  const TOP = 48;
  const quarter = Math.floor(now.getUTCMonth() / 3) * 3;
  const start = Date.UTC(now.getUTCFullYear(), quarter, 1);
  const end = Date.UTC(now.getUTCFullYear(), quarter + 3, 1);
  const x = (time: number) =>
    BOX.w + ROADMAP_GAP * 2 + ((Math.min(Math.max(time, start), end) - start) / DAY_MS) * DAY_W;
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
  const lanesHeight = ROADMAP_LANES.length * (BOX.h + ROADMAP_GAP);
  // The canvas has no free lines, so the reference date is a hairline box.
  const today = {
    kind: 'rect',
    id: 'today',
    x: x(now.getTime()) - 1,
    y: TOP - 8,
    w: 2,
    h: lanesHeight + 8,
    text: '',
    color: 'red',
    fill: 'solid',
    stroke: 'dashed',
  } satisfies Element;
  const lanes = ROADMAP_LANES.flatMap(([id, name, color, bars], lane) => {
    const y = TOP + lane * (BOX.h + ROADMAP_GAP);
    // A bar is as wide as its dates, or as its label needs (a three-day offsite is a sliver), and starts clear of the
    // bar before it, so a widened bar does not cover its neighbour.
    let right = 0;
    return [
      { kind: 'rect', id: `lane-${id}`, x: 0, y, ...BOX, text: name, color: 'grey' } satisfies Element,
      ...bars.map(([text, from, to], bar): Element => {
        const left = Math.max(x(now.getTime() + from * DAY_MS), right === 0 ? 0 : right + ROADMAP_GAP);
        const width = Math.max(x(now.getTime() + to * DAY_MS) - left, fitWidth(text));
        right = left + width;
        return { kind: 'rect', id: `${id}-${bar}`, x: left, y, w: width, h: BOX.h, text, color, fill: 'solid' };
      }),
    ];
  });
  return scene([...months, ...lanes, today]);
};

const makeEscalation = () => {
  const { rect, diamond } = grid({ x: 160, y: 96 });
  return scene([
    rect('alert', 0, 0, 'PostHog alert fires', { color: 'red' }),
    rect('primary', 1, 0, 'Primary on-call\nack in 15 min', { color: 'orange' }),
    diamond('sev', 2, 0, 'SEV1?', { color: 'black' }),
    rect('secondary', 1, 1, 'Secondary: Omar\nif no ack', { color: 'orange' }),
    rect('ic', 3, 0, 'Astrid takes\nincident command', { color: 'violet' }),
    rect('comms', 3, 1, 'Lucía: status page,\ncustomer email', { color: 'green' }),
    rect('vendor', 4, 0, 'Vendor support\nCloudflare', { color: 'grey' }),
    arrow('alert', 'primary'),
    arrow('primary', 'secondary', { text: '15 min', stroke: 'dashed' }),
    arrow('primary', 'sev'),
    arrow('sev', 'ic', { text: 'yes' }),
    arrow('ic', 'comms'),
    arrow('ic', 'vendor', { text: 'provider fault' }),
  ]);
};

/** Each drawing's scene commands, the roadmap over `now`'s quarter. */
export const makeScenes = (now: Date): Record<DrawingKey, Commands> => ({
  orgChart: makeOrgChart(),
  architectureDiagram: makeArchitectureDiagram(),
  requestFlow: makeRequestFlow(),
  roadmap: makeRoadmap(now),
  escalation: makeEscalation(),
});

/** The five canvas drawings the handbook and planning documents embed. Spec: `CONTENT.md` § Drawings. */
export const makeDrawings = Effect.fnUntraced(function* () {
  const { db } = yield* Database.Service;
  const { now } = yield* SampleSpace.Clock;
  const quarter = Math.floor(now.getUTCMonth() / 3) + 1;
  const scenes = makeScenes(now);
  const drawing = (name: string, commands: Commands) => Architecture.addCanvasDrawing(db, { name, commands });
  const drawings: Drawings = {
    orgChart: drawing('Alien Labs org chart', scenes.orgChart),
    architectureDiagram: drawing('Cairn architecture', scenes.architectureDiagram),
    requestFlow: drawing('Cache request flow', scenes.requestFlow),
    roadmap: drawing(`Q${quarter} roadmap timeline`, scenes.roadmap),
    escalation: drawing('On-call escalation', scenes.escalation),
  };
  return drawings;
});
