//
// Copyright 2026 DXOS.org
//

//
// The echo3d presentation (tools/autocue/showcase/echo3d) rebuilt as an animator Animation over spacetime scenes
// (plugin-animator scenario T-4). Four scenes hold the prototype's objects at rest; each slide is a shot whose script
// moves them, with effects and screen text where the prototype had them. Slides covered, by echo3d view id:
// beginning, silo, silo-comms, spread, frontier, frontier-comms, absorb, merge-1 + merge-2 + final-frontier (one shot),
// engulf, echo-spaces, object-thread, company-fills.
//

import { Obj, Ref } from '@dxos/echo';
import * as Animation from '@dxos/plugin-animator/Animation';
import { makeBuiltinEffect } from '@dxos/plugin-animator/testing';

import { Model, Scene } from '#types';

import { fitRadius, labelMorphBeats, packGeometry } from '../animator/index.ts';

//
// Model (echo3d model.js), in the prototype's units: a sphere's `size` is its radius.
//

const ORG_RADIUS = 27;
const APPS = ['Google Workspace', 'Slack', 'Notion', 'Salesforce', 'Jira', 'HubSpot', 'Workday'];
const TEAMS: [string, string, number][] = [
  ['Eng', '#5b8def', 7.5],
  ['Sales', '#2fbf71', 5.5],
  ['Ops', '#e57bd1', 3.8],
];
const TEAM_APPS: Record<string, string[]> = {
  Eng: ['Slack', 'Jira', 'Notion'],
  Sales: ['Salesforce', 'HubSpot', 'Google Workspace'],
  Ops: ['Workday', 'Google Workspace', 'Slack'],
};

const VIOLET = '#a07cf0';
const YELLOW = '#f5c542';
const COMPANY = '#8fa3d9';
const SHELL = 0.18;

/** Deterministic per-key random in [0, 1), as echo3d's `hashRandom`. */
export const hashRandom = (key: string): number => {
  let hash = 2166136261;
  for (const char of key) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  }
  return ((hash >>> 0) % 100000) / 100000;
};

type Point = { x: number; y: number; z: number };
const ORIGIN: Point = { x: 0, y: 0, z: 0 };

/** A sphere of radius `size` at rest at `position`. */
const sphere = (
  label: string,
  size: number,
  color: string,
  position: Point = ORIGIN,
  props: Partial<Pick<Model.Object, 'opacity' | 'labelStyle'>> = {},
): Model.Object =>
  Model.make({
    primitive: 'sphere',
    label,
    color,
    position,
    scale: { x: size * 2, y: size * 2, z: size * 2 },
    ...props,
  });

/** An object's resting scale times `factor`. */
const scaled = (object: Model.Object, factor: number) => ({
  x: object.scale.x * factor,
  y: object.scale.y * factor,
  z: object.scale.z * factor,
});

/** A point on the ground-plane circle of `radius` about `centre`; angle 0 is +x, π/2 the top of a top-down frame. */
const onCircle = (centre: Point, radius: number, angle: number): Point => ({
  x: centre.x + Math.cos(angle) * radius,
  y: centre.y,
  z: centre.z + Math.sin(angle) * radius,
});

const makeScene = (name: string, objects: readonly Model.Object[], links: Scene.Link[] = []): Scene.Scene =>
  Obj.make(Scene.Scene, { name, style: 'presentation', objects: objects.map((object) => Ref.make(object)), links });

const link = (from: Model.Object, to: Model.Object, opacity?: number): Scene.Link => ({
  id: `${from.id}-${to.id}`,
  from: from.id,
  to: to.id,
  ...(opacity === undefined ? {} : { opacity }),
});

//
// Camera poses: top-down (the prototype's default) and side-on, each framing a sphere of `fit` about `target`.
//

const TOP = { alpha: -Math.PI / 2, beta: 0.01 };
const SIDE = { alpha: -Math.PI / 2, beta: Math.PI / 2 - 0.12 };

const frame = (pose: { alpha: number; beta: number }, fit: number, target: Point = ORIGIN) => ({
  ...pose,
  radius: fitRadius(fit),
  target,
});

/** A beat that puts the shot into a state at once, for a slide that starts where the one before it ended. */
const instant = (beat: Omit<Animation.Beat, 'at' | 'duration'>): Animation.Beat => ({ at: 0, duration: 0.01, ...beat });

const ids = (objects: readonly Model.Object[]): string[] => objects.map((object) => object.id);

//
// Scene 1 (silo): your company beside the SaaS vendor that holds your data.
//

const siloScene = () => {
  const offset = ORG_RADIUS + 7;
  const org = sphere(
    'Your company',
    ORG_RADIUS,
    COMPANY,
    { x: -offset, y: 0, z: 0 },
    { opacity: SHELL, labelStyle: 'hero' },
  );
  const vendor = sphere('SaaS', ORG_RADIUS, VIOLET, { x: offset, y: 0, z: 0 }, { opacity: 0.12, labelStyle: 'hero' });
  const data = sphere('Your data', 9, YELLOW, vendor.position);
  const teams = sphere('Your teams', 9, '#5b8def', org.position);
  const owns = link(org, data, 1);
  return { scene: makeScene('Silo', [org, vendor, data, teams], [owns]), org, vendor, data, teams, owns };
};

//
// Scene 2 (spread → absorb): your company and its teams, your data spread across the apps, and the frontier lab.
//

const DATA_SCALE = 0.45;
const SHELL_RADIUS = 9 * DATA_SCALE * 1.6;
const SPREAD_RING = ORG_RADIUS + SHELL_RADIUS + 10;
const LAB_RADIUS = ORG_RADIUS * 1.4;
const LAB_OFFSET = ORG_RADIUS + LAB_RADIUS + 12;

const spreadScene = () => {
  const org = sphere('Your company', ORG_RADIUS, COMPANY, ORIGIN, { opacity: SHELL, labelStyle: 'hero' });
  const { distance } = packGeometry(TEAMS.length, ORG_RADIUS * 0.6);
  const teams = TEAMS.map(([label, color, size], index) => {
    const angle = (index / TEAMS.length) * Math.PI * 2 + Math.PI / 2 + Math.PI / TEAMS.length;
    return sphere(label, size, color, onCircle(ORIGIN, distance, angle));
  });
  const apps = APPS.map((label, index) =>
    sphere(label, SHELL_RADIUS, VIOLET, onCircle(ORIGIN, SPREAD_RING, (index / APPS.length) * Math.PI * 2), {
      opacity: 0.225,
    }),
  );
  const data = apps.map((app) => sphere('', 9 * DATA_SCALE, YELLOW, app.position));
  const lab = sphere(
    'Frontier Labs',
    LAB_RADIUS,
    VIOLET,
    { x: LAB_OFFSET, y: 0, z: 0 },
    { opacity: 0.22, labelStyle: 'hero' },
  );
  const labData = sphere('', 18, YELLOW, lab.position);
  const uses = TEAMS.flatMap(([team], index) => [
    ...TEAM_APPS[team].map((app) => link(teams[index], data[APPS.indexOf(app)], 0.3)),
    link(teams[index], labData, 0.3),
  ]);
  const scene = makeScene('Spread', [org, ...teams, ...apps, ...data, lab, labData], uses);
  return { scene, org, teams, apps, data, lab, labData, uses };
};

//
// Scene 3 (merge → engulf): three frontier labs, every company in the orbit of the one it relies on.
//

const RIVAL_RADIUS = ORG_RADIUS * 1.1;
const RIVAL_RING = ORG_RADIUS + RIVAL_RADIUS + 18;
const TENANTS = 36;
const ORBIT_COMPANY = 8;

const labsScene = () => {
  const labs = [0, 1, 2].map((index) =>
    sphere(
      'Frontier Labs',
      RIVAL_RADIUS,
      VIOLET,
      onCircle(ORIGIN, RIVAL_RING, Math.PI / 2 + (index * Math.PI * 2) / 3),
      { opacity: 0.22, labelStyle: 'hero' },
    ),
  );
  const companies = Array.from({ length: TENANTS }, (_, index) => {
    const home = labs[Math.floor(hashRandom(`tenant-${index}:lab`) * labs.length)];
    const angle = hashRandom(`tenant-${index}:angle`) * Math.PI * 2;
    const ring = 1.35 + (index % 2) * 0.3;
    return sphere('', ORBIT_COMPANY / 3, COMPANY, onCircle(home.position, RIVAL_RADIUS * ring, angle));
  });
  const yours = sphere('', ORBIT_COMPANY / 2, COMPANY, onCircle(labs[1].position, RIVAL_RADIUS * 1.5, Math.PI), {
    opacity: 0.6,
  });
  return { scene: makeScene('Frontier labs', [...labs, ...companies, yours]), labs, companies: [...companies, yours] };
};

//
// Scene 4 (ECHO): your company holding ECHO, the hypergraph of nested spaces, and a space's graph of objects.
//

const ECHO_RADIUS = ORG_RADIUS * 0.5 * 1.3;
const SPACES = [
  {
    label: 'Company',
    children: [
      { label: 'Engineering', children: [{ label: 'Platform' }, { label: 'Apps' }] },
      { label: 'Sales', children: [{ label: 'EMEA' }, { label: 'US' }] },
      { label: 'Ops' },
    ],
  },
  { label: 'Customers', children: [{ label: 'Acme' }, { label: 'Globex' }, { label: 'Initech' }] },
  { label: 'Partners', children: [{ label: 'Cloudflare' }, { label: 'Agency' }] },
  { label: 'Personal', children: [{ label: 'Notes' }, { label: 'Inbox' }] },
];
type SpaceSpec = { label: string; children?: SpaceSpec[] };
const SPACE_STYLE = [
  { color: '#4f6bd8', opacity: 0.22 },
  { color: '#7b96ff', opacity: 0.4 },
  { color: '#b4c4ff', opacity: 1 },
];
const OBJECT_PALETTE = ['#4f8dff', '#3ccf6e', '#ff8a3d', '#a66bff', '#22c7c7', '#f2c230', '#ff5fa2', '#7fa3ff'];

const echoScene = () => {
  const org = sphere('Your company', ORG_RADIUS, COMPANY, ORIGIN, { opacity: SHELL, labelStyle: 'hero' });
  const hub = sphere('Your data', ECHO_RADIUS, YELLOW, ORIGIN, { opacity: 0.12, labelStyle: 'hero' });
  const spaces = new Map<string, Model.Object>();
  const addSpaces = (specs: readonly SpaceSpec[], centre: Point, radius: number, depth: number) => {
    const { distance, size } = packGeometry(specs.length, radius);
    specs.forEach((spec, index) => {
      const angle = (index / specs.length) * Math.PI * 2 + Math.PI / 2 + Math.PI / specs.length;
      const leaf = !spec.children?.length;
      const style = leaf ? SPACE_STYLE[2] : SPACE_STYLE[Math.min(depth, 1)];
      const space = sphere(depth <= 1 ? spec.label : '', size, style.color, onCircle(centre, distance, angle), {
        opacity: style.opacity,
        labelStyle: depth <= 1 ? 'plain' : 'hidden',
      });
      spaces.set(spec.label, space);
      if (spec.children) {
        addSpaces(spec.children, space.position, size, depth + 1);
      }
    });
  };
  addSpaces(SPACES, ORIGIN, ECHO_RADIUS * 0.95, 0);
  const platform = spaces.get('Platform');
  const platformRadius = platform ? platform.scale.x / 2 : 1;
  const centre = platform?.position ?? ORIGIN;
  // Objects in concentric shells inside the Platform space (echo3d's `shells`), the inner two levels.
  const unit = (platformRadius * 0.9) / 7;
  const objects: Model.Object[] = [];
  const children: Scene.Link[] = [];
  const levels = [1, 10, 28];
  levels.forEach((count, level) => {
    for (let index = 0; index < count; index++) {
      const y = level === 0 ? 0 : 1 - ((index + 0.5) / count) * 2;
      const ring = Math.sqrt(1 - y * y);
      const theta = index * 2.399963;
      const reach = level * 3 * unit;
      const id = `object-${level}-${index}`;
      const object = sphere(
        '',
        unit * 0.5 * 0.85 ** level,
        OBJECT_PALETTE[Math.floor(hashRandom(`${id}:colour`) * OBJECT_PALETTE.length)],
        {
          x: centre.x + Math.cos(theta) * ring * reach,
          y: centre.y + y * reach,
          z: centre.z + Math.sin(theta) * ring * reach,
        },
        { labelStyle: 'hidden' },
      );
      if (level > 0) {
        const parent = objects[level === 1 ? 0 : 1 + (index % levels[1])];
        children.push(link(parent, object, 0.6));
      }
      objects.push(object);
    }
  });
  const picked = objects[3];
  const hyperedges = [
    ['US', 'Acme'],
    ['EMEA', 'Globex'],
    ['Platform', 'Cloudflare'],
    ['Apps', 'Agency'],
    ['Notes', 'Engineering'],
    ['Inbox', 'Customers'],
  ].flatMap(([from, to]) => {
    const left = spaces.get(from);
    const right = spaces.get(to);
    return left && right ? [link(left, right, 0.5)] : [];
  });
  const scene = makeScene('ECHO', [org, hub, ...spaces.values(), ...objects], [...hyperedges, ...children]);
  return { scene, org, hub, spaces: [...spaces.values()], platform, objects, picked, hyperedges };
};

//
// Effects.
//

/** Packets both ways in bursts (echo3d's DATA_FLOW). */
const DATA_FLOW = { count: 8, both: true, speed: 0.45, size: 0.55 };

/** The DXOS logotype as an image headline, drawn as text so the fixture carries no asset. */
const DXOS_LOGO = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="360" height="96"><text x="0" y="80" font-family="sans-serif" ' +
    'font-size="96" font-weight="300" fill="#141414">DXOS</text></svg>',
)}`;

export type Echo3dFixture = {
  animation: Animation.Animation;
  scenes: Scene.Scene[];
  effects: Animation.Effect[];
};

/** The echo3d story as an Animation over four presentation-style spacetime scenes. */
export const makeEcho3dAnimation = (): Echo3dFixture => {
  const flow = makeBuiltinEffect('Packet flow (3D)');
  const burst = makeBuiltinEffect('Burst (3D)');
  const conversations = makeBuiltinEffect('Conversations');
  const callout = makeBuiltinEffect('Callout');
  const silo = siloScene();
  const spread = spreadScene();
  const labs = labsScene();
  const echo = echoScene();

  const shot = (scene: Scene.Scene, duration: number, props: Partial<Animation.Shot> = {}): Animation.Shot => ({
    ...Animation.makeShot(Ref.make(scene), duration),
    ...props,
  });

  //
  // Silo.
  //

  const siloAll = [silo.org, silo.vendor, silo.data, silo.teams];
  const siloCamera = frame(SIDE, ORG_RADIUS * 2 + 12);
  const beginning = shot(silo.scene, 4, {
    script: [
      instant({ hide: ids(siloAll), camera: siloCamera }),
      { at: 0.5, duration: 1, caption: 'In the Beginning' },
    ],
  });
  const siloShot = shot(silo.scene, 4, {
    transition: { kind: 'fade', duration: 0.5 },
    script: [
      instant({ hide: ids(siloAll), camera: siloCamera }),
      { at: 0.3, duration: 1.25, ease: 'ease-out', show: ids([silo.org, silo.vendor]) },
      { at: 1.2, duration: 1, ease: 'ease-out', show: ids([silo.data, silo.teams]) },
    ],
  });
  const siloComms = shot(silo.scene, 6, {
    script: [instant({ camera: siloCamera })],
    effects: [
      {
        id: 'silo-flow',
        effect: Ref.make(flow),
        params: { ...DATA_FLOW, count: 16, gap: [0.15, 0.7], alert: 0.12 },
        seed: 3,
      },
    ],
  });

  //
  // Spread, frontier, absorb.
  //

  const spreadCamera = frame(TOP, SPREAD_RING + SHELL_RADIUS + 10);
  const frontierCamera = frame(TOP, (LAB_OFFSET + LAB_RADIUS + SPREAD_RING + SHELL_RADIUS) / 2 + 8, {
    x: (LAB_OFFSET + LAB_RADIUS - SPREAD_RING - SHELL_RADIUS) / 2,
    y: 0,
    z: 0,
  });
  // The apps crowd onto the far side of your company, out of the lab's way.
  const crowd: Animation.Beat['layout'] = {
    kind: 'ring',
    targets: ids(spread.apps),
    params: { radius: SPREAD_RING, start: Math.PI / 2, span: Math.PI, centre: ORIGIN },
  };
  const spreadShot = shot(spread.scene, 5, {
    transition: { kind: 'fade', duration: 0.5 },
    script: [
      instant({ hide: ids([spread.lab, spread.labData, ...spread.apps, ...spread.data]), camera: spreadCamera }),
      { at: 0.5, duration: 1.5, ease: 'ease-out', show: ids([...spread.apps, ...spread.data]) },
    ],
  });
  const frontier = shot(spread.scene, 5, {
    script: [
      instant({ hide: ids([spread.lab, spread.labData]), camera: spreadCamera }),
      { at: 0.3, duration: 2, ease: 'ease-in-out', layout: crowd, camera: frontierCamera },
      { at: 1.3, duration: 1.5, ease: 'ease-out', show: ids([spread.lab, spread.labData]) },
    ],
  });
  const frontierComms = shot(spread.scene, 6, {
    script: [instant({ layout: crowd, camera: frontierCamera })],
    effects: [
      {
        id: 'frontier-flow',
        effect: Ref.make(flow),
        params: { ...DATA_FLOW, boost: { objects: [spread.labData.id], count: 16, gap: [0.1, 0.6] } },
        seed: 5,
      },
    ],
  });
  // Each app shrinks away where it stands while its data merges into the lab's, one after another.
  const absorb = shot(spread.scene, 6, {
    script: [
      instant({ layout: crowd, camera: frontierCamera }),
      // Not a `merge`: its area-preserving growth compounds over seven merges, where the lab's data only swells a little.
      ...spread.apps.map((app, index): Animation.Beat => ({
        at: 0.5 + index * 0.35,
        duration: 1.6,
        ease: 'ease-in-out',
        hide: [app.id, spread.data[index].id],
        set: { [spread.data[index].id]: { position: spread.labData.position } },
      })),
      {
        at: 0.5,
        duration: 4,
        ease: 'ease-in-out',
        set: { [spread.labData.id]: { scale: scaled(spread.labData, 1.3) } },
      },
      { at: 0.5, duration: 4, ease: 'ease-in-out', set: { [spread.lab.id]: { scale: scaled(spread.lab, 1.25) } } },
    ],
  });

  //
  // Merge and engulf.
  //

  const [lab, rival1, rival2] = labs.labs;
  const labsCamera = frame(TOP, RIVAL_RING + RIVAL_RADIUS * 1.75 + 14);
  const midpoint = {
    x: (lab.position.x + rival1.position.x) / 2,
    y: 0,
    z: (lab.position.z + rival1.position.z) / 2,
  };
  const orbitAll: Animation.Beat['layout'] = {
    kind: 'orbit',
    targets: ids(labs.companies),
    params: { centre: lab.id, gap: 14 },
  };
  // Each merge grows the survivor by area (√2 for one lab taken in), so after two it is twice its size.
  const merged = scaled(lab, 2);
  const merge = shot(labs.scene, 9, {
    transition: { kind: 'fade', duration: 0.5 },
    script: [
      instant({ camera: labsCamera }),
      // The survivor moves first in each pair, so the merging lab closes on where the survivor is going.
      { at: 0.5, duration: 2.5, ease: 'ease-in-out', set: { [lab.id]: { position: midpoint } } },
      { at: 0.5, duration: 2.5, ease: 'ease-in-out', merge: { from: [rival1.id], into: lab.id } },
      { at: 3.2, duration: 2.5, ease: 'ease-in-out', set: { [lab.id]: { position: ORIGIN } } },
      { at: 3.2, duration: 2.5, ease: 'ease-in-out', merge: { from: [rival2.id], into: lab.id } },
      { at: 3.6, duration: 2.2, ease: 'ease-in-out', layout: orbitAll },
      // The one lab left is renamed as its name swells to a title.
      { at: 6, duration: 0.8, set: { [lab.id]: { labelStyle: 'title' } } },
      ...labelMorphBeats({ target: lab.id, from: 'Frontier Labs', to: 'The Final Frontier', at: 6.3, duration: 2.6 }),
    ],
  });
  const engulfRadius = labsCamera.radius * 0.9;
  const engulf = shot(labs.scene, 9, {
    script: [
      instant({
        hide: [rival1.id, rival2.id],
        layout: orbitAll,
        camera: labsCamera,
        set: { [lab.id]: { position: ORIGIN, scale: merged, label: 'The Final Frontier', labelStyle: 'title' } },
      }),
      // The lab swells until it fills the frame, going solid as it does, and every company bursts as its edge arrives.
      {
        at: 0.5,
        duration: 5,
        ease: 'ease-in',
        set: {
          [lab.id]: {
            scale: { x: engulfRadius * 2, y: engulfRadius * 2, z: engulfRadius * 2 },
            opacity: 0.85,
            labelStyle: 'hidden',
          },
        },
      },
      { at: 2.2, duration: 2.5, ease: 'ease-in', hide: ids(labs.companies) },
      {
        at: 2,
        duration: 0.1,
        effects: {
          add: [
            {
              id: 'engulf-burst',
              effect: Ref.make(burst),
              params: { objects: ids(labs.companies), at: 0.4, duration: 1.2, spread: 3 },
              seed: 7,
            },
          ],
        },
      },
      { at: 3, duration: 0.1, curtain: { color: '#000000', fade: 1.5, hold: 1.2 } },
      { at: 6, duration: 1, caption: 'Welcome to the Singularity' },
    ],
  });

  //
  // ECHO.
  //

  const echoCamera = frame(TOP, ORG_RADIUS * 1.15);
  const hubCamera = frame(TOP, ECHO_RADIUS * 1.15);
  const platformRadius = echo.platform ? echo.platform.scale.x / 2 : 1;
  const platformCamera = frame(
    { alpha: -Math.PI / 2, beta: Math.acos(0.6 / Math.hypot(0.6, 1)) },
    platformRadius * 1.15,
    echo.platform?.position,
  );
  const echoSpaces = shot(echo.scene, 7, {
    transition: { kind: 'fade', duration: 0.5 },
    script: [
      instant({ hide: ids([...echo.spaces, ...echo.objects]), camera: echoCamera }),
      {
        at: 0.3,
        duration: 2.5,
        ease: 'ease-in-out',
        camera: hubCamera,
        set: { [echo.hub.id]: { labelStyle: 'hidden' } },
      },
      { at: 1.2, duration: 1.5, ease: 'ease-out', show: ids(echo.spaces), sideTitle: 'ECHO\nHypergraph' },
      {
        at: 3,
        duration: 0.1,
        effects: {
          add: [
            {
              id: 'chatter',
              effect: Ref.make(conversations),
              params: { objects: ids(echo.spaces), rate: 1.6, max: 3 },
              seed: 11,
            },
          ],
        },
      },
    ],
  });
  const fade = Object.fromEntries(
    echo.objects.filter((object) => object !== echo.picked).map((object) => [object.id, { opacity: 0.2 }]),
  );
  const objectThread = shot(echo.scene, 10, {
    script: [
      instant({ camera: hubCamera, set: { [echo.hub.id]: { labelStyle: 'hidden' } } }),
      {
        at: 0.3,
        duration: 2.5,
        ease: 'ease-in-out',
        camera: platformCamera,
        show: ids(echo.objects),
        // The focused space turns to glass and every other space fades out.
        set: Object.fromEntries(
          echo.spaces.map((space) => [space.id, { opacity: space === echo.platform ? 0.12 : 0 }]),
        ),
      },
      { at: 3, duration: 1, set: { ...fade, [echo.picked.id]: { scale: scaled(echo.picked, 1.8) } } },
    ],
    effects: [
      {
        id: 'roadmap',
        effect: Ref.make(callout),
        params: {
          object: echo.picked.id,
          title: 'Roadmap',
          label: 'Document',
          rows: [
            ['Space', 'Platform'],
            ['Linked', '6 objects'],
            ['Thread', '12 messages'],
            ['Agents', '2 working'],
          ],
          messages: [
            { who: 'Alice', color: '#5b8def', text: 'Can we ship sync before the Q3 review?' },
            { who: 'Planner', color: '#a07cf0', text: 'Sync depends on Auth, which lands Thursday.' },
            { who: 'Research', color: '#2fbf71', text: 'Two customers asked for offline mode last week.' },
            { who: 'Bob', color: '#e57bd1', text: 'Then sync first, UI polish after.' },
            { who: 'Writer', color: '#f5a524', text: 'Drafted the roadmap update for review.' },
          ],
          at: 3.5,
          gap: 1.1,
        },
        seed: 13,
      },
    ],
  });
  const growth = 16;
  const companyFills = shot(echo.scene, 6, {
    transition: { kind: 'fade', duration: 0.5 },
    script: [
      instant({ hide: ids([...echo.spaces, ...echo.objects]), camera: echoCamera }),
      {
        at: 0.3,
        duration: 3.5,
        ease: 'ease-in',
        set: {
          [echo.org.id]: { scale: scaled(echo.org, growth), labelStyle: 'hidden' },
          [echo.hub.id]: { scale: scaled(echo.hub, growth), opacity: 1, color: '#4f8dff', labelStyle: 'hidden' },
        },
      },
      {
        at: 2.8,
        duration: 1,
        caption: 'Your team\nYour apps\nYour data',
        captionImage: DXOS_LOGO,
        captionColor: '#141414',
      },
    ],
  });

  const animation = Obj.make(Animation.Animation, {
    name: 'echo3d',
    fps: 30,
    size: { width: 1920, height: 1080 },
    shots: [
      beginning,
      siloShot,
      siloComms,
      spreadShot,
      frontier,
      frontierComms,
      absorb,
      merge,
      engulf,
      echoSpaces,
      objectThread,
      companyFills,
    ],
  });
  return {
    animation,
    scenes: [silo.scene, spread.scene, labs.scene, echo.scene],
    effects: [flow, burst, conversations, callout],
  };
};
