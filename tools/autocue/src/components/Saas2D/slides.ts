//
// Copyright 2026 DXOS.org
//

// The SaaS story in 2D, one slide per scene of the echo3d presentation (`tools/autocue/showcase/echo3d/views.js`,
// `saas-short` scenario), timed by its holds so the Fry voice-over lands on the same beats.

import {
  type Camera,
  type CardPrim,
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

const camera = (zoom = 1, x = 0, y = 0): Camera => ({ x, y, zoom });

const label = (
  id: string,
  x: number,
  y: number,
  text: string,
  options: Partial<Extract<Prim, { kind: 'label' }>> = {},
): Prim => ({ kind: 'label', id, x, y, text, size: 24, ...options });

//
// Building blocks, shared by the slides that show the same thing.
//

const tenantAngle = (index: number) => Math.PI + ((index - YOURS) / TENANTS) * TAU;

/** Every company as a ring around a centre, linked to it; your company sits on the left. */
const tenantRing = (
  cx: number,
  cy: number,
  radius: number,
  {
    inner,
    flows,
    t = 0,
    labels = true,
    spin = 0,
  }: { inner: number; flows?: boolean; t?: number; labels?: boolean; spin?: number },
): Prim[] => {
  const prims: Prim[] = [];
  for (let index = 0; index < TENANTS; index++) {
    const angle = tenantAngle(index) + spin;
    const [x, y] = polar(cx, cy, radius, angle);
    const [ix, iy] = polar(cx, cy, inner, angle);
    if (index === YOURS) {
      prims.push({ kind: 'body', id: 'org', x, y, r: 16 });
      // A small dark body vanishes on the field; your teams' blue marks which company is yours.
      prims.push({ kind: 'node', id: 'your-teams', x, y, r: 9, role: 'team', parent: 'body:org' });
      if (labels) {
        prims.push(label('org-label', x - 34, y, 'Your company', { anchor: 'end', size: 24 }));
      }
    } else {
      prims.push({ kind: 'node', id: `tenant-${index}`, x, y, r: 9, color: TENANT_COLOR, glow: -0.2 });
    }
    const tenant = index === YOURS ? 'body:org' : `node:tenant-${index}`;
    prims.push({
      kind: 'link',
      id: `tenant-link-${index}`,
      x1: x,
      y1: y,
      x2: ix,
      y2: iy,
      opacity: 0.6,
      parent: tenant,
    });
    if (flows) {
      prims.push({
        kind: 'flow',
        id: `tenant-flow-${index}`,
        x1: x,
        y1: y,
        x2: ix,
        y2: iy,
        phase: t * 0.35 + hash(`flow-${index}`),
        color: ROLES.data,
        count: 1,
        size: 3.5,
        opacity: 0.8,
        parent: tenant,
      });
    }
  }
  return prims;
};

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
        },
        label(`team-label-${id}`, cx + at[0] * scale, cy + (at[1] - r) * scale - 14, id, {
          size: 17,
          weight: 500,
          parent: `node:team-${id}`,
        }),
      ])
    : []),
];

const teamAt = (id: string, cx: number, cy: number, scale: number): [number, number] => {
  const team = TEAMS.find((candidate) => candidate.id === id);
  return team ? [cx + team.at[0] * scale, cy + team.at[1] * scale] : [cx, cy];
};

/** The apps as chips around a centre. */
const appRing = (cx: number, cy: number, radius: number, { scale = 1, spin = 0 } = {}): Prim[] =>
  APPS.map((app, index) => {
    const [x, y] = polar(cx, cy, radius, -Math.PI / 2 + (index / APPS.length) * TAU + spin);
    // Every app is another SaaS vendor: the many grow out of the one.
    return { kind: 'chip', id: `app-${app}`, x, y, text: app, scale, from: 'body:vendor' };
  });

/** Your data, a share of it held by each app; it all comes from the one dot the first vendor held. */
const appData = (cx: number, cy: number, radius: number): Prim[] =>
  APPS.map((app): Prim => {
    const [x, y] = appAt(app, cx, cy, radius - 52);
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

const appAt = (app: string, cx: number, cy: number, radius: number, spin = 0): [number, number] =>
  polar(cx, cy, radius, -Math.PI / 2 + (APPS.indexOf(app) / APPS.length) * TAU + spin);

/** Each team's links to the apps it works in, with data flowing when `t` is given. */
const teamLinks = (cx: number, cy: number, scale: number, radius: number, t?: number): Prim[] =>
  Object.entries(TEAM_APPS).flatMap(([team, apps]) =>
    apps.flatMap((app): Prim[] => {
      const [x1, y1] = teamAt(team, cx, cy, scale);
      const [x2, y2] = appAt(app, cx, cy, radius);
      const link: LinkPrim = { kind: 'link', id: `link-${team}-${app}`, x1, y1, x2, y2, parent: `node:team-${team}` };
      if (t === undefined) {
        return [link];
      }
      const color = TEAMS.find((candidate) => candidate.id === team)?.color ?? neu.accent;
      return [
        link,
        {
          kind: 'flow',
          id: `flow-${team}-${app}`,
          x1,
          y1,
          x2,
          y2,
          phase: t * 0.4 + hash(`${team}${app}`),
          color,
          count: 2,
          size: 5,
        },
      ];
    }),
  );

/** A frontier lab with its gold core of everyone's data. */
const lab = (id: string, x: number, y: number, r: number, { core = 0, title = true } = {}): Prim[] => [
  { kind: 'body', id, x, y, r, role: 'lab' },
  ...(core > 0 ? [{ kind: 'node', id: `${id}-core`, x, y, r: core, role: 'data', glow: 0.2 } satisfies Prim] : []),
  // With a core, the title sits in the body's rim, clear of the apps and companies orbiting outside.
  ...(title
    ? [label(`${id}-label`, x, core > 0 ? y - (r + core) / 2 : y - r - 34, 'Frontier Labs', { size: 30 })]
    : []),
];

/** The objects of one space, as a flat disc turning slowly in the screen plane. */
const objectAt = (index: number, cx: number, cy: number, spin: number): [number, number] => {
  // A sunflower spiral packs the disc evenly; the outer objects sit a little further apart.
  const radius = 25 * Math.sqrt((index + 0.5) / OBJECTS);
  return polar(cx, cy, radius, index * 2.39996 + spin);
};

const OBJECT_COLOR = (index: number) => OBJECT_PALETTE[Math.floor(hash(`object-${index}`) * OBJECT_PALETTE.length)];

const COMPANY_SPACE = SPACES[1];

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
    });
    // Sunflower neighbours differ by Fibonacci steps, so these links stay short.
    const next = index + 13;
    if (next < OBJECTS && hash(`link-${index}`) < 0.32) {
      const [x2, y2] = objectAt(next, cx, cy, spin);
      prims.push({
        kind: 'link',
        id: `object-link-${index}`,
        x1: x,
        y1: y,
        x2,
        y2,
        color: '#3a4560',
        opacity: dim * 0.9,
      });
    }
  }
  return prims;
};

/** The ECHO hypergraph inside your company: four clusters of nested spaces. */
const spaces = ({ subs = 1 } = {}): Prim[] =>
  SPACES.flatMap(({ id, at, children }): Prim[] => [
    { kind: 'body', id: `space-${id}`, x: at[0], y: at[1], r: SPACE_R },
    label(`space-label-${id}`, at[0], at[1] - SPACE_R - 3.4, id, { size: 20, weight: 600 }),
    ...children.map((child, index): Prim => {
      const [x, y] = polar(
        at[0],
        at[1],
        children.length === 2 ? 11 : 12,
        (index / children.length) * TAU - Math.PI / 2 + hash(child),
      );
      return { kind: 'node', id: `sub-${child}`, x, y, r: 8.5, color: '#9aa6d6', glow: -0.2, opacity: subs };
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

const ECHO_ZOOM = 3.4;
const OBJECTS_ZOOM = 15;

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
      };
    });
  });

//
// The slides.
//

export const slides = (holds: Record<string, number>): Slide[] => {
  const hold = (id: string) => holds[id] ?? 0;
  const still = (prims: Prim[], view: Camera = camera()): Frame => ({ camera: view, prims });

  // Where the merged lab and its companies end up; `final-frontier` and `engulf` start here.
  const mergedLab = (t: number, r = 175): Prim[] => [
    ...lab('lab', 0, 0, r, { title: false }),
    ...tenantRing(0, 0, 250, { inner: r, labels: false, spin: t * 0.02 }),
  ];

  return [
    { id: 'blank', draw: () => still([]) },

    {
      id: 'beginning',
      draw: (t) =>
        still([
          { kind: 'title', id: 'title', x: 0, y: 0, text: 'In the Beginning', size: 96, opacity: ramp(t, 0.3, 1.2) },
        ]),
    },

    // Your data lives inside the SaaS vendor.
    {
      id: 'silo',
      draw: () => still(silo()),
    },
    {
      id: 'silo-comms',
      draw: (t) =>
        still([
          ...silo(),
          {
            kind: 'flow',
            id: 'flow-up',
            x1: -254,
            y1: 20,
            x2: 254,
            y2: 20,
            phase: t * 0.45,
            color: ROLES.team,
            count: 4,
          },
          {
            kind: 'flow',
            id: 'flow-down',
            x1: 254,
            y1: 20,
            x2: -254,
            y2: 20,
            phase: t * 0.45 + 0.125,
            color: ROLES.data,
            count: 4,
          },
        ]),
    },

    // The vendor grows by holding the data of every company.
    { id: 'scale', draw: () => still(scale(0, false)) },
    {
      id: 'competitors',
      draw: (t) =>
        still([
          ...scale(t, true),
          ...COMPETITORS.flatMap((index): Prim[] => {
            const angle = tenantAngle(index);
            const [x, y] = polar(0, 0, 428, angle);
            return [
              label(`competitor-${index}`, x, y, 'Your competitor', {
                size: 18,
                weight: 500,
                anchor: Math.cos(angle) < -0.3 ? 'end' : Math.cos(angle) > 0.3 ? 'start' : 'middle',
                opacity: ramp(t, 0.6, 0.8),
              }),
            ];
          }),
        ]),
    },

    // Your company, its data spread across many apps.
    // Your company keeps its place in the ring of companies; the camera comes to it.
    { id: 'spread', transition: 3.0, draw: () => still(spread(), SPREAD_VIEW) },
    { id: 'spread-comms', draw: (t) => still(spread(t), SPREAD_VIEW) },

    // A frontier lab arrives, far bigger than every other vendor.
    { id: 'frontier', draw: () => still(frontier()) },
    {
      id: 'frontier-comms',
      draw: (t) =>
        still([
          ...frontier(t),
          ...TEAMS.flatMap(({ id, color }): Prim[] => {
            const [x1, y1] = teamAt(id, FRONTIER_AT, 20, FRONTIER_SCALE);
            return [
              {
                kind: 'flow',
                id: `flow-${id}-lab`,
                x1,
                y1,
                x2: 420 - 66,
                y2: 20,
                phase: t * 0.5 + hash(id),
                color,
                count: 5,
                size: 5,
              },
            ];
          }),
        ]),
    },

    // The lab becomes the centre; the apps and every company fall into its orbit.
    { id: 'orbit', draw: (t) => still(orbit(t)) },
    {
      id: 'absorb',
      draw: (t) => {
        const spin = (hold('orbit') + t) * 0.05;
        const taken = APPS.map((_, index) => ramp(t, 1 + index * 0.6, 1.0, easeInOut));
        const growth = taken.reduce((sum, k) => sum + k, 0) / APPS.length;
        return still([
          ...lab('lab', 0, 0, 250, { core: 150 + 40 * growth }),
          label('lab-core-label', 0, 0, '“Metadata”', { size: 30, weight: 600 }),
          ...tenantRing(0, 0, 420, { inner: 250, labels: false, spin: spin * 0.4 }),
          ...APPS.map((app, index): Prim => {
            const [x, y] = appAt(app, 0, 0, 310, spin);
            const k = taken[index];
            return {
              kind: 'chip',
              id: `app-${app}`,
              x: lerp(x, 0, k),
              y: lerp(y, 0, k),
              text: app,
              scale: 0.8 * (1 - k),
              opacity: 1 - k,
            };
          }),
        ]);
      },
    },

    // Two more labs: they will merge into one.
    { id: 'rivals', draw: (t) => still(rivals(t, 0, 0)) },
    {
      id: 'merge-1',
      draw: (t) => still(rivals(t, ramp(t, 1.5, 2.5, easeInOut), ramp(t, 4.8, 3.0, easeInOut))),
    },
    {
      id: 'final-frontier',
      draw: (t) =>
        still([
          ...mergedLab(hold('merge-1') + t),
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
        const ring = mergedLab(hold('merge-1') + hold('final-frontier') + t, r).map((prim): Prim => {
          // The companies vanish as the lab's edge reaches them.
          if (prim.kind === 'node' || prim.kind === 'body' || prim.kind === 'link') {
            return prim.id === 'lab' ? prim : { ...prim, opacity: (prim.opacity ?? 1) * clamp((250 - r) / 40) };
          }
          return prim;
        });
        return still([
          ...ring,
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

    // Put your data at the centre: ECHO inside your company.
    {
      id: 'spread-again',
      transition: 1.6,
      draw: () => still([...company(0, 0, 1, { teams: false }), ...appRing(0, 0, 390)]),
    },
    { id: 'echo-hub', draw: () => still(hub()) },
    {
      id: 'echo-spaces',
      transition: 2.0,
      draw: () => still(echoSpaces(), camera(ECHO_ZOOM)),
    },

    // Inside a space: a graph of objects, and the work people and agents do on them.
    {
      id: 'objects',
      transition: 2.0,
      draw: (t) =>
        still(
          [...echoSpaces({ subs: 0, titles: false }), ...objects(t * OBJECT_SPIN)],
          camera(OBJECTS_ZOOM, COMPANY_SPACE.at[0], COMPANY_SPACE.at[1]),
        ),
    },
    {
      id: 'object-created',
      draw: (t) => {
        const spin = (hold('objects') + t) * OBJECT_SPIN;
        const cards = objectCards(t);
        const picked = Object.fromEntries(
          cards.map((prim) => [CARD_OBJECTS[prim.id].object, 1 + 0.9 * (prim.opacity ?? 0)]),
        );
        const view = camera(OBJECTS_ZOOM, COMPANY_SPACE.at[0], COMPANY_SPACE.at[1]);
        const links = cards.map((prim): Prim => {
          const { object, edge } = CARD_OBJECTS[prim.id];
          const [x1, y1] = objectAt(object, COMPANY_SPACE.at[0], COMPANY_SPACE.at[1], spin);
          // The link is drawn from the object in world space to the card's edge in screen pixels.
          const [x2, y2] = edge;
          return {
            kind: 'link',
            id: `card-link-${prim.id}`,
            x1,
            y1,
            x2,
            y2,
            screen2: true,
            hot: prim.accent,
            opacity: prim.opacity,
          };
        });
        return still(
          [...echoSpaces({ subs: 0, titles: false }), ...objects(spin, { dim: 0.28, picked }), ...links, ...cards],
          view,
        );
      },
    },

    // Back out to the spaces, alive with work.
    {
      id: 'echo-spaces-again',
      transition: 2.0,
      draw: (t) => still([...echoSpaces(), ...notes(t)], camera(ECHO_ZOOM)),
    },
    { id: 'echo-hub-again', transition: 1.6, draw: () => still(hub()) },

    // Your data folds into ECHO; the apps come to you.
    {
      id: 'saas-merge',
      draw: (t) => {
        const taken = APPS.map((_, index) => ramp(t, 1.4 + index * 0.55, 1.0, easeInOut));
        const growth = taken.reduce((sum, k) => sum + k, 0) / APPS.length;
        return still([
          ...company(0, 0, 1, { teams: false }),
          { kind: 'node', id: 'hub', x: 0, y: 0, r: 120 + 30 * growth, role: 'data', glow: 0.2 + 0.3 * growth },
          label('hub-label', 0, 0, 'Your data', { size: 30 }),
          ...APPS.map((app, index): Prim => {
            const [x, y] = appAt(app, 0, 0, 390);
            const k = taken[index];
            return {
              kind: 'chip',
              id: `app-${app}`,
              x: lerp(x, 0, k),
              y: lerp(y, 0, k),
              text: app,
              scale: 1 - k,
              opacity: 1 - k,
            };
          }),
        ]);
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
          { kind: 'node', id: 'hub', x: 0, y: 0, r: lerp(150, 1300, grow), role: 'data', glow: 0.5 },
          label('org-label', 0, -170 - 32, 'Your company', { size: 30, opacity: 1 - grow }),
          label('hub-label', 0, 0, 'Your data', { size: 30, opacity: 1 - grow }),
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
  { kind: 'node', id: 'your-teams', x: -300, y: 20, r: 46, role: 'team' },
  { kind: 'node', id: 'data-org', x: 300, y: 20, r: 46, role: 'data' },
  label('org-label', -300, 20 - 150 - 32, 'Your company', { size: 30 }),
  label('vendor-label', 300, 20 - 150 - 32, 'SaaS', { size: 30 }),
  label('teams-label', -300, 20 - 46 - 20, 'Your teams', { size: 18, weight: 500 }),
  label('data-label', 300, 20 - 46 - 20, 'Your data', { size: 18, weight: 500 }),
  { kind: 'link', id: 'silo-link', x1: -254, y1: 20, x2: 254, y2: 20 },
];

const scale = (t: number, flows: boolean): Prim[] => {
  const prims: Prim[] = [
    { kind: 'body', id: 'vendor', x: 0, y: 0, r: 300, role: 'lab' },
    { kind: 'node', id: 'metadata', x: 0, y: 0, r: 100, role: 'lab', glow: 0.3, parent: 'body:vendor' },
    label('metadata-label', 0, 0, '“Metadata”', { size: 28, parent: 'node:metadata' }),
    label('vendor-label', 0, -258, 'SaaS', { size: 30, parent: 'body:vendor' }),
    ...tenantRing(0, 0, 400, { inner: 300, flows, t }),
  ];
  // Every company's data, held in a ring inside the vendor; yours is on the left, nearest your company.
  for (let index = 0; index < 48; index++) {
    const angle = Math.PI + (index / 48) * TAU;
    const [x, y] = polar(0, 0, 210, angle);
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

/** Your company's place in the ring of companies around the vendor. */
const YOURS_AT: [number, number] = [-400, 0];
const SPREAD_VIEW = camera(1, ...YOURS_AT);

const spread = (t?: number): Prim[] => [
  ...company(...YOURS_AT, 1),
  ...appRing(...YOURS_AT, 390),
  ...appData(...YOURS_AT, 390),
  ...teamLinks(...YOURS_AT, 1, 390, t),
];

const FRONTIER_AT = -470;
const FRONTIER_SCALE = 0.62;

const frontier = (t?: number): Prim[] => [
  ...company(FRONTIER_AT, 20, FRONTIER_SCALE),
  ...appRing(FRONTIER_AT, 20, 255, { scale: 0.8 }),
  ...teamLinks(FRONTIER_AT, 20, FRONTIER_SCALE, 255, t),
  ...lab('lab', 420, 20, 210, { core: 66 }),
  ...TEAMS.map(({ id }): Prim => {
    const [x1, y1] = teamAt(id, FRONTIER_AT, 20, FRONTIER_SCALE);
    return { kind: 'link', id: `link-${id}-lab`, x1, y1, x2: 420 - 66, y2: 20 };
  }),
];

const orbit = (t: number): Prim[] => {
  const spin = t * 0.05;
  return [
    ...lab('lab', 0, 0, 250, { core: 150 }),
    label('lab-core-label', 0, 0, '“Metadata”', { size: 30, weight: 600 }),
    ...appRing(0, 0, 310, { scale: 0.8, spin }),
    ...tenantRing(0, 0, 420, { inner: 250, spin: spin * 0.4 }),
  ];
};

/**
 * Three frontier labs, each with a third of the companies; `first` merges the left one into the right, `second` merges
 * that into the top one at the centre.
 */
const rivals = (t: number, first: number, second: number): Prim[] => {
  const spin = t * 0.02;
  const top: [number, number] = [lerp(0, 0, second), lerp(-190, 0, second)];
  const left: [number, number] = [lerp(-330, 330, first), 200];
  const right: [number, number] = [lerp(330, 0, second), lerp(200, 0, second)];
  const rightR = lerp(105, 130, first);
  const mergedR = lerp(105, 175, second);
  const ringRadius = lerp(150, 250, second);
  const prims: Prim[] = [
    { kind: 'body', id: 'lab', x: top[0], y: top[1], r: mergedR, role: 'lab' },
    { kind: 'body', id: 'rival-1', x: left[0], y: left[1], r: 105 * (1 - first), role: 'lab', opacity: 1 - first },
    {
      kind: 'body',
      id: 'rival-2',
      x: right[0],
      y: right[1],
      r: rightR * (1 - second) + mergedR * second,
      role: 'lab',
      opacity: 1 - second,
    },
    label('lab-label', top[0], top[1] - ringRadius - 34, 'Frontier Labs', { size: 26 }),
    label('rival-1-label', left[0], left[1] - 150 - 34, 'Frontier Labs', { size: 26, opacity: 1 - first }),
    label('rival-2-label', right[0], right[1] - lerp(150, 175, first) - 34, 'Frontier Labs', {
      size: 26,
      opacity: 1 - second,
    }),
  ];
  for (let index = 0; index < TENANTS; index++) {
    // Each lab starts with a third of the companies; they follow their lab as it merges.
    const group = index % 3;
    const slot = Math.floor(index / 3);
    const angle = (slot / (TENANTS / 3)) * TAU + spin + group;
    const centre = group === 0 ? top : group === 1 ? (first < 1 ? left : right) : right;
    const own = group === 0 ? 150 : group === 1 ? lerp(150, 175, first) : lerp(150, 175, first);
    const radius = lerp(own, ringRadius, second);
    // The left lab's companies cross over to the right lab's ring as the two merge.
    const from = polar(group === 1 ? left[0] : centre[0], group === 1 ? left[1] : centre[1], radius, angle);
    const to = polar(right[0], right[1], radius, angle);
    const [x, y] = group === 1 ? [lerp(from[0], to[0], first), lerp(from[1], to[1], first)] : from;
    if (index === YOURS) {
      prims.push({ kind: 'body', id: 'org', x, y, r: 14 });
    } else {
      prims.push({ kind: 'node', id: `tenant-${index}`, x, y, r: 7, color: TENANT_COLOR, glow: -0.2 });
    }
  }
  return prims;
};

const hub = (): Prim[] => [
  ...company(0, 0, 1, { teams: false }),
  ...appRing(0, 0, 390),
  { kind: 'node', id: 'hub', x: 0, y: 0, r: 120, role: 'data', glow: 0.2 },
  label('hub-label', 0, 0, 'Your data', { size: 30 }),
];

const echoSpaces = ({ subs = 1, titles = true }: { subs?: number; titles?: boolean } = {}): Prim[] => [
  { kind: 'body', id: 'org', x: 0, y: 0, r: 170 },
  { kind: 'node', id: 'hub', x: 0, y: 0, r: 110, role: 'data', glow: -0.3, opacity: 0.12 },
  ...spaces({ subs }),
  ...(titles ? echoTitle() : []),
];
