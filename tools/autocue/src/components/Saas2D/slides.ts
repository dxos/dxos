//
// Copyright 2026 DXOS.org
//

// The SaaS story in 2D, one slide per scene of the echo3d presentation (`tools/autocue/showcase/echo3d/views.js`,
// `saas-short` scenario), timed by its holds so the Fry voice-over lands on the same beats. Every scene is a layout of
// one model (see STORYBOARD.md): elements keep their ids across scenes, name their parent, and links name the elements
// they join, so a cut moves the story's elements rather than swapping pictures.

import {
  type Camera,
  type CardPrim,
  type FlowPrim,
  type Frame,
  type LinkPrim,
  type Prim,
  type Slide,
  clamp,
  easeInOut,
  lerp,
  ramp,
} from './engine.ts';
import { HEIGHT, WIDTH, neu } from './theme.tsx';
import { PALETTE, ROLES } from './tokens.ts';

//
// Model.
//

/** A stable pseudo-random number in [0, 1) for a key, so layouts are the same every frame and every render. */
const hash = (value: string) => {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h = Math.imul(h ^ value.charCodeAt(i), 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
};

const TAU = Math.PI * 2;

const polar = (cx: number, cy: number, radius: number, angle: number): [number, number] => [
  cx + Math.cos(angle) * radius,
  cy + Math.sin(angle) * radius,
];

const TEAMS = [
  { id: 'Eng', color: ROLES.team, r: 52, at: [-22, -42] },
  { id: 'Sales', color: PALETTE.green, r: 40, at: [-48, 52] },
  { id: 'Ops', color: PALETTE.pink, r: 30, at: [58, 30] },
] as const;

const APPS = ['HubSpot', 'Workday', 'Google Workspace', 'Slack', 'Notion', 'Salesforce', 'Jira'];

const TEAM_APPS: Record<string, string[]> = {
  Eng: ['Slack', 'Jira', 'Notion'],
  Sales: ['Salesforce', 'HubSpot', 'Google Workspace'],
  Ops: ['Workday', 'Google Workspace', 'Slack'],
};

const TENANTS = 60;
const TENANT_COLOR = '#8fa3d9';
/** Your company takes this place in every ring of companies, on the left. */
const YOURS = TENANTS / 2;
const COMPETITORS = [11, 20, 49];
const VENDOR_DATA = 48;

const OBJECT_PALETTE = ['#4f8dff', '#3ccf6e', '#ff8a3d', '#a66bff', '#22c7c7', '#f2c230', '#ff5fa2', '#7fa3ff'];
const OBJECTS = 150;
const OBJECT_SPIN = 0.08;

const SPACES = [
  { id: 'Personal', at: [-42, -36], children: ['Notes', 'Inbox'] },
  { id: 'Company', at: [42, -36], children: ['Engineering', 'Sales', 'Ops'] },
  { id: 'Partners', at: [-42, 36], children: ['Cloudflare', 'Agency'] },
  { id: 'Customers', at: [42, 36], children: ['Acme', 'Globex', 'Initech'] },
] as const;
const SPACE_R = 30;
const COMPANY_SPACE = SPACES[1];

const ECHO_ZOOM = 3.4;
const OBJECTS_ZOOM = 15;

/** Your company's place in the ring of companies around the vendor, and the camera that comes to it. */
const YOURS_AT: [number, number] = [-400, 0];
const FRONTIER_AT: [number, number] = [-470, 20];
const FRONTIER_SCALE = 0.62;
const LAB_AT: [number, number] = [420, 20];

const camera = (zoom = 1, x = 0, y = 0): Camera => ({ x, y, zoom });

const label = (
  id: string,
  x: number,
  y: number,
  text: string,
  options: Partial<Extract<Prim, { kind: 'label' }>> = {},
): Prim => ({ kind: 'label', id, x, y, text, size: 24, ...options });

/** A link joining two elements; the engine places its ends on them every frame. */
const edge = (id: string, a: string, b: string, options: Partial<LinkPrim> = {}): LinkPrim => ({
  kind: 'link',
  id,
  x1: 0,
  y1: 0,
  x2: 0,
  y2: 0,
  a,
  b,
  ...options,
});

/** Data moving from `a` to `b` along their link. */
const flow = (
  id: string,
  a: string,
  b: string,
  phase: number,
  color: string,
  options: Partial<FlowPrim> = {},
): FlowPrim => ({
  kind: 'flow',
  id,
  x1: 0,
  y1: 0,
  x2: 0,
  y2: 0,
  a,
  b,
  phase,
  color,
  ...options,
});

//
// Building blocks, shared by the scenes that show the same part of the model.
//

const tenantAngle = (index: number) => Math.PI + ((index - YOURS) / TENANTS) * TAU;

/** The vendor's data dot at a company's angle: the company's own data, held by the vendor. */
const tenantData = (index: number) => {
  const dot = Math.round((((index - YOURS + TENANTS) % TENANTS) / TENANTS) * VENDOR_DATA) % VENDOR_DATA;
  return dot === 0 ? 'node:data-org' : `node:data-${dot}`;
};

/**
 * Every company as a ring around a holder (a vendor or a lab), linked to it; your company sits on the left. Companies
 * that appear grow out of yours (companies like yours), or, with `fromData`, out of their data in the vendor's ring once
 * it has formed (`delay`).
 */
const tenantRing = (
  cx: number,
  cy: number,
  radius: number,
  {
    holder,
    flows,
    t = 0,
    labels = true,
    spin = 0,
    fade = 1,
    fromData,
  }: {
    holder: string;
    flows?: boolean;
    t?: number;
    labels?: boolean;
    spin?: number;
    fade?: number;
    fromData?: { delay: number };
  },
): Prim[] => {
  const prims: Prim[] = [];
  for (let index = 0; index < TENANTS; index++) {
    const [x, y] = polar(cx, cy, radius, tenantAngle(index) + spin);
    const tenant = index === YOURS ? 'body:org' : `node:tenant-${index}`;
    if (index === YOURS) {
      prims.push(...yoursInRing(x, y, { labels, fade }));
    } else {
      prims.push({
        kind: 'node',
        id: `tenant-${index}`,
        x,
        y,
        r: 9,
        color: TENANT_COLOR,
        glow: -0.2,
        opacity: fade,
        ...(fromData ? { from: tenantData(index), delay: fromData.delay } : { from: 'body:org' }),
      });
    }
    prims.push(edge(`tenant-link-${index}`, tenant, holder, { opacity: 0.6, parent: tenant }));
    if (flows) {
      prims.push(
        flow(`tenant-flow-${index}`, tenant, holder, t * 0.35 + hash(`flow-${index}`), ROLES.data, {
          count: 1,
          size: 3.5,
          opacity: 0.8,
          parent: tenant,
        }),
      );
    }
  }
  return prims;
};

/** Your company as one small company among many: your teams' blue marks which one is yours. */
const yoursInRing = (x: number, y: number, { labels = true, fade = 1 } = {}): Prim[] => [
  { kind: 'body', id: 'org', x, y, r: 16, opacity: fade },
  {
    kind: 'node',
    id: 'your-teams',
    x,
    y,
    r: 9,
    role: 'team',
    parent: 'body:org',
    from: 'node:team-Eng',
    opacity: fade,
  },
  ...(labels ? [label('org-label', x - 34, y, 'Your company', { anchor: 'end', parent: 'body:org' })] : []),
];

/** Your company with its teams inside. */
const company = (cx: number, cy: number, scale: number, { teams = true, title = true } = {}): Prim[] => [
  { kind: 'body', id: 'org', x: cx, y: cy, r: 170 * scale },
  ...(title ? [label('org-label', cx, cy - 170 * scale - 32, 'Your company', { size: 30 })] : []),
  ...(teams
    ? TEAMS.flatMap(({ id, color, r, at }): Prim[] => [
        {
          kind: 'node',
          id: `team-${id}`,
          x: cx + at[0] * scale,
          y: cy + at[1] * scale,
          r: r * scale,
          color,
          parent: 'body:org',
          from: 'node:your-teams',
        },
        label(`team-label-${id}`, cx + at[0] * scale, cy + (at[1] - r) * scale - 14, id, {
          size: 17,
          weight: 500,
          parent: `node:team-${id}`,
        }),
      ])
    : []),
];

const appAt = (app: string, cx: number, cy: number, radius: number, spin = 0): [number, number] =>
  polar(cx, cy, radius, -Math.PI / 2 + (APPS.indexOf(app) / APPS.length) * TAU + spin);

/** The apps as chips around a centre: every app is another SaaS vendor, so the many grow out of the one. */
const appRing = (cx: number, cy: number, radius: number, { scale = 1, spin = 0 } = {}): Prim[] =>
  APPS.map((app): Prim => {
    const [x, y] = appAt(app, cx, cy, radius, spin);
    return { kind: 'chip', id: `app-${app}`, x, y, text: app, scale, from: 'body:vendor' };
  });

/** Your data, a share held by each app, on the app's inner side; it comes from the one dot the first vendor held. */
const appData = (cx: number, cy: number, radius: number, { inset = 52, spin = 0 } = {}): Prim[] =>
  APPS.map((app): Prim => {
    const [x, y] = appAt(app, cx, cy, radius - inset, spin);
    return {
      kind: 'node',
      id: `data-org-${app}`,
      x,
      y,
      r: 7,
      role: 'data',
      parent: `chip:app-${app}`,
      from: 'node:data-org',
    };
  });

/** Each team's links to the apps it works in, with data flowing when `t` is given. */
const teamLinks = (t?: number): Prim[] =>
  Object.entries(TEAM_APPS).flatMap(([team, apps]) =>
    apps.flatMap((app): Prim[] => {
      const [a, b] = [`node:team-${team}`, `chip:app-${app}`];
      const link = edge(`link-${team}-${app}`, a, b, { parent: a });
      if (t === undefined) {
        return [link];
      }
      const color = TEAMS.find((candidate) => candidate.id === team)?.color ?? neu.accent;
      return [
        link,
        flow(`flow-${team}-${app}`, a, b, t * 0.4 + hash(`${team}${app}`), color, { count: 2, size: 5, parent: a }),
      ];
    }),
  );

/** A frontier lab with its gold core of everyone's data. */
const lab = (x: number, y: number, r: number, { core = 0, title = true } = {}): Prim[] => [
  { kind: 'body', id: 'lab', x, y, r, role: 'lab' },
  ...(core > 0
    ? [
        { kind: 'node', id: 'lab-core', x, y, r: core, role: 'data', glow: 0.2, parent: 'body:lab' } satisfies Prim,
        label('lab-core-label', x, y, '“Metadata”', {
          size: Math.min(30, core / 4),
          weight: 600,
          parent: 'node:lab-core',
        }),
      ]
    : []),
  // With a core, the title sits in the body's rim, clear of the apps and companies orbiting outside.
  ...(title
    ? [
        label('lab-label', x, core > 0 ? y - (r + core) / 2 : y - r - 34, 'Frontier Labs', {
          size: 30,
          parent: 'body:lab',
        }),
      ]
    : []),
];

/** The objects of one space, as a flat disc turning slowly in the screen plane. */
const objectAt = (index: number, cx: number, cy: number, spin: number): [number, number] => {
  // A sunflower spiral packs the disc evenly; the outer objects sit a little further apart.
  const radius = 25 * Math.sqrt((index + 0.5) / OBJECTS);
  return polar(cx, cy, radius, index * 2.39996 + spin);
};

const OBJECT_COLOR = (index: number) => OBJECT_PALETTE[Math.floor(hash(`object-${index}`) * OBJECT_PALETTE.length)];

const objects = (spin: number, { dim = 1, picked = {} }: { dim?: number; picked?: Record<number, number> } = {}) => {
  const [cx, cy] = COMPANY_SPACE.at;
  const prims: Prim[] = [];
  for (let index = 0; index < OBJECTS; index++) {
    const [x, y] = objectAt(index, cx, cy, spin);
    const pick = picked[index];
    prims.push({
      kind: 'node',
      id: `object-${index}`,
      x,
      y,
      r: (0.55 + hash(`size-${index}`) * 0.45) * (pick ?? 1),
      color: OBJECT_COLOR(index),
      opacity: pick === undefined ? dim : 1,
      glow: pick === undefined ? 0 : 0.4,
      parent: `body:space-${COMPANY_SPACE.id}`,
    });
    // Sunflower neighbours differ by Fibonacci steps, so these links stay short.
    const next = index + 13;
    if (next < OBJECTS && hash(`link-${index}`) < 0.32) {
      prims.push(
        edge(`object-link-${index}`, `node:object-${index}`, `node:object-${next}`, {
          color: '#3a4560',
          opacity: 0.9,
          parent: `node:object-${index}`,
        }),
      );
    }
  }
  return prims;
};

/** The ECHO hypergraph in your data: four spaces, each holding its own nested spaces. */
const spaces = ({ subs = 1 } = {}): Prim[] =>
  SPACES.flatMap(({ id, at, children }): Prim[] => [
    { kind: 'body', id: `space-${id}`, x: at[0], y: at[1], r: SPACE_R, parent: 'node:hub' },
    label(`space-label-${id}`, at[0], at[1] - SPACE_R - 3.4, id, { size: 20, weight: 600, parent: `body:space-${id}` }),
    ...children.map((child, index): Prim => {
      const [x, y] = polar(
        at[0],
        at[1],
        children.length === 2 ? 11 : 12,
        (index / children.length) * TAU - Math.PI / 2 + hash(child),
      );
      return {
        kind: 'node',
        id: `sub-${child}`,
        x,
        y,
        r: 8.5,
        color: '#9aa6d6',
        glow: -0.2,
        opacity: subs,
        parent: `body:space-${id}`,
      };
    }),
  ]);

const echoTitle = (): Prim[] => [
  label('echo-title', 120, 500, 'ECHO', { screen: true, size: 72, weight: 700, anchor: 'start' }),
  label('echo-subtitle', 124, 560, 'HYPERGRAPH', {
    screen: true,
    size: 22,
    mono: true,
    anchor: 'start',
    color: neu.muted,
  }),
];

//
// The object cards of `object-created`, in screen pixels.
//

const card = (props: Omit<CardPrim, 'kind' | 'width' | 'now'>, t: number, appear: number): CardPrim => ({
  kind: 'card',
  width: 380,
  now: t,
  screen: true,
  ...props,
  opacity: ramp(t, appear, 0.5),
});

const objectCards = (t: number): CardPrim[] => [
  card(
    {
      id: 'card-update',
      x: 1460,
      y: 70,
      type: 'Document',
      title: 'Roadmap update',
      accent: true,
      rows: [
        ['Created by', 'Writer'],
        ['Linked to', 'Roadmap'],
        ['Status', 'Draft'],
      ],
      thread: [
        { who: 'Bob', color: PALETTE.pink, text: 'Looks good. Can it note the Auth dependency?', at: 1.6 },
        { who: 'Writer', bot: true, color: PALETTE.gold, text: 'Added Auth as a linked task, due Thursday.', at: 2.6 },
        { who: 'Alice', color: '#5b8def', text: 'Share it with Sales before Friday.', at: 3.6 },
        { who: 'Planner', bot: true, color: '#a07cf0', text: 'Shared with Sales; review set for Friday.', at: 4.6 },
      ],
    },
    t,
    0.8,
  ),
  card(
    {
      id: 'card-review',
      x: 1460,
      y: 640,
      type: 'Event',
      title: 'Roadmap review',
      rows: [
        ['Created by', 'Planner'],
        ['When', 'Friday 10:00'],
        ['With', 'Sales'],
      ],
    },
    t,
    5.2,
  ),
  card(
    {
      id: 'card-launch',
      x: 80,
      y: 70,
      type: 'Checklist',
      title: 'Launch checklist',
      rows: [
        ['Space', 'Platform'],
        ['Items', '18 open'],
        ['Agents', '1 working'],
      ],
      thread: [
        { who: 'Dana', color: PALETTE.green, text: 'Which launch items are blocked?', at: 6.6 },
        { who: 'Triage', bot: true, color: '#8fbfbf', text: 'Three, all waiting on Auth.', at: 7.5 },
      ],
    },
    t,
    6.0,
  ),
  card(
    {
      id: 'card-blockers',
      x: 80,
      y: 430,
      type: 'List',
      title: 'Auth blockers',
      rows: [
        ['Created by', 'Triage'],
        ['Linked to', 'Roadmap update'],
      ],
    },
    t,
    8.4,
  ),
  card(
    {
      id: 'card-pricing',
      x: 80,
      y: 640,
      type: 'Document',
      title: 'Pricing',
      rows: [
        ['Space', 'Platform'],
        ['Edited', 'today'],
      ],
      thread: [{ who: 'Fay', color: '#c79ab0', text: 'Customers keep asking about seats.', at: 9.8 }],
    },
    t,
    9.2,
  ),
  card(
    {
      id: 'card-faq',
      x: 80,
      y: 900,
      type: 'Document',
      title: 'Seats FAQ',
      rows: [['Created by', 'Support']],
    },
    t,
    11.0,
  ),
];

/** The object each card belongs to, and the edge of the card its link meets. */
const CARD_OBJECTS: Record<string, { object: number; edge: [number, number] }> = {
  'card-update': { object: 37, edge: [1460, 140] },
  'card-review': { object: 61, edge: [1460, 700] },
  'card-launch': { object: 88, edge: [460, 140] },
  'card-blockers': { object: 104, edge: [460, 480] },
  'card-pricing': { object: 123, edge: [460, 700] },
  'card-faq': { object: 142, edge: [460, 950] },
};

const NOTES = [
  { space: 'Company', lines: ['Who owns this?', 'Ops, since Monday.'], at: 1.4, side: 1 },
  { space: 'Customers', lines: ['Tag the customer.', 'Tagged: Acme.'], at: 3.6, side: 1 },
  { space: 'Personal', lines: ['Draft is ready.', 'Reviewing now.'], at: 5.8, side: -1 },
  { space: 'Partners', lines: ['Any blockers?', 'Waiting on Auth.'], at: 8.0, side: -1 },
];

/** Short conversations beside the spaces: people and agents at work all over the graph. */
const notes = (t: number): Prim[] =>
  NOTES.flatMap(({ space, lines, at, side }) => {
    const home = SPACES.find((candidate) => candidate.id === space)?.at ?? [0, 0];
    return lines.map((line, index): Prim => {
      const start = at + index * 0.9;
      const shown = ramp(t, start, 0.4) * (1 - ramp(t, at + 3.4, 0.6));
      return {
        kind: 'chip',
        id: `note-${space}-${index}`,
        x: home[0] + side * (SPACE_R + 34),
        y: home[1] - 8 + index * 16,
        text: line,
        scale: 0.85,
        opacity: shown,
        parent: `body:space-${space}`,
      };
    });
  });

//
// The slides.
//

export const slides = (holds: Record<string, number>): Slide[] => {
  const hold = (id: string) => holds[id] ?? 0;
  const still = (prims: Prim[], view: Camera = camera()): Frame => ({ camera: view, prims });
  /** Seconds since `id` began, for motion that runs on across several scenes. */
  const since = (id: string, t: number, ...after: string[]) =>
    hold(id) + after.reduce((sum, next) => sum + hold(next), 0) + t;

  return [
    { id: 'blank', draw: () => still([]) },

    {
      id: 'beginning',
      draw: (t) =>
        still([
          { kind: 'title', id: 'title', x: 0, y: 0, text: 'In the Beginning', size: 96, opacity: ramp(t, 0.3, 1.2) },
        ]),
    },

    // Your company, and the one vendor that holds its data.
    { id: 'silo', draw: () => still(silo()) },
    {
      id: 'silo-comms',
      draw: (t) =>
        still([
          ...silo(),
          flow('flow-up', 'node:your-teams', 'node:data-org', t * 0.45, ROLES.team, { count: 4 }),
          flow('flow-down', 'node:data-org', 'node:your-teams', t * 0.45 + 0.125, ROLES.data, { count: 4 }),
        ]),
    },

    // The vendor grows by holding the data of every company; yours is one company in its ring.
    { id: 'scale', transition: 3.0, draw: () => still(scale(0, false)) },
    {
      id: 'competitors',
      draw: (t) =>
        still([
          ...scale(t, true),
          ...COMPETITORS.map((index): Prim => {
            const angle = tenantAngle(index);
            const [x, y] = polar(0, 0, 428, angle);
            return label(`competitor-${index}`, x, y, 'Your competitor', {
              size: 18,
              weight: 500,
              anchor: Math.cos(angle) < -0.3 ? 'end' : Math.cos(angle) > 0.3 ? 'start' : 'middle',
              opacity: ramp(t, 0.6, 0.8),
              parent: `node:tenant-${index}`,
            });
          }),
        ]),
    },

    // The camera comes to your company; the one vendor becomes many apps, each holding a share of your data.
    { id: 'spread', transition: 3.0, draw: () => still(spread(), camera(1, ...YOURS_AT)) },
    { id: 'spread-comms', draw: (t) => still(spread(t), camera(1, ...YOURS_AT)) },

    // A frontier lab arrives, far bigger than every other vendor.
    { id: 'frontier', transition: 2.5, draw: () => still(frontier()) },
    {
      id: 'frontier-comms',
      draw: (t) =>
        still([
          ...frontier(t),
          ...TEAMS.map(({ id, color }) =>
            flow(`flow-${id}-lab`, `node:team-${id}`, 'node:lab-core', t * 0.5 + hash(id), color, {
              count: 5,
              size: 5,
            }),
          ),
          ...APPS.map((app) =>
            flow(`flow-data-${app}`, `node:data-org-${app}`, 'node:lab-core', t * 0.3 + hash(app), ROLES.data, {
              count: 2,
              size: 4,
              opacity: ramp(t, 2, 1.5),
            }),
          ),
        ]),
    },

    // The lab becomes the centre; your company is one of many again, and the apps fall into the lab's orbit.
    { id: 'orbit', transition: 3.0, draw: (t) => still(orbit(t * 0.05)) },
    {
      id: 'absorb',
      draw: (t) => {
        const spin = since('orbit', t) * 0.05;
        const taken = APPS.map((_, index) => ramp(t, 1 + index * 0.6, 1.0, easeInOut));
        return still(orbit(spin, taken));
      },
    },

    // Two more labs grow out of the first; they will merge back into one.
    { id: 'rivals', transition: 2.5, draw: (t) => still(rivals(t * 0.02, 0, 0)) },
    {
      id: 'merge-1',
      draw: (t) => still(rivals(since('rivals', t) * 0.02, ramp(t, 1.5, 2.5, easeInOut), ramp(t, 4.8, 3.0, easeInOut))),
    },
    {
      id: 'final-frontier',
      draw: (t) =>
        still([
          ...merged(since('rivals', t, 'merge-1') * 0.02),
          {
            kind: 'title',
            id: 'final-title',
            x: 0,
            y: -340,
            text: 'The Final Frontier',
            size: 64,
            opacity: ramp(t, 0.4, 1.0),
          },
        ]),
    },

    // The lab grows until it is all there is.
    {
      id: 'engulf',
      draw: (t) => {
        const r = lerp(175, 1250, ramp(t, 0.6, 6.4, easeInOut));
        return still([
          ...merged(since('rivals', t, 'merge-1', 'final-frontier') * 0.02, r),
          {
            kind: 'title',
            id: 'welcome',
            x: 0,
            y: 0,
            text: 'Welcome to the Singularity',
            size: 80,
            opacity: ramp(t, 8.5, 1.0),
          },
        ]);
      },
    },
    {
      id: 'dont-panic',
      transition: 1.0,
      draw: (t) =>
        still([
          { kind: 'fill', id: 'curtain', color: PALETTE.black, screen: true },
          {
            kind: 'title',
            id: 'dont-panic',
            x: 0,
            y: 0,
            text: 'Don’t Panic',
            size: 80,
            color: neu.muted,
            opacity: ramp(t, 3.5, 1.0),
          },
        ]),
    },

    // After the curtain: your company and its apps again; then ECHO puts your data at its centre.
    { id: 'spread-again', transition: 1.6, draw: () => still(appsAround()) },
    { id: 'echo-hub', transition: 2.0, draw: () => still(hub()) },
    { id: 'echo-spaces', transition: 2.5, draw: () => still(echoSpaces(), camera(ECHO_ZOOM)) },

    // Inside a space: a graph of objects, and the work people and agents do on them.
    {
      id: 'objects',
      transition: 2.5,
      draw: (t) =>
        still(
          [...echoSpaces({ subs: 0, titles: false }), ...objects(t * OBJECT_SPIN)],
          camera(OBJECTS_ZOOM, ...COMPANY_SPACE.at),
        ),
    },
    {
      id: 'object-created',
      draw: (t) => {
        const spin = since('objects', t) * OBJECT_SPIN;
        const cards = objectCards(t);
        const picked = Object.fromEntries(
          cards.map((prim) => [CARD_OBJECTS[prim.id].object, 1 + 0.9 * (prim.opacity ?? 0)]),
        );
        // Each card is a view of one object: its link runs from the object in the graph to the card's edge on screen.
        const links = cards.map((prim): Prim => {
          const {
            object,
            edge: [x2, y2],
          } = CARD_OBJECTS[prim.id];
          return {
            kind: 'link',
            id: `card-link-${prim.id}`,
            x1: 0,
            y1: 0,
            x2,
            y2,
            a: `node:object-${object}`,
            screen2: true,
            hot: prim.accent,
            opacity: prim.opacity,
          };
        });
        return still(
          [...echoSpaces({ subs: 0, titles: false }), ...objects(spin, { dim: 0.28, picked }), ...links, ...cards],
          camera(OBJECTS_ZOOM, ...COMPANY_SPACE.at),
        );
      },
    },

    // Back out to the spaces, alive with work.
    { id: 'echo-spaces-again', transition: 2.5, draw: (t) => still([...echoSpaces(), ...notes(t)], camera(ECHO_ZOOM)) },
    { id: 'echo-hub-again', transition: 2.5, draw: () => still(hub()) },

    // The apps fold into your data: they come to you.
    {
      id: 'saas-merge',
      draw: (t) => {
        const taken = APPS.map((_, index) => ramp(t, 1.4 + index * 0.55, 1.0, easeInOut));
        return still(hub(taken));
      },
    },

    // Your company, holding everything, fills the frame; then the lockup.
    {
      id: 'company-fills',
      draw: (t) => {
        const grow = ramp(t, 0.4, 3.0, easeInOut);
        const field = ramp(t, 2.9, 0.6);
        return still([
          { kind: 'body', id: 'org', x: 0, y: 0, r: lerp(170, 1300, grow), opacity: 1 - field },
          {
            kind: 'node',
            id: 'hub',
            x: 0,
            y: 0,
            r: lerp(150, 1300, grow),
            role: 'data',
            glow: 0.5,
            parent: 'body:org',
          },
          label('org-label', 0, -170 - 32, 'Your company', { size: 30, opacity: 1 - grow }),
          label('hub-label', 0, 0, 'Your data', { size: 30, opacity: 1 - grow, parent: 'node:hub' }),
          { kind: 'fill', id: 'field', color: PALETTE.gold, screen: true, opacity: field },
          {
            kind: 'logo',
            id: 'logo',
            x: WIDTH / 2,
            y: HEIGHT / 2 - 70,
            width: 560,
            dark: true,
            screen: true,
            opacity: ramp(t, 3.4, 0.8),
          },
          ...['Your team', 'Your apps', 'Your data'].map((text, index): Prim =>
            label(`tag-${index}`, WIDTH / 2 + (index - 1) * 220, HEIGHT / 2 + 130, text, {
              screen: true,
              size: 34,
              weight: 500,
              color: PALETTE.graphite,
              plain: true,
              opacity: ramp(t, 4.2 + index * 0.4, 0.6),
            }),
          ),
        ]);
      },
    },
  ];
};

//
// Scene layouts.
//

const silo = (): Prim[] => [
  { kind: 'body', id: 'org', x: -300, y: 20, r: 150 },
  { kind: 'body', id: 'vendor', x: 300, y: 20, r: 150, role: 'lab' },
  { kind: 'node', id: 'your-teams', x: -300, y: 20, r: 46, role: 'team', parent: 'body:org' },
  { kind: 'node', id: 'data-org', x: 300, y: 20, r: 46, role: 'data', parent: 'body:vendor' },
  label('org-label', -300, 20 - 150 - 32, 'Your company', { size: 30 }),
  label('vendor-label', 300, 20 - 150 - 32, 'SaaS', { size: 30, parent: 'body:vendor' }),
  label('teams-label', -300, 20 - 46 - 20, 'Your teams', { size: 18, weight: 500, parent: 'node:your-teams' }),
  label('data-label', 300, 20 - 46 - 20, 'Your data', { size: 18, weight: 500, parent: 'node:data-org' }),
  // Your company's link to its vendor: the same link that joins it to the vendor once it is one company of many.
  edge(`tenant-link-${YOURS}`, 'node:your-teams', 'node:data-org', { parent: 'body:org' }),
];

const scale = (t: number, flows: boolean): Prim[] => {
  const prims: Prim[] = [
    { kind: 'body', id: 'vendor', x: 0, y: 0, r: 300, role: 'lab' },
    { kind: 'node', id: 'metadata', x: 0, y: 0, r: 100, role: 'lab', glow: 0.3, parent: 'body:vendor' },
    label('metadata-label', 0, 0, '“Metadata”', { size: 28, parent: 'node:metadata' }),
    label('vendor-label', 0, -258, 'SaaS', { size: 30, parent: 'body:vendor' }),
    ...tenantRing(0, 0, 400, { holder: 'body:vendor', flows, t, fromData: { delay: 1.2 } }),
  ];
  // Every company's data, held in a ring inside the vendor; yours is on the left, nearest your company.
  for (let index = 0; index < VENDOR_DATA; index++) {
    const [x, y] = polar(0, 0, 210, Math.PI + (index / VENDOR_DATA) * TAU);
    prims.push({
      kind: 'node',
      id: index === 0 ? 'data-org' : `data-${index}`,
      x,
      y,
      r: index === 0 ? 10 : 7,
      role: 'data',
      glow: -0.1,
      parent: 'body:vendor',
    });
  }
  return prims;
};

const spread = (t?: number): Prim[] => [
  ...company(...YOURS_AT, 1),
  ...appRing(...YOURS_AT, 390),
  ...appData(...YOURS_AT, 390),
  ...teamLinks(t),
];

const frontier = (t?: number): Prim[] => [
  ...company(...FRONTIER_AT, FRONTIER_SCALE),
  ...appRing(...FRONTIER_AT, 255, { scale: 0.8 }),
  ...appData(...FRONTIER_AT, 255, { inset: 44 }),
  ...teamLinks(t),
  ...lab(...LAB_AT, 210, { core: 66 }),
  ...TEAMS.map(({ id }) => edge(`link-${id}-lab`, `node:team-${id}`, 'node:lab-core', { parent: `node:team-${id}` })),
];

/** The lab at the centre with its core; the apps orbit it, and `taken` (per app, 0 … 1) folds them into the core. */
const orbit = (spin: number, taken: number[] = APPS.map(() => 0)): Prim[] => {
  const growth = taken.reduce((sum, k) => sum + k, 0) / APPS.length;
  return [
    ...lab(0, 0, 250, { core: 150 + 40 * growth }),
    ...tenantRing(0, 0, 420, { holder: 'body:lab', labels: false, spin: spin * 0.4 }),
    ...APPS.flatMap((app, index): Prim[] => {
      const k = taken[index];
      const [x, y] = appAt(app, 0, 0, 310, spin);
      const [dx, dy] = appAt(app, 0, 0, 272, spin);
      return [
        {
          kind: 'chip',
          id: `app-${app}`,
          x: lerp(x, 0, k),
          y: lerp(y, 0, k),
          text: app,
          scale: 0.8 * (1 - k),
          opacity: 1 - k,
        },
        {
          kind: 'node',
          id: `data-org-${app}`,
          x: lerp(dx, 0, k),
          y: lerp(dy, 0, k),
          r: 7 * (1 - k),
          role: 'data',
          opacity: 1 - k,
          parent: `chip:app-${app}`,
        },
      ];
    }),
  ];
};

/** Where the three labs start; a lab that merges takes the size and place of the one it merges into. */
const LABS = { top: [0, -190], left: [-330, 200], right: [330, 200] } as const;

/**
 * Three frontier labs, each with a third of the companies; `first` merges the left one into the right, `second` merges
 * that into the top one, which moves to the centre.
 */
const rivals = (spin: number, first: number, second: number): Prim[] => {
  const mergedR = lerp(105, 175, second);
  const top: [number, number] = [0, lerp(LABS.top[1], 0, second)];
  const right: [number, number] = [lerp(LABS.right[0], top[0], second), lerp(LABS.right[1], top[1], second)];
  const rightR = lerp(lerp(105, 130, first), mergedR, second);
  const left: [number, number] = [lerp(LABS.left[0], right[0], first), lerp(LABS.left[1], right[1], first)];
  const leftR = lerp(105, rightR, first);
  const ring = (r: number) => r + 45 + 30 * second;
  const prims: Prim[] = [
    { kind: 'body', id: 'lab', x: top[0], y: top[1], r: mergedR, role: 'lab' },
    ...(second < 1
      ? [
          {
            kind: 'body',
            id: 'rival-2',
            x: right[0],
            y: right[1],
            r: rightR,
            role: 'lab',
            from: 'body:lab',
          } satisfies Prim,
        ]
      : []),
    ...(first < 1
      ? [
          {
            kind: 'body',
            id: 'rival-1',
            x: left[0],
            y: left[1],
            r: leftR,
            role: 'lab',
            from: 'body:lab',
          } satisfies Prim,
        ]
      : []),
    label('lab-label', top[0], top[1] - ring(mergedR) - 34, 'Frontier Labs', { size: 26, parent: 'body:lab' }),
    label('rival-1-label', left[0], left[1] - ring(leftR) - 34, 'Frontier Labs', {
      size: 26,
      opacity: 1 - first,
      parent: 'body:rival-1',
    }),
    label('rival-2-label', right[0], right[1] - ring(rightR) - 34, 'Frontier Labs', {
      size: 26,
      opacity: 1 - second,
      parent: 'body:rival-2',
    }),
  ];
  for (let index = 0; index < TENANTS; index++) {
    const group = index % 3;
    const slot = Math.floor(index / 3);
    const angle = (slot / (TENANTS / 3)) * TAU + spin + group * 2.1;
    const own =
      group === 0
        ? polar(...top, ring(mergedR), angle)
        : group === 1
          ? polar(...left, ring(leftR), angle)
          : polar(...right, ring(rightR), angle);
    // Each lab's companies sit on a ring just outside it; as the last merge completes they take their places in one ring.
    const all = polar(...top, ring(mergedR), tenantAngle(index) + spin);
    const [x, y]: [number, number] = [lerp(own[0], all[0], second), lerp(own[1], all[1], second)];
    const holder =
      group === 0 || second >= 1 ? 'body:lab' : group === 2 || first >= 1 ? 'body:rival-2' : 'body:rival-1';
    const tenant = index === YOURS ? 'body:org' : `node:tenant-${index}`;
    if (index === YOURS) {
      prims.push(...yoursInRing(x, y, { labels: false }));
    } else {
      prims.push({ kind: 'node', id: `tenant-${index}`, x, y, r: 7, color: TENANT_COLOR, glow: -0.2 });
    }
    prims.push(edge(`tenant-link-${index}`, tenant, holder, { opacity: 0.45, parent: tenant }));
  }
  return prims;
};

/** The one lab left, with every company around it; `r` grows it until it swallows them. */
const merged = (spin: number, r = 175): Prim[] => {
  // The companies vanish as the lab's edge reaches them.
  const fade = clamp((250 - r) / 40);
  return [
    ...lab(0, 0, r, { title: false }),
    ...tenantRing(0, 0, 250, { holder: 'body:lab', labels: false, spin, fade }),
  ];
};

/** Your company at the centre with its apps, each holding a share of your data. */
const appsAround = (): Prim[] => [...company(0, 0, 1, { teams: false }), ...appRing(0, 0, 390), ...appData(0, 0, 390)];

/**
 * ECHO in your company: your data at its centre, linked to every app; the data the apps held moves into it. `taken`
 * (per app, 0 … 1) folds the apps themselves into it.
 */
const hub = (taken: number[] = APPS.map(() => 0)): Prim[] => {
  const growth = taken.reduce((sum, k) => sum + k, 0) / APPS.length;
  return [
    ...company(0, 0, 1, { teams: false }),
    {
      kind: 'node',
      id: 'hub',
      x: 0,
      y: 0,
      r: 120 + 30 * growth,
      role: 'data',
      glow: 0.2 + 0.3 * growth,
      parent: 'body:org',
    },
    label('hub-label', 0, 0, 'Your data', { size: 30, parent: 'node:hub' }),
    ...APPS.flatMap((app, index): Prim[] => {
      const k = taken[index];
      const [x, y] = appAt(app, 0, 0, 390);
      return [
        { kind: 'chip', id: `app-${app}`, x: lerp(x, 0, k), y: lerp(y, 0, k), text: app, scale: 1 - k, opacity: 1 - k },
        // The share of your data each app held is now in the hub.
        { kind: 'node', id: `data-org-${app}`, x: 0, y: 0, r: 7, role: 'data', opacity: 0, parent: 'node:hub' },
        edge(`link-hub-${app}`, 'node:hub', `chip:app-${app}`, { opacity: 0.7, parent: `chip:app-${app}` }),
      ];
    }),
  ];
};

const echoSpaces = ({ subs = 1, titles = true }: { subs?: number; titles?: boolean } = {}): Prim[] => [
  { kind: 'body', id: 'org', x: 0, y: 0, r: 170 },
  { kind: 'node', id: 'hub', x: 0, y: 0, r: 110, role: 'data', glow: -0.3, opacity: 0.12, parent: 'body:org' },
  ...spaces({ subs }),
  ...(titles ? echoTitle() : []),
];
