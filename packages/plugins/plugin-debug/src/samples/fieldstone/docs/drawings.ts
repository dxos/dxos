//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database } from '@dxos/echo';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as Tldraw from '@dxos/plugin-tldraw/Tldraw';
import * as TldrawModel from '@dxos/plugin-tldraw/TldrawModel';

export type DrawingKey = 'orgChart' | 'architectureDiagram' | 'requestFlow' | 'roadmap' | 'escalation';

export type Drawings = Record<DrawingKey, Drawing.Drawing>;

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

const makeOrgChart = () => {
  const builder = new TldrawModel.RecordBuilder().rectangle({
    id: 'astrid',
    x: 720,
    y: 0,
    w: 200,
    h: 90,
    text: 'Astrid Holm\nEngineering Manager',
    color: 'violet',
    fill: 'semi',
  });
  ORG_CHART_REPORTS.forEach(([id, text, color], index) => {
    builder.rectangle({ id, x: index * 180, y: 220, w: 160, h: 90, text, color, fill: 'semi', size: 's' });
    builder.arrow({ from: 'astrid', to: id });
  });
  return builder
    .arrow({ from: 'omar', to: 'hana', text: 'onboarding buddy', dash: 'dashed', color: 'grey' })
    .text({ id: 'note', x: 0, y: 360, w: 600, text: 'Everyone reports to Astrid. Engineering in blue.', size: 's' })
    .build();
};

const makeArchitectureDiagram = () =>
  new TldrawModel.RecordBuilder()
    .rectangle({ id: 'cli', x: 0, y: 160, w: 180, h: 90, text: 'Cairn CLI\n(CI runners, laptops)', color: 'black' })
    .rectangle({
      id: 'edge',
      x: 260,
      y: 160,
      w: 180,
      h: 90,
      text: 'Edge gateway\nCloudflare Workers',
      color: 'orange',
      fill: 'semi',
    })
    .rectangle({ id: 'auth', x: 260, y: 0, w: 180, h: 80, text: 'Auth\ntokens, SSO', color: 'violet', fill: 'semi' })
    .rectangle({
      id: 'index',
      x: 520,
      y: 160,
      w: 180,
      h: 90,
      text: 'Index service\nkey → digest',
      color: 'blue',
      fill: 'semi',
    })
    .rectangle({ id: 'meter', x: 520, y: 0, w: 180, h: 80, text: 'Usage meter', color: 'green', fill: 'semi' })
    .rectangle({ id: 'dashboard', x: 0, y: 0, w: 180, h: 80, text: 'Dashboard\nComposer plugin', color: 'black' })
    .ellipse({ id: 'postgres', x: 780, y: 160, w: 170, h: 90, text: 'Postgres\nAWS RDS', color: 'blue' })
    .ellipse({ id: 'r2', x: 260, y: 340, w: 180, h: 90, text: 'R2\nhot blobs', color: 'orange' })
    .ellipse({ id: 's3', x: 520, y: 340, w: 180, h: 90, text: 'S3\norigin, cold blobs', color: 'yellow' })
    .ellipse({ id: 'stripe', x: 780, y: 0, w: 170, h: 80, text: 'Stripe', color: 'green' })
    .arrow({ from: 'cli', to: 'edge', text: 'HTTPS' })
    .arrow({ from: 'dashboard', to: 'edge' })
    .arrow({ from: 'edge', to: 'auth' })
    .arrow({ from: 'edge', to: 'index' })
    .arrow({ from: 'index', to: 'postgres' })
    .arrow({ from: 'edge', to: 'r2', text: 'presigned GET/PUT' })
    .arrow({ from: 'r2', to: 's3', text: 'miss fill', dash: 'dashed' })
    .arrow({ from: 'index', to: 'meter', text: 'bytes served' })
    .arrow({ from: 'meter', to: 'stripe', text: 'metered usage' })
    .build();

const makeRequestFlow = () => {
  const steps = [
    ['cli', 'Cairn CLI\nhash inputs → action key', 'black'],
    ['edge', 'Edge worker\nverify token', 'orange'],
    ['index', 'Index\nlook up key', 'blue'],
    ['r2', 'R2\nserve blob', 'orange'],
    ['verify', 'CLI\nverify digest, restore', 'black'],
  ] as const;
  const builder = new TldrawModel.RecordBuilder();
  steps.forEach(([id, text, color], index) => {
    builder.rectangle({ id, x: index * 230, y: 0, w: 180, h: 90, text, color, fill: 'semi' });
  });
  return builder
    .arrow({ from: 'cli', to: 'edge', text: '1 GET /v2/cache/:key' })
    .arrow({ from: 'edge', to: 'index', text: '2 lookup' })
    .arrow({ from: 'index', to: 'r2', text: '3 hit: presign' })
    .arrow({ from: 'r2', to: 'verify', text: '4 bytes' })
    .rectangle({
      id: 'build',
      x: 230,
      y: 200,
      w: 180,
      h: 90,
      text: 'Miss: CLI builds\nlocally',
      color: 'red',
      fill: 'semi',
    })
    .rectangle({
      id: 'commit',
      x: 460,
      y: 200,
      w: 180,
      h: 90,
      text: 'PUT blob, then\ncompare-and-set key',
      color: 'red',
      fill: 'semi',
    })
    .arrow({ from: 'index', to: 'build', text: 'miss', dash: 'dashed' })
    .arrow({ from: 'build', to: 'commit' })
    .build();
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

const makeRoadmap = (now: Date) => {
  const LANE_H = 90;
  const DAY_W = 10;
  const quarter = Math.floor(now.getUTCMonth() / 3) * 3;
  const start = Date.UTC(now.getUTCFullYear(), quarter, 1);
  const end = Date.UTC(now.getUTCFullYear(), quarter + 3, 1);
  const x = (time: number) => 180 + ((Math.min(Math.max(time, start), end) - start) / DAY_MS) * DAY_W;
  const builder = new TldrawModel.RecordBuilder();
  for (let index = 0; index < 3; index++) {
    const month = new Date(Date.UTC(now.getUTCFullYear(), quarter + index, 1));
    builder.text({
      id: `month-${index}`,
      x: x(month.getTime()),
      y: 0,
      w: 200,
      text: month.toLocaleDateString('en-GB', { timeZone: 'UTC', month: 'long' }),
    });
  }
  builder.line({
    id: 'today',
    start: { x: x(now.getTime()), y: 40 },
    end: { x: x(now.getTime()), y: 520 },
    color: 'red',
    dash: 'dashed',
  });
  ROADMAP_LANES.forEach(([id, label, color, bars], lane) => {
    const y = 60 + lane * (LANE_H + 20);
    builder.rectangle({ id: `lane-${id}`, x: 0, y, w: 160, h: LANE_H, text: label, color: 'grey', fill: 'semi' });
    bars.forEach(([text, from, to], bar) => {
      const left = x(now.getTime() + from * DAY_MS);
      builder.rectangle({
        id: `${id}-${bar}`,
        x: left,
        y: y + 15,
        w: Math.max(x(now.getTime() + to * DAY_MS) - left, 40),
        h: LANE_H - 30,
        text,
        color,
        fill: 'solid',
        size: 's',
      });
    });
  });
  return builder.build();
};

const makeEscalation = () =>
  new TldrawModel.RecordBuilder()
    .rectangle({ id: 'alert', x: 0, y: 0, w: 180, h: 80, text: 'Datadog monitor fires', color: 'red', fill: 'semi' })
    .rectangle({
      id: 'primary',
      x: 240,
      y: 0,
      w: 180,
      h: 80,
      text: 'Primary on-call\nack in 15 min',
      color: 'orange',
      fill: 'semi',
    })
    .geo('diamond', { id: 'sev', x: 480, y: -20, w: 160, h: 120, text: 'SEV1?', color: 'black' })
    .rectangle({ id: 'secondary', x: 240, y: 180, w: 180, h: 80, text: 'Secondary: Omar\nif no ack', color: 'orange' })
    .rectangle({
      id: 'ic',
      x: 700,
      y: 0,
      w: 180,
      h: 80,
      text: 'Astrid takes\nincident command',
      color: 'violet',
      fill: 'semi',
    })
    .rectangle({
      id: 'comms',
      x: 700,
      y: 180,
      w: 180,
      h: 80,
      text: 'Lucía: status page,\ncustomer email',
      color: 'green',
      fill: 'semi',
    })
    .rectangle({ id: 'vendor', x: 940, y: 0, w: 180, h: 80, text: 'Vendor support\nAWS, Cloudflare', color: 'grey' })
    .arrow({ from: 'alert', to: 'primary' })
    .arrow({ from: 'primary', to: 'secondary', text: '15 min', dash: 'dashed' })
    .arrow({ from: 'primary', to: 'sev' })
    .arrow({ from: 'sev', to: 'ic', text: 'yes' })
    .arrow({ from: 'ic', to: 'comms' })
    .arrow({ from: 'ic', to: 'vendor', text: 'provider fault' })
    .build();

const drawing = (name: string, content: TldrawModel.CanvasContent) =>
  Drawing.make({ name, canvas: Drawing.makeCanvas({ schema: Tldraw.TLDRAW_SCHEMA, content }) });

/** The five tldraw drawings the handbook and planning documents embed. Spec: `CONTENT.md` § Drawings. */
export const makeDrawings = Effect.fnUntraced(function* () {
  const { now } = yield* SampleSpace.Clock;
  const quarter = Math.floor(now.getUTCMonth() / 3) + 1;
  const drawings: Drawings = {
    orgChart: drawing('Alien Labs org chart', makeOrgChart()),
    architectureDiagram: drawing('Cairn architecture', makeArchitectureDiagram()),
    requestFlow: drawing('Cache request flow', makeRequestFlow()),
    roadmap: drawing(`Q${quarter} roadmap timeline`, makeRoadmap(now)),
    escalation: drawing('On-call escalation', makeEscalation()),
  };
  for (const object of Object.values(drawings)) {
    yield* Database.add(object);
  }
  return drawings;
});
