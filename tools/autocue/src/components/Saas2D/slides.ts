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

/** Your teams, packed with an even gap (16) between each pair. */
const TEAMS = [
  { id: 'Eng', color: ROLES.team, r: 40, at: [0, -55.4] },
  { id: 'Sales', color: PALETTE.green, r: 40, at: [-48, 27.7] },
  { id: 'Ops', color: PALETTE.pink, r: 40, at: [48, 27.7] },
] as const;

const APPS = ['HubSpot', 'Workday', 'Google Workspace', 'Slack', 'Notion', 'Salesforce', 'Jira'];

const TENANTS = 48;
/** An app is a vendor as small as your smallest team. */
const APP_R = 30;
const METADATA_COLOR = '#ff8a3d';
const DATA_LIGHT = '#f6d585';
/** Each app's own color, none of them a team's or your data's. */
const APP_COLORS: Record<string, string> = {
  'HubSpot': '#ff7a59',
  'Workday': '#8f7cff',
  'Google Workspace': '#22c7c7',
  'Slack': '#c86dd7',
  'Notion': '#c9ced6',
  'Salesforce': '#4fb0e8',
  'Jira': '#e85a5a',
};
/** Your company and the labs are drawn with a broad raised band: the well holding their contents is smaller. */
const ORG_WELL = 0.72;
const LAB_WELL = 0.62;
/** Data flows this many times along a link per second of the story actually played. */
const FLOW_RATE = 0.22;
const TENANT_COLOR = '#8fa3d9';
/** Your company takes this place in every ring of companies, on the left. */
const YOURS = TENANTS / 2;
const COMPETITORS = [9, 16, 39];
/** One data dot per company, so each company's link ends on its own data. */
const VENDOR_DATA = TENANTS;

const OBJECT_PALETTE = ['#4f8dff', '#3ccf6e', '#ff8a3d', '#a66bff', '#22c7c7', '#f2c230', '#ff5fa2', '#7fa3ff'];
const OBJECT_SPIN = 0.08;

const SPACES = [
  { id: 'Company', at: [0, -50], r: 46 },
  { id: 'Personal', at: [-54, 44], r: 30 },
  { id: 'Customers', at: [50, 38], r: 38 },
] as const;
const COMPANY_SPACE = SPACES[0];

const ECHO_ZOOM = 3.4;
/** Frames the company space at the same size on screen whatever its radius. */
const OBJECTS_ZOOM = 450 / COMPANY_SPACE.r;

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
  const dot = (index - YOURS + TENANTS) % TENANTS;
  return dot === 0 ? 'node:data-org' : `node:data-${dot}`;
};

/**
 * Every company as a ring around a holder (a vendor or a lab), linked to it; your company sits on the left. Companies
 * that appear grow out of yours (companies like yours), or, with `fromData`, out of their data in the vendor's ring once
 * it has formed (`delay`), and stay linked to that data rather than to the holder.
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
    angleOf = tenantAngle,
  }: {
    holder: string;
    flows?: boolean;
    t?: number;
    labels?: boolean;
    spin?: number;
    fade?: number;
    fromData?: { delay: number };
    /** Each company's place on the ring (before `spin`). */
    angleOf?: (index: number) => number;
  },
): Prim[] => {
  const prims: Prim[] = [];
  for (let index = 0; index < TENANTS; index++) {
    const [x, y] = polar(cx, cy, radius, angleOf(index) + spin);
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
    const target = fromData ? tenantData(index) : holder;
    prims.push(edge(`tenant-link-${index}`, tenant, target, { opacity: 0.6, parent: tenant }));
    if (flows) {
      prims.push(
        flow(`tenant-flow-${index}`, tenant, target, t * FLOW_RATE + hash(`flow-${index}`), ROLES.data, {
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
  { kind: 'body', id: 'org', x, y, r: 16, well: ORG_WELL, opacity: fade },
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
  { kind: 'body', id: 'org', x: cx, y: cy, r: 170 * scale, well: ORG_WELL },
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
        // Named inside its circle, so the team and its name read as one thing.
        label(`team-label-${id}`, cx + at[0] * scale, cy + at[1] * scale, id, {
          size: Math.max(11, Math.round(17 * scale)),
          weight: 600,
          parent: `node:team-${id}`,
        }),
      ])
    : []),
];

const appAt = (app: string, cx: number, cy: number, radius: number, spin = 0): [number, number] =>
  polar(cx, cy, radius, -Math.PI / 2 + (APPS.indexOf(app) / APPS.length) * TAU + spin);

/**
 * One app: a small vendor, a colored ring holding a share of your data at its centre, named on its outer side (`angle` points away
 * from what it orbits).
 */
const app = (name: string, x: number, y: number, r: number, angle: number, { title = 1 } = {}): Prim[] => {
  // The name sits beside the ring, on the side away from the centre: right on the right half, left on the left.
  const side = Math.cos(angle) >= -1e-6 ? 1 : -1;
  return [
    { kind: 'ring', id: `app-${name}`, x, y, r, color: APP_COLORS[name] },
    { kind: 'node', id: `data-org-${name}`, x, y, r: r * 0.28, role: 'data', parent: `ring:app-${name}` },
    label(`app-label-${name}`, x + side * (r + 12), y, name, {
      size: Math.max(14, r * 0.6),
      weight: 500,
      anchor: side > 0 ? 'start' : 'end',
      opacity: title,
      parent: `ring:app-${name}`,
    }),
  ];
};

const appAngle = (name: string, spin = 0) => -Math.PI / 2 + (APPS.indexOf(name) / APPS.length) * TAU + spin;

/** The apps in a ring around a centre: every app is another SaaS vendor. */
const appRing = (cx: number, cy: number, radius: number, { scale = 1, spin = 0 } = {}): Prim[] =>
  APPS.flatMap((name) => {
    const [x, y] = appAt(name, cx, cy, radius, spin);
    return app(name, x, y, APP_R * scale, appAngle(name, spin));
  });

/** Your company's link to each app, with the app's data flowing to you in its color when `t` is given. */
const appLinks = (t?: number): Prim[] =>
  APPS.flatMap((app): Prim[] => {
    const link = edge(`link-org-${app}`, 'body:org', `ring:app-${app}`, { opacity: 0.7, parent: `ring:app-${app}` });
    if (t === undefined) {
      return [link];
    }
    return [
      link,
      flow(`flow-${app}`, `ring:app-${app}`, 'body:org', t * FLOW_RATE + hash(app), APP_COLORS[app], {
        count: 2,
        size: 5,
        parent: `ring:app-${app}`,
      }),
    ];
  });

/** A frontier lab with its gold core of everyone's data. */
const lab = (x: number, y: number, r: number, { core = 0, title = true, coreTitle = true } = {}): Prim[] => [
  { kind: 'body', id: 'lab', x, y, r, role: 'lab', well: LAB_WELL },
  ...(core > 0
    ? [
        { kind: 'node', id: 'lab-core', x, y, r: core, role: 'data', glow: 0.2, parent: 'body:lab' } satisfies Prim,
        ...(coreTitle
          ? [
              label('lab-core-label', x, y, '“Metadata”', {
                size: Math.min(30, core / 4),
                weight: 600,
                parent: 'node:lab-core',
              }),
            ]
          : []),
      ]
    : []),
  ...(title
    ? [
        label('lab-label', x, y - r - 34, 'Frontier Labs', {
          size: 30,
          parent: 'body:lab',
        }),
      ]
    : []),
];

const SPACE_OBJECT_COUNT = 28;
const SPACE_NEIGHBOURS = 2;
const SPACE_BRIDGES = 2;

/**
 * The objects in each space on the hypergraph: a sunflower spiral packs them evenly, and a seeded jitter keeps the
 * pattern from reading as a grid.
 */
const SPACE_OBJECTS = Object.fromEntries(
  SPACES.map(({ id, at, r }) => {
    // Larger spaces hold more objects at the same density.
    const count = Math.round(SPACE_OBJECT_COUNT * (r / 40) ** 2);
    const turn = hash(`turn-${id}`) * TAU;
    const points = Array.from({ length: count }, (_, index): [number, number] => {
      const radius = r * 0.7 * Math.sqrt((index + 0.5) / count);
      const [x, y] = polar(at[0], at[1], radius, index * 2.39996 + turn);
      return polar(x, y, 2.2 * hash(`jitter-${id}-${index}`), hash(`heading-${id}-${index}`) * TAU);
    });
    return [id, points];
  }),
);

const distance = ([x1, y1]: readonly [number, number], [x2, y2]: readonly [number, number]) =>
  Math.hypot(x2 - x1, y2 - y1);

/** Each object links to its nearest neighbours, so a space reads as one graph without a web of crossings. */
const spaceLinks = (id: string): [number, number][] => {
  const points = SPACE_OBJECTS[id];
  const pairs = new Set<string>();
  points.forEach((point, index) => {
    points
      .map((other, otherIndex) => ({ otherIndex, gap: distance(point, other) }))
      .filter(({ otherIndex }) => otherIndex !== index)
      .sort((left, right) => left.gap - right.gap)
      .slice(0, SPACE_NEIGHBOURS)
      .forEach(({ otherIndex }) => pairs.add(`${Math.min(index, otherIndex)}:${Math.max(index, otherIndex)}`));
  });
  return [...pairs].map((pair): [number, number] => {
    const [first, second] = pair.split(':').map(Number);
    return [first, second];
  });
};

/**
 * The objects of one space nearest another space: the ends of the links that bridge them, ordered across the line
 * between the spaces so the bridges never cross.
 */
const facing = (
  id: string,
  toward: readonly [number, number],
  [from, to]: readonly [readonly [number, number], readonly [number, number]],
) =>
  SPACE_OBJECTS[id]
    .map((point, index) => ({ index, point, gap: distance(point, toward) }))
    .sort((left, right) => left.gap - right.gap)
    .slice(0, SPACE_BRIDGES)
    .map(({ index, point }) => ({
      index,
      across: (point[0] - from[0]) * (from[1] - to[1]) + (point[1] - from[1]) * (to[0] - from[0]),
    }))
    .sort((left, right) => left.across - right.across)
    .map(({ index }) => index);

/** The ECHO hypergraph in your data: three spaces, each a graph of objects, with a few links between spaces. */
const spaces = ({ subs = 1 } = {}): Prim[] => [
  ...SPACES.flatMap(({ id, at, r }): Prim[] => [
    { kind: 'body', id: `space-${id}`, x: at[0], y: at[1], r, parent: 'node:hub' },
    ...SPACE_OBJECTS[id].map(([x, y], index): Prim => ({
      kind: 'node',
      id: `sub-${id}-${index}`,
      x,
      y,
      r: 1.3 + hash(`sub-size-${id}-${index}`) * 0.7,
      color: OBJECT_GREY,
      glow: -0.35,
      opacity: subs,
      parent: `body:space-${id}`,
    })),
    ...spaceLinks(id).map(([first, second]) =>
      edge(`sub-link-${id}-${first}-${second}`, `node:sub-${id}-${first}`, `node:sub-${id}-${second}`, {
        color: OBJECT_GREY,
        opacity: subs,
        parent: `body:space-${id}`,
      }),
    ),
  ]),
  ...SPACES.flatMap((from, index) =>
    SPACES.slice(index + 1).flatMap((to) => {
      const ends = facing(to.id, from.at, [from.at, to.at]);
      return facing(from.id, to.at, [from.at, to.at]).map((start, bridge) =>
        edge(
          `sub-bridge-${from.id}-${to.id}-${bridge}`,
          `node:sub-${from.id}-${start}`,
          `node:sub-${to.id}-${ends[bridge]}`,
          {
            color: OBJECT_GREY,
            opacity: subs,
            parent: `body:space-${from.id}`,
          },
        ),
      );
    }),
  ),
];

const OBJECT_COLOR = (index: number) => OBJECT_PALETTE[Math.floor(hash(`object-${index}`) * OBJECT_PALETTE.length)];
const OBJECT_GREY = '#c9ced6';

/**
 * The company space's own objects from the hypergraph, close up: the same nodes and links, turning slowly about the
 * space's centre and taking on their colors (`color` 0–1).
 */
const objects = (
  spin: number,
  { dim = 1, picked = {}, color = 1 }: { dim?: number; picked?: Record<number, number>; color?: number } = {},
): Prim[] => {
  const { id, at } = COMPANY_SPACE;
  const turned = (index: number) => {
    const [x, y] = SPACE_OBJECTS[id][index];
    return polar(at[0], at[1], Math.hypot(x - at[0], y - at[1]), Math.atan2(y - at[1], x - at[0]) + spin);
  };
  return [
    ...SPACE_OBJECTS[id].map((_, index): Prim => {
      const [x, y] = turned(index);
      const pick = picked[index];
      return {
        kind: 'node',
        id: `sub-${id}-${index}`,
        x,
        y,
        r: (1.3 + hash(`sub-size-${id}-${index}`) * 0.7) * (pick ?? 1),
        color: `color-mix(in oklab, ${OBJECT_COLOR(index)} ${Math.round(color * 100)}%, ${OBJECT_GREY})`,
        glow: pick === undefined ? -0.35 : 0.4,
        opacity: pick === undefined ? dim : 1,
        parent: `body:space-${id}`,
      };
    }),
    ...spaceLinks(id).map(([first, second]) =>
      edge(`sub-link-${id}-${first}-${second}`, `node:sub-${id}-${first}`, `node:sub-${id}-${second}`, {
        color: OBJECT_GREY,
        opacity: dim,
        parent: `body:space-${id}`,
      }),
    ),
  ];
};

const echoTitle = (): Prim[] => [
  label('echo-title', 120, 500, 'ECHO', { screen: true, size: 72, weight: 700, anchor: 'start' }),
  label('echo-subtitle', 124, 560, 'HYPERGRAPH', {
    screen: true,
    size: 22,
    width: 192,
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

/** The edge of each card that its link meets, in screen pixels. */
const CARD_EDGES: Record<string, [number, number]> = {
  'card-update': [1460, 140],
  'card-review': [1460, 700],
  'card-launch': [460, 140],
  'card-blockers': [460, 480],
  'card-pricing': [460, 700],
  'card-faq': [460, 950],
};

/** The object each card belongs to: a different one for each card, out toward the card from the space's centre. */
const CARD_OBJECTS: Record<string, { object: number; edge: [number, number] }> = (() => {
  const { id, at, r } = COMPANY_SPACE;
  const taken = new Set<number>();
  return Object.fromEntries(
    Object.entries(CARD_EDGES).map(([card, cardEdge]) => {
      const toward = polar(at[0], at[1], r * 0.5, Math.atan2(cardEdge[1] - HEIGHT / 2, cardEdge[0] - WIDTH / 2));
      const object = SPACE_OBJECTS[id]
        .map((point, index) => ({ index, gap: distance(point, toward) }))
        .filter(({ index }) => !taken.has(index))
        .sort((left, right) => left.gap - right.gap)[0].index;
      taken.add(object);
      return [card, { object, edge: cardEdge }];
    }),
  );
})();

const NOTES = [
  { space: 'Company', lines: ['Who owns this?', 'Ops, since Monday.'], at: 1.4, side: 1 },
  { space: 'Customers', lines: ['Tag the customer.', 'Tagged: Acme.'], at: 3.6, side: 1 },
  { space: 'Personal', lines: ['Draft is ready.', 'Reviewing now.'], at: 5.8, side: -1 },
];

/** Short conversations beside the spaces: people and agents at work all over the graph. */
const notes = (t: number): Prim[] =>
  NOTES.flatMap(({ space, lines, at, side }) => {
    const { at: home, r } = SPACES.find((candidate) => candidate.id === space) ?? COMPANY_SPACE;
    return lines.map((line, index): Prim => {
      const start = at + index * 0.9;
      const shown = ramp(t, start, 0.4) * (1 - ramp(t, at + 3.4, 0.6));
      return {
        kind: 'chip',
        id: `note-${space}-${index}`,
        x: home[0] + side * (r + 34),
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
      draw: (_t, real = _t) =>
        still([
          ...silo(),
          flow('flow-up', 'node:your-teams', 'node:data-org', real * FLOW_RATE, ROLES.team, { count: 3 }),
          flow('flow-down', 'node:data-org', 'node:your-teams', real * FLOW_RATE + 0.17, ROLES.data, { count: 3 }),
        ]),
    },

    // The vendor grows by holding the data of every company; yours is one company in its ring.
    { id: 'scale', transition: 3.0, draw: () => still(scale(0, false)) },
    {
      id: 'competitors',
      draw: (t, real = t) =>
        still([
          ...scale(real, true),
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
    { id: 'spread-comms', draw: (t, real = t) => still(spread(real), camera(1, ...YOURS_AT)) },

    // A frontier lab arrives, far bigger than every other vendor.
    { id: 'frontier', transition: 2.5, draw: () => still(frontier()) },
    {
      id: 'frontier-comms',
      // Everything your teams do flows to the lab along your company's one link to it, and the lab's data grows.
      draw: (t, real = t) =>
        still([
          ...frontier(real, ramp(t, 0.5, 11, easeInOut)),
          ...TEAMS.map(({ id }, index) =>
            flow(`flow-${id}-lab`, 'body:org', 'node:lab-core', real * FLOW_RATE + index / 3, ROLES.data, {
              count: 2,
              size: 5,
              parent: 'body:org',
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
        const taken = APPS.map((_, index) => ramp(t, 0.5 + index * 0.85, 2.0, easeInOut));
        return still(orbit(spin, taken));
      },
    },

    // Two more labs grow out of the first; they will merge back into one.
    // A cut, not a morph: the labs that appear are new players, not parts of the one before.
    { id: 'rivals', transition: 0, draw: () => still(rivals(0, 0)) },
    {
      id: 'merge-1',
      draw: (t) => still(rivals(ramp(t, 0.5, 4.0, easeInOut), ramp(t, 5.0, 4.5, easeInOut))),
    },
    {
      id: 'final-frontier',
      draw: (t) =>
        still([
          ...merged(t * 0.02),
          // The last lab's name becomes the title: it rises and grows as one text gives way to the other.
          ...finalTitle(ramp(t, 0.4, 1.4, easeInOut)),
        ]),
    },

    // The lab grows until it is all there is.
    {
      id: 'engulf',
      draw: (t) => {
        const r = lerp(175, 1800, ramp(t, 0.6, 6.4, easeInOut));
        // Everything fades where it is into the empty field of the next scene.
        return still(
          [
            ...merged(since('final-frontier', t) * 0.02, r),
            {
              kind: 'title',
              id: 'welcome',
              x: 0,
              y: 0,
              text: 'Welcome to the Singularity',
              size: 80,
              opacity: ramp(t, 8.5, 1.0),
            } satisfies Prim,
          ].map((prim): Prim => ({ ...prim, exit: 'fade' })),
        );
      },
    },
    {
      id: 'dont-panic',
      transition: 1.0,
      draw: (t) =>
        still([
          {
            kind: 'title',
            id: 'dont-panic',
            x: 0,
            y: 0,
            text: 'THE ALTERNATIVE',
            size: 80,
            color: neu.muted,
            opacity: ramp(t, 3.5, 1.0),
          },
        ]),
    },

    // After the curtain: your company and its apps again; then ECHO puts your data at its centre.
    { id: 'spread-again', transition: 1.6, draw: () => still(appsAround()) },
    { id: 'echo-hub', transition: 2.0, draw: (t) => still(hub(undefined, ramp(t, 0.5, 4.0, easeInOut))) },
    { id: 'echo-spaces', transition: 2.5, draw: () => still(echoSpaces(), camera(ECHO_ZOOM)) },

    // Inside a space: a graph of objects, and the work people and agents do on them.
    {
      id: 'objects',
      transition: 2.5,
      draw: (t) =>
        still(
          [...companySpace(), ...objects(t * OBJECT_SPIN, { color: ramp(t, 0.8, 1.5, easeInOut) })],
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
            a: `node:sub-${COMPANY_SPACE.id}-${object}`,
            screen2: true,
            hot: prim.accent,
            opacity: prim.opacity,
          };
        });
        return still(
          [...companySpace(), ...objects(spin, { dim: 0.28, picked }), ...links, ...cards],
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
        const taken = APPS.map((_, index) => ramp(t, 0.6 + index * 0.95, 2.0, easeInOut));
        return still(hub(taken));
      },
    },

    // Your company, holding everything, fills the frame; then the lockup.
    {
      id: 'company-fills',
      draw: (t) => {
        const grow = ramp(t, 0.2, 1.5, easeInOut);
        const field = ramp(t, 1.4, 0.5);
        return still([
          { kind: 'body', id: 'org', x: 0, y: 0, r: lerp(170, 1300, grow), well: ORG_WELL, opacity: 1 - field },
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
          // As your data fills the frame its shading gives way to its light centre color, so it never darkens.
          {
            kind: 'node',
            id: 'hub-light',
            x: 0,
            y: 0,
            r: lerp(150, 1300, grow),
            color: DATA_LIGHT,
            glow: 0,
            opacity: grow,
            parent: 'node:hub',
          },
          label('org-label', 0, -170 - 32, 'Your company', { size: 30, opacity: 1 - ramp(t, 0.2, 0.5) }),
          label('hub-label', 0, 0, 'Your data', { size: 30, opacity: 1 - ramp(t, 0.2, 0.5), parent: 'node:hub' }),
          // The field takes the light yellow of your data's lit centre, so filling the frame never darkens it, then
          // clears to a warm off-white for the logo.
          { kind: 'fill', id: 'field', color: DATA_LIGHT, screen: true, opacity: field },
          { kind: 'fill', id: 'field-white', color: '#efede6', screen: true, opacity: ramp(t, 2.0, 0.8, easeInOut) },
          {
            kind: 'logo',
            id: 'logo',
            x: WIDTH / 2,
            y: HEIGHT / 2 - 70,
            width: 560,
            dark: true,
            screen: true,
            opacity: ramp(t, 2.8, 0.6),
          },
          ...['Your team', 'Your apps', 'Your data'].map((text, index): Prim =>
            label(`tag-${index}`, WIDTH / 2 + (index - 1) * 220, HEIGHT / 2 + 130, text, {
              screen: true,
              size: 34,
              weight: 500,
              color: PALETTE.graphite,
              plain: true,
              logotype: true,
              // Two seconds after the expansion, one beat (a second) per tag.
              opacity: ramp(t, 3.7 + index, 0.5),
            }),
          ),
          // A second after the last tag: what it runs on.
          // “Powered by” sits on the wordmark's baseline (1019 px; its own baseline is 0.32 em below its centre), and the
          // pair is centred together.
          label('powered-by', WIDTH / 2 - 61, 1019 - 0.32 * 16, 'Powered by', {
            screen: true,
            size: 16,
            weight: 500,
            color: PALETTE.graphite,
            plain: true,
            anchor: 'end',
            opacity: ramp(t, 6.7, 0.6),
          }),
          {
            kind: 'logo',
            id: 'cloudflare',
            x: WIDTH / 2 + 48,
            y: HEIGHT - 92,
            width: 190,
            src: 'brand/cloudflare.png',
            aspect: 512 / 173,
            screen: true,
            opacity: ramp(t, 6.7, 0.6),
          },
        ]);
      },
    },
  ];
};

//
// Scene layouts.
//

const silo = (): Prim[] => [
  { kind: 'body', id: 'org', x: -300, y: 20, r: 150, well: ORG_WELL },
  // As broad a band as your company's, so the two read as equals.
  { kind: 'body', id: 'vendor', x: 300, y: 20, r: 150, role: 'lab', well: ORG_WELL },
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
    // The vendor's band narrows from the silo's as it grows (the default well, stated so it blends).
    { kind: 'body', id: 'vendor', x: 0, y: 0, r: 300, role: 'lab', well: 0.84 },
    { kind: 'node', id: 'metadata', x: 0, y: 0, r: 100, color: METADATA_COLOR, glow: 0.3, parent: 'body:vendor' },
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
  ...company(...YOURS_AT, 1, { title: false }),
  ...appRing(...YOURS_AT, 390),
  ...appLinks(t),
];

/** Your company and its apps beside a frontier lab, joined by one link; `grow` (0 … 1) grows the lab's data. */
const frontier = (t?: number, grow = 0): Prim[] => [
  ...company(...FRONTIER_AT, FRONTIER_SCALE),
  ...appRing(...FRONTIER_AT, 255, { scale: FRONTIER_SCALE }),
  ...appLinks(t),
  ...lab(...LAB_AT, 210, { core: lerp(66, 120, grow) }),
  edge('link-org-lab', 'body:org', 'node:lab-core', { parent: 'body:org' }),
];

/** The first part of a merge (0 … 0.4 of `k`) brings two circles together; the rest shrinks one into the other. */
const phases = (k: number): [number, number] => [clamp(k / 0.4), clamp((k - 0.4) / 0.6)];

/** `[x, y]` at `distance` from `centre`, toward `toward`. */
const touching = (centre: readonly [number, number], toward: readonly [number, number], distance: number) => {
  const angle = Math.atan2(toward[1] - centre[1], toward[0] - centre[0]);
  return polar(centre[0], centre[1], distance, angle);
};

const lerpAt = (a: readonly [number, number], b: readonly [number, number], k: number): [number, number] => [
  lerp(a[0], b[0], k),
  lerp(a[1], b[1], k),
];

/**
 * `from` carried round `centre` to `radius` and `angle` (0 … `k` … 1), by distance and bearing from the centre: a path
 * that orbits the centre instead of cutting across it.
 */
const swing = (
  from: readonly [number, number],
  centre: readonly [number, number],
  radius: number,
  angle: number,
  k: number,
): [number, number] => {
  const bearing = Math.atan2(from[1] - centre[1], from[0] - centre[0]);
  const distance = Math.hypot(from[0] - centre[0], from[1] - centre[1]);
  return polar(centre[0], centre[1], lerp(distance, radius, k), turnTo(bearing, angle, k));
};

/**
 * The lab at the centre; the apps orbit inside it, around its core of data. `taken` (per app, 0 … 1) brings each app
 * in until its rim touches the core, then shrinks it into the core, which grows, the rims touching all the while.
 */
const orbit = (spin: number, taken: number[] = APPS.map(() => 0)): Prim[] => {
  const shrink = taken.map((k) => phases(k)[1]);
  const growth = shrink.reduce((sum, k) => sum + k, 0) / APPS.length;
  const core = 110 + 60 * growth;
  return [
    ...lab(0, 0, 290, { core, coreTitle: false, title: false }),
    label('lab-label', 0, -290 - 34, 'Frontier Labs', { size: 30, parent: 'body:lab' }),
    ...tenantRing(0, 0, 420, { holder: 'body:lab', labels: false, spin: spin * 0.4 }),
    ...APPS.flatMap((name, index): Prim[] => {
      const [move, take] = phases(taken[index]);
      const size = APP_R * (1 - take);
      const angle = appAngle(name, spin);
      // The apps ride the middle of the lab's band (between its well and its rim).
      const [x, y] = polar(0, 0, lerp((290 * (1 + LAB_WELL)) / 2, core + size, move), angle);
      return app(name, x, y, size, angle, { title: 1 - move });
    }),
  ];
};

/** Where the three labs start; a lab that merges takes the size and place of the one it merges into. */
const LABS = { top: [0, -190], left: [-330, 200], right: [330, 200] } as const;

const PER_LAB = TENANTS / 3;
const direction = (from: readonly [number, number], to: readonly [number, number]) =>
  Math.atan2(to[1] - from[1], to[0] - from[0]);
const turnTo = (from: number, to: number, k: number) => from + Math.atan2(Math.sin(to - from), Math.cos(to - from)) * k;

/** Each lab's companies, evenly round it, before any merge. */
const startAngle = (index: number) => (Math.floor(index / 3) / PER_LAB) * TAU + (index % 3) * 2.1;

/**
 * As lab X meets lab Y, X's companies spread evenly over the arc of X facing away from Y, and Y's over Y's far arc;
 * each arc's share of the circle is its lab's share of the companies, so when X is gone they are the two parts of one
 * evenly spaced ring. A company keeps its order on its ring (counted from the point facing the other lab), so none
 * crosses another.
 */
const arcAngles = (indices: number[], angleOf: (index: number) => number, facing: number, share: number) => {
  const order = [...indices].sort(
    (a, b) => ((((angleOf(a) - facing) % TAU) + TAU) % TAU) - ((((angleOf(b) - facing) % TAU) + TAU) % TAU),
  );
  return new Map(
    order.map((index, rank) => [index, facing + Math.PI * (1 - share) + ((rank + 0.5) / order.length) * TAU * share]),
  );
};

const GROUPS = [0, 1, 2].map((group) => Array.from({ length: PER_LAB }, (_, slot) => slot * 3 + group));
/** The first merge: left (group 1) into right (group 2). */
const LEFT_TO_RIGHT = direction(LABS.left, LABS.right);
const FIRST = new Map([
  ...arcAngles(GROUPS[1], startAngle, LEFT_TO_RIGHT, 0.5),
  ...arcAngles(GROUPS[2], startAngle, LEFT_TO_RIGHT + Math.PI, 0.5),
]);
/** The second merge: right (groups 1 and 2) into top (group 0). */
const RIGHT_TO_TOP = direction(LABS.right, LABS.top);
const SECOND = new Map([
  ...arcAngles([...GROUPS[1], ...GROUPS[2]], (index) => FIRST.get(index) ?? 0, RIGHT_TO_TOP, 2 / 3),
  ...arcAngles(GROUPS[0], startAngle, RIGHT_TO_TOP + Math.PI, 1 / 3),
]);
/** Where every company sits round the one lab left. */
const mergedAngle = (index: number) => SECOND.get(index) ?? 0;

/**
 * Three frontier labs, each with a third of the companies. `first` brings the left lab to the right one until their rims
 * touch, then shrinks it into it; `second` does the same with the right lab and the top one, which ends at the centre.
 */
const rivals = (first: number, second: number): Prim[] => {
  const [firstMove, firstTake] = phases(first);
  const [secondMove, secondTake] = phases(second);
  const topR = lerp(105, 175, secondTake);
  const top: [number, number] = [0, lerp(LABS.top[1], 0, second)];
  const rightR = lerp(105, 130, firstTake) * (1 - secondTake);
  const right = lerpAt(LABS.right, touching(top, LABS.right, topR + rightR), secondMove);
  const leftR = 105 * (1 - firstTake);
  const left = lerpAt(LABS.left, touching(right, LABS.left, rightR + leftR), firstMove);
  const ring = (r: number) => r + 45 + 30 * secondTake;
  const prims: Prim[] = [
    { kind: 'body', id: 'lab', x: top[0], y: top[1], r: topR, role: 'lab', well: LAB_WELL },
    ...(secondTake < 1
      ? [
          {
            kind: 'body',
            id: 'rival-2',
            x: right[0],
            y: right[1],
            r: rightR,
            role: 'lab',
            well: LAB_WELL,
          } satisfies Prim,
        ]
      : []),
    ...(firstTake < 1
      ? [{ kind: 'body', id: 'rival-1', x: left[0], y: left[1], r: leftR, role: 'lab', well: LAB_WELL } satisfies Prim]
      : []),
    label('lab-label', top[0], top[1] - ring(topR) - 34, 'Frontier Lab', { size: 26, parent: 'body:lab' }),
    label('rival-1-label', left[0], left[1] - ring(leftR) - 34, 'Frontier Lab', {
      size: 26,
      opacity: 1 - firstMove,
      parent: 'body:rival-1',
    }),
    label('rival-2-label', right[0], right[1] - ring(rightR) - 34, 'Frontier Lab', {
      size: 26,
      opacity: 1 - secondMove,
      parent: 'body:rival-2',
    }),
  ];
  for (let index = 0; index < TENANTS; index++) {
    const group = index % 3;
    const start = startAngle(index);
    // Each lab's companies spread over its far side as it meets another lab; as their lab shrinks into the other they
    // swing round the other's centre onto their place in its ring.
    let x: number;
    let y: number;
    if (group === 0) {
      [x, y] = polar(...top, ring(topR), turnTo(start, mergedAngle(index), secondMove));
    } else {
      const first = FIRST.get(index) ?? start;
      const angle = turnTo(turnTo(start, first, firstMove), mergedAngle(index), secondMove);
      const own =
        group === 1
          ? swing(polar(...left, ring(leftR), angle), right, ring(rightR), angle, firstTake)
          : polar(...right, ring(rightR), angle);
      [x, y] = swing(own, top, ring(topR), angle, secondTake);
    }
    // A company passing to another lab's ring hands its link over halfway, and the link fades out and back in around
    // the handover, so it never cuts across a lab.
    const passing = group === 0 ? 0 : group === 2 || firstTake >= 1 ? secondTake : firstTake;
    const holder =
      group === 0 || secondTake >= 0.5 ? 'body:lab' : group === 2 || firstTake >= 0.5 ? 'body:rival-2' : 'body:rival-1';
    const tenant = index === YOURS ? 'body:org' : `node:tenant-${index}`;
    if (index === YOURS) {
      prims.push(...yoursInRing(x, y, { labels: false }));
    } else {
      prims.push({ kind: 'node', id: `tenant-${index}`, x, y, r: 7, color: TENANT_COLOR, glow: -0.2 });
    }
    prims.push(
      edge(`tenant-link-${index}`, tenant, holder, { opacity: 0.45 * Math.abs(1 - 2 * passing), parent: tenant }),
    );
  }
  return prims;
};

/** The last lab's name, above its ring of companies, turning into the title as `k` goes to 1. */
const finalTitle = (k: number): Prim[] => {
  const y = lerp(-284, -340, k);
  return [
    // One text leaves before the other arrives, so the two are never on screen at once.
    label('lab-label', 0, y, 'Frontier Lab', { size: lerp(26, 64, k), opacity: clamp(1 - 2 * k) }),
    {
      kind: 'title',
      id: 'final-title',
      x: 0,
      y,
      text: 'The Final Frontier',
      size: lerp(26, 64, k),
      opacity: clamp(2 * k - 1),
    },
  ];
};

/** The one lab left, with every company around it; `r` grows it until it swallows them. */
const merged = (spin: number, r = 175): Prim[] => {
  // The companies vanish as the lab's edge reaches them.
  const fade = clamp((250 - r) / 40);
  return [
    ...lab(0, 0, r, { title: false }),
    ...tenantRing(0, 0, 250, { holder: 'body:lab', labels: false, spin, fade, angleOf: mergedAngle }),
  ];
};

/** How far your apps sit from your company once you keep your data: close in, as a team's own tools. */
const AROUND_R = 300;

/** Your company at the centre with its apps, each holding a share of your data and linked to your company. */
const appsAround = (): Prim[] => [
  ...company(0, 0, 1, { teams: false }),
  ...appRing(0, 0, AROUND_R),
  ...APPS.map((app) =>
    edge(`link-org-${app}`, 'body:org', `ring:app-${app}`, { opacity: 0.7, parent: `ring:app-${app}` }),
  ),
];

/**
 * ECHO in your company: your data grows at its centre (`size`, 0 … 1) while every app, linked to your company, still
 * holds its share. `taken` (per app, 0 … 1) folds each app, with its share, into your data.
 */
const hub = (taken: number[] = APPS.map(() => 0), size = 1): Prim[] => {
  const growth = taken.reduce((sum, k) => sum + k, 0) / APPS.length;
  return [
    ...company(0, 0, 1, { teams: false }),
    {
      kind: 'node',
      id: 'hub',
      x: 0,
      y: 0,
      r: lerp(24, 120, size) + 30 * growth,
      role: 'data',
      glow: 0.2 + 0.3 * growth,
      parent: 'body:org',
    },
    label('hub-label', 0, 0, 'Your data', { size: 30, opacity: ramp(size, 0.6, 0.4), parent: 'node:hub' }),
    ...APPS.flatMap((name, index): Prim[] => {
      const k = taken[index];
      const [x, y] = appAt(name, 0, 0, AROUND_R);
      return [
        // Each app folds into your data with the share it held.
        ...app(name, lerp(x, 0, k), lerp(y, 0, k), APP_R * (1 - k), appAngle(name), { title: 1 - k }),
        edge(`link-org-${name}`, 'body:org', `ring:app-${name}`, { opacity: 0.7, parent: `ring:app-${name}` }),
      ];
    }),
  ];
};

/** The hypergraph in your company; as the camera dives into one space the rest fades where it is (`exit: 'fade'`). */
const echoSpaces = ({ subs = 1, titles = true }: { subs?: number; titles?: boolean } = {}): Prim[] =>
  [
    { kind: 'body', id: 'org', x: 0, y: 0, r: 170, well: ORG_WELL } satisfies Prim,
    {
      kind: 'node',
      id: 'hub',
      x: 0,
      y: 0,
      r: 110,
      role: 'data',
      glow: -0.3,
      opacity: 0.12,
      parent: 'body:org',
    } satisfies Prim,
    ...spaces({ subs }),
    ...(titles ? echoTitle() : []),
  ].map((prim): Prim => ({ ...prim, exit: 'fade' }));

/** The one space the camera enters, without the hypergraph around it. */
const companySpace = (): Prim[] => [
  {
    kind: 'body',
    id: `space-${COMPANY_SPACE.id}`,
    x: COMPANY_SPACE.at[0],
    y: COMPANY_SPACE.at[1],
    r: COMPANY_SPACE.r,
    parent: 'node:hub',
  },
];
