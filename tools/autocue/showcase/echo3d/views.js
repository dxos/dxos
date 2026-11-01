//
// Copyright 2026 DXOS.org
//

// Scenes as views over the model: what is shown, where kinds live, which relations are drawn, and what the camera
// frames. No coordinates here.
//
//   style    rendering style name from styles.js; defaults to `plain`.
//   seconds  this scene's transition time; fade, the fraction of it over which opacity changes.
//   labels   id → label text for this scene; an empty string hides the label. noLabels hides them all.
//   labelMorph id → [added, kept, dropped]: the label reads kept+dropped, and as the scene's move ends the dropped
//            words fade out while the added ones fade in.
//   labelGap id → extra distance (in the node's own units) between its label and its edge.
//   swallow  kind or id → partner id: the node shakes and fades as the partner's growing edge reaches it.
//   caption  large text faded in over the centre of the frame; captionColor overrides its white, and captionLead
//            brings it up that many seconds before the move ends.
//   callouts [{ side, slot, wait, scale, anchor, inset, ...callout }]: side panels (`callout` alone is the right
//            one); `slot` names a panel so a margin can hold several, `wait` delays its start in seconds, `pace` sets the
//            seconds between its messages, `scale` shrinks it, `anchor` (top / centre / bottom) and `inset` (pixels in from the margin) place it.
//   callout  { node, title, kind, rows, thread, accent, promote }: a card in the right margin, joined to the node by a line, with an
//            optional thread of { who, bot, colour, text, creates, card } messages under it; a message's `creates`
//            node stays hidden until just after the message arrives, then grows out of the callout node, with its
//            `card` appearing at the foot of the column, joined to it. `promote` brings the previous scene's created
//            card up into the callout's place.
//   linkStyle { color, opacity, fade }: how this scene draws its links; fade: false draws them evenly.
//   delay    kind or id → fraction of the transition that passes before the node starts to change.
//   spin     kind or id → radians per second the node turns round its parent (an orbit); spinReset unwinds the
//            turn to its modelled orientation as the scene starts.
//   turn     kind or id → radians per second the node's sphere turns on its own vertical axis (its lattice shows it).
//   curtain  stepping into this scene fades to black and back, cutting to it while the screen is dark.
//   autoNext run straight on into the next scene once this one's transition ends.
//   shrink   kinds or ids that, as they disappear, shrink away rather than fade at full size; their labels fade too.
//   absorbGrowth how much a tether partner grows (fraction of its size) per node merging into it, in step with the
//            node shrinking away.
//   growsWith id → id: the node grows by the same factor as the named node does from its absorbGrowth.
//   tether   id → partner id: the node closes on its partner, then stays touching it while it shrinks (a merge).
//   show     kinds or ids drawn at full opacity; everything else is hidden.
//   hide     kinds or ids hidden even when `show` matches them.
//   ghost    kinds or ids kept at full size but invisible, so they fade in rather than grow.
//   opacity  kind or id → opacity, for shown nodes.
//   move     kind or id → container id, overriding the model's containment.
//   edges    relation types to draw; an end that is not visible is redrawn at its nearest visible container.
//   scale    kind or id → size multiplier.
//   containers  container id or kind → slots, replacing the model's arrangement for this view.
//   camera   focus (node id), fit (multiple of the focus node's radius), direction (side the camera views from);
//            or radius (absolute) around centre (default the origin).

import {
  BLOCKERS_OBJECT,
  COMPETITORS,
  CREATED_OBJECT,
  FAQ_OBJECT,
  LEFT_OBJECT,
  LOWER_LEFT_OBJECT,
  ORG_RADIUS,
  PICKED_OBJECT,
  REVIEW_OBJECT,
  TENANT_LAB,
  YOUR_APP_IDS,
  hashRandom,
  nodes,
} from './model.js';

// The SaaS model: your data lives inside the vendor, which grows by holding everyone's data.
const VENDOR_SCALE = 2.2;
const TENANT_RING = ORG_RADIUS * VENDOR_SCALE + 14;
// Scene 3: each vendor shrinks to a shell just around the one piece of your data it holds.
const DATA_SCALE = 0.45;
const SHELL_RADIUS = 9 * DATA_SCALE * 1.6;
const SPREAD_RING = ORG_RADIUS + SHELL_RADIUS + 10;

// Scene 4: Frontier Labs, several times your company's size, beside it.
const LAB_RADIUS = ORG_RADIUS * 1.4;
const LAB_OFFSET = ORG_RADIUS + LAB_RADIUS + 12;

// Scene 5: the lab at the centre, vendors on a ring around it, companies on an outer orbit.
const ORBIT_LAB = ORG_RADIUS * 2.6;
const ORBIT_COMPANY = 8;
const ORBIT_COMPANIES = ORBIT_LAB + SHELL_RADIUS + 34;
const shellScale = Object.fromEntries(
  nodes.filter((node) => YOUR_APP_IDS.includes(node.id)).map((node) => [node.id, SHELL_RADIUS / node.size]),
);

// Scene 5, and the base for scene 6.
const saasOrbit = () => ({
  id: 'orbit',
  title: 'The frontier lab becomes the centre; vendors and companies fall into its orbit',
  // Teams fold back into your company; their links now start from it.
  show: ['container', 'lab', 'tenant', 'yours-lab', ...YOUR_APP_IDS, ...YOUR_APP_IDS.map((app) => `yours-${app}`)],
  // Team names are unreadable at this size.
  labels: {
    'team-Eng': '',
    'team-Sales': '',
    'team-Ops': '',
    'yours-lab': '“Metadata”',
  },
  // Written large across the lab's data rather than above it.
  labelClass: { 'yours-lab': 'inside' },
  // Clears the vendor ring and the company orbit around the lab.
  labelGap: { lab: 3.6 },
  // The lab keeps the see-through shell it has from scene 8 on.
  opacity: { saas: 0.225 },
  // Your company and its teams shrink together; the lab grows to dominate.
  scale: {
    ...shellScale,
    'data': DATA_SCALE,
    'container': ORBIT_COMPANY / ORG_RADIUS,
    'team': ORBIT_COMPANY / ORG_RADIUS,
    'lab': ORBIT_LAB / 5,
    'yours-lab': 5.5,
  },
  containers: {
    world: [
      { kinds: ['lab'], arrange: 'centre' },
      // On the lab's own edge, counterclockwise from 12 o'clock round to 6 (angles decrease on screen).
      {
        kinds: YOUR_APP_IDS,
        arrange: 'ring',
        radius: ORBIT_LAB,
        absolute: true,
        start: -Math.PI / 2,
        span: -Math.PI,
      },
      // Your company and every other one share a full orbit, yours first at 9 o'clock.
      { kinds: ['container', 'tenant'], arrange: 'ring', radius: ORBIT_COMPANIES, absolute: true, start: Math.PI },
    ],
    org: [{ kinds: ['team'], arrange: 'pack', radius: 0.6 }],
    saas: [{ kinds: ['data'], arrange: 'centre' }],
    lab: [{ kinds: ['data'], arrange: 'centre' }],
  },
  edges: ['uses', 'adopts'],
  // The margin keeps the outermost labels in frame.
  camera: { radius: ORBIT_COMPANIES + 30 },
});

// Scene 7: your company at the centre, three frontier labs around it.
const RIVAL_RADIUS = ORG_RADIUS * 1.1;
const RIVAL_RING = ORG_RADIUS + RIVAL_RADIUS + 18;
const RIVALS_WAITING = 600;
const LAB_ORBITS = {
  kinds: ['tenant', 'container'],
  arrange: 'ring',
  radius: 1.35,
  rings: 2,
  ringGap: 0.22,
  start: -Math.PI / 2,
  shuffle: true,
};

// Scenes 8–9: labs merge pairwise. The survivor sits between the pair and takes their combined area; the absorbed lab
// slides into it as it shrinks away, and its companies join the survivor's orbit.
const LAB_AT = [0, 1, 2].map((index) => {
  const angle = -Math.PI / 2 + (index * Math.PI * 2) / 3;
  return [Math.cos(angle) * RIVAL_RING, 0, Math.sin(angle) * RIVAL_RING];
});
const midpoint = (left, right) => left.map((component, axis) => (component + right[axis]) / 2);
const MERGED_12 = midpoint(LAB_AT[0], LAB_AT[1]);
const MERGED_12_RADIUS = RIVAL_RADIUS * Math.SQRT2;
// The final merge lands at the centre of the frame, not midway between the pair.
const MERGED_ALL = [0, 0, 0];
const MERGED_ALL_RADIUS = RIVAL_RADIUS * Math.sqrt(3);
const SHRUNK = 0.02;
// Companies drift slowly round the lab they orbit in scenes 7–9.
const ORBIT_SPIN = { tenant: 0.06, container: 0.06 };
// Big enough that the lab's edge passes every corner of the frame, at any window shape.
const ENGULF_RADIUS = (RIVAL_RING + RIVAL_RADIUS * 1.75 + 14) * 3;

/** A scene where `absorbed` labs shrink into the survivor (the original lab); `standing` labs stay put. */
const merge = ({
  id,
  title,
  survivor,
  absorbed,
  standing,
  orbit,
  gone = [],
  autoNext,
  continues,
  survivorLabel,
  labelMorph,
}) => ({
  labelMorph,
  continues,
  id,
  title,
  autoNext,
  seconds: 2.5,
  show: ['container', 'lab', 'rival', 'tenant'],
  hide: gone,
  spin: ORBIT_SPIN,
  // The absorbed lab stays touching the survivor as it shrinks.
  tether: Object.fromEntries(
    Object.keys(absorbed)
      .filter((lab) => !gone.includes(lab))
      .map((lab) => [lab, 'lab']),
  ),
  labels: {
    // Your company goes unnamed from scene 11 on, one dot among the others.
    org: '',
    ...Object.fromEntries(Object.keys(absorbed).map((lab) => [lab, ''])),
    ...(survivorLabel ? { lab: survivorLabel } : {}),
  },
  scale: {
    lab: survivor.radius / 5,
    rival: RIVAL_RADIUS / 5,
    ...Object.fromEntries(Object.keys(absorbed).map((lab) => [lab, SHRUNK])),
    container: ORBIT_COMPANY / ORG_RADIUS,
  },
  containers: {
    world: [
      { kinds: ['lab'], arrange: 'at', offset: survivor.at },
      ...Object.entries({ ...absorbed, ...standing }).map(([lab, at]) => ({ kinds: [lab], arrange: 'at', offset: at })),
    ],
    lab: [LAB_ORBITS],
    rival: [LAB_ORBITS],
  },
  // Companies of an absorbed lab, yours included, join the survivor's orbit.
  move: Object.fromEntries(
    Object.entries({ ...TENANT_LAB, org: 'rival-1' }).map(([company, lab]) => [company, orbit[lab] ?? lab]),
  ),
  edges: [],
  camera: { radius: RIVAL_RING + RIVAL_RADIUS * 1.75 + 14 },
});

// Scene 12, second stage: the last two labs merge at the centre.
const LAST_MERGE = {
  title: 'The last two merge: one frontier lab, every company in its orbit',
  survivor: { at: MERGED_ALL, radius: MERGED_ALL_RADIUS },
  absorbed: { 'rival-1': MERGED_ALL, 'rival-2': MERGED_ALL },
  standing: {},
  orbit: { 'rival-1': 'lab', 'rival-2': 'lab' },
  gone: ['rival-1'],
};

// The apps the lab replaces: every one of them, sinking into it in scene 11.
const ABSORBED = YOUR_APP_IDS;

// Scene 10: the last lab swells to fill the frame, swallowing every company.
const ENGULF = {
  ...merge({
    id: 'engulf',
    title: 'One frontier lab grows until it is all there is',
    survivor: { at: MERGED_ALL, radius: ENGULF_RADIUS },
    absorbed: { 'rival-1': MERGED_ALL, 'rival-2': MERGED_ALL },
    standing: {},
    orbit: { 'rival-1': 'lab', 'rival-2': 'lab' },
    gone: ['rival-1', 'rival-2'],
    survivorLabel: 'The Final Frontier',
  }),
  // Slow, so the frame darkens gradually as the lab grows.
  seconds: 8,
  title: 'Welcome to the Singularity',
  noLabels: true,
  // The frame fades to black as the lab grows, and the caption comes up on the black.
  blackout: true,
  // The name keeps the title size it took in scene 13.
  labelClass: { lab: 'title' },
  // The closing caption, once the lab has filled the frame.
  caption: 'Welcome to the Singularity',
  // The orbit stops; the companies hold where it left them.
  spin: {},
  // The companies hold their orbits, shaking and fading one by one as the lab's edge reaches them.
  swallow: { tenant: 'lab', container: 'lab' },
  // Your company fades as the edge meets it rather than bursting like the others.
  swallowFade: ['container'],
  containers: {
    world: [{ kinds: ['lab'], arrange: 'at', offset: MERGED_ALL }],
    lab: [{ ...LAB_ORBITS, radius: LAB_ORBITS.radius * MERGED_ALL_RADIUS, absolute: true }],
  },
};

// Turn speed (radians per second) of the companies and their data in scene 3.
const SCALE_SPIN = 0.05;

// Scenes 1–2.
// Packets of data exchanged both ways across a link, in bursts (scenes 2-4).
const DATA_FLOW = { count: 8, both: true, speed: 0.45, size: 0.55 };

const SILO = {
  id: 'silo',
  title: 'Your data lives inside the SaaS vendor',
  show: ['container', 'vendor', 'data-org', 'your-teams'],
  containers: {
    world: [{ kinds: ['container', 'vendor'], arrange: 'row', gap: 14 }],
    vendor: [{ kinds: ['data'], arrange: 'centre' }],
    org: [{ kinds: ['people'], arrange: 'centre' }],
  },
  edges: ['owns'],
  // An even link, at full strength.
  linkStyle: { opacity: 1, fade: false },
  turn: { vendor: 0.15 },
  // Side view: Org and the vendor are the same size.
  camera: { radius: ORG_RADIUS * 2 + 12, direction: [0, 0.12, 1] },
};

const SCALE = {
  id: 'scale',
  title: 'The vendor grows by holding the data of every org',
  show: ['container', 'vendor', 'tenant', 'data', 'metadata'],
  // The pieces held by other apps belong to scene 3.
  hide: YOUR_APP_IDS.map((app) => `yours-${app}`),
  // Unseen here; kept inside your company so they grow out of it in scene 3.
  move: Object.fromEntries(YOUR_APP_IDS.map((app) => [app, 'org'])),
  scale: { vendor: VENDOR_SCALE, container: 2 / ORG_RADIUS, data: 0.19 },
  containers: {
    world: [
      { kinds: ['vendor'], arrange: 'centre' },
      // Your company first, at 9 o'clock, matching its place on the left in scene 1.
      {
        kinds: ['container', 'tenant'],
        arrange: 'ring',
        radius: TENANT_RING,
        absolute: true,
        offset: 0,
        start: Math.PI,
      },
    ],
    // Same order and offset as the org ring, so each org's data sits on the radius toward it.
    vendor: [
      { kinds: ['metadata'], arrange: 'centre' },
      { kinds: ['data'], arrange: 'ring', radius: 0.75, offset: 0, start: Math.PI, ring: 'data-ring' },
    ],
  },
  // Every company and its data turn together, slowly, keeping each pair on its radius.
  spin: { container: SCALE_SPIN, tenant: SCALE_SPIN, data: SCALE_SPIN },
  edges: ['owns', 'derives'],
  // Only your own traffic: your company with its data, and that data feeding the vendor's metadata.
  linkStyle: { flow: { ...DATA_FLOW, between: ['org', 'data-org', 'metadata'] } },
  // Straight down, so the vendor's shell tints every data sphere the same; the margin keeps outer labels in view.
  camera: { radius: TENANT_RING + 16 },
};

// Scene 3, also replayed at the end (12); shared, so an edit changes both.
const SPREAD = {
  id: 'spread',
  title: 'Your company, its data spread across many SaaS vendors',
  show: ['container', 'team', ...YOUR_APP_IDS, ...YOUR_APP_IDS.map((app) => `yours-${app}`)],
  // The SaaS sphere shrinks away into the slot Google Workspace grows into.
  move: { vendor: 'Google Workspace' },
  shrink: ['vendor'],
  // See-through shells, so the piece of your data inside each one shows.
  opacity: { saas: 0.225 },
  scale: { ...shellScale, data: DATA_SCALE },
  containers: {
    world: [
      { kinds: ['container'], arrange: 'centre' },
      { kinds: YOUR_APP_IDS, arrange: 'ring', radius: SPREAD_RING, absolute: true, offset: 0 },
    ],
    // Tight enough that the teams nearly touch.
    org: [{ kinds: ['team'], arrange: 'pack', radius: 0.6 }],
    saas: [{ kinds: ['data'], arrange: 'centre' }],
  },
  // Each team links to the apps it works in: faint, even lines, so the links show without crowding the scene.
  edges: ['uses'],
  linkStyle: { opacity: 0.3, fade: false },
  camera: { radius: SPREAD_RING + SHELL_RADIUS + 10 },
};

// Scene 12 replays 3 with the teams folded away; everything else is shared, so an edit to 3 changes both. It is
// entered through a fade to black, closing the singularity before the story returns to your company.
const SPREAD_AGAIN = {
  ...SPREAD,
  id: 'spread-again',
  hide: [...(SPREAD.hide ?? []), 'team'],
  curtain: true,
  // Quiet links, so the ECHO scenes that follow are not busy with traffic.
  linkStyle: {},
};

// Scene 13: scene 12 with your company's data now held in ECHO inside it.
// ECHO's size inside your company, as a multiple of its modelled radius (half the company's).
const ECHO_SCALE = 1.3;
const ECHO_HUB = {
  ...SPREAD_AGAIN,
  id: 'echo-hub',
  title: 'Your data, held in ECHO inside your company',
  curtain: false,
  show: [...SPREAD_AGAIN.show, 'hub'],
  containers: { ...SPREAD_AGAIN.containers, org: [{ kinds: ['hub'], arrange: 'centre' }] },
  // ECHO fills most of your company.
  scale: { ...SPREAD_AGAIN.scale, hub: ECHO_SCALE },
  // Named large, the same size as "Your company", in every scene that shows it.
  labels: { ...SPREAD_AGAIN.labels, 'echo-hub': 'Your data' },
  labelClass: { 'echo-hub': 'hero' },
};

// Scene 15: into one space, tilted to show its graph of objects in depth.
// Turn speed (radians per second) of the object graph, the same in every scene that shows it.
const OBJECT_SPIN = 0.08;

const OBJECT_GRAPH = {
  ...ECHO_HUB,
  id: 'objects',
  title: 'Inside a space: a graph of objects',
  show: [...ECHO_HUB.show, 'space', 'object', 'mote'],
  // The focused space becomes a glass shell; every other space fades out.
  opacity: { ...ECHO_HUB.opacity, 'hub': 0.12, 'space': 0, 'space-Platform': 0.12 },
  edges: ['child', 'refs'],
  // Darker, even links, so the sub-graphs read as structure rather than glow.
  linkStyle: { color: '#2e3850', opacity: 1, fade: false },
  camera: { focus: 'space-Platform', fit: 1.15, direction: [0, 0.6, 1] },
  seconds: 2.5,
  // The tree lands first; the wider constellation fades in once the camera has arrived.
  delay: { mote: 0.55 },
  // The whole constellation turns slowly, so its depth reads.
  spin: { object: OBJECT_SPIN, mote: OBJECT_SPIN },
};

// Scene 16: one object is picked out and its detail card slides into the right margin.
const OBJECT_DETAIL = {
  ...OBJECT_GRAPH,
  id: 'object-detail',
  title: 'One object, and what it holds',
  seconds: undefined,
  delay: undefined,
  // The turn keeps the pace of the scene before; it unwinds as this scene starts, so the object picked out below begins
  // where the model put them, then turns on without a break through the scenes that follow.
  spin: { object: OBJECT_SPIN, mote: OBJECT_SPIN, spawn: OBJECT_SPIN },
  spinReset: true,
  scale: { ...OBJECT_GRAPH.scale, [PICKED_OBJECT]: 1.8 },
  // Every other object fades back, so the picked one stands alone.
  opacity: { ...OBJECT_GRAPH.opacity, object: 0.2, mote: 0.2, [PICKED_OBJECT]: 1 },
  callout: {
    node: PICKED_OBJECT,
    title: 'Roadmap',
    kind: 'Document',
    rows: [
      ['Space', 'Platform'],
      ['Linked', '6 objects'],
      ['Thread', '12 messages'],
      ['Agents', '2 working'],
    ],
  },
};

// Scene 17: the same object, with the conversation on it playing out under its card.
const OBJECT_THREAD = {
  ...OBJECT_DETAIL,
  id: 'object-thread',
  // The turn carries on from the scene before, unbroken.
  spinReset: false,
  title: 'People and agents working on one object',
  // The object the last agent message creates; held back until that message arrives.
  show: [...OBJECT_DETAIL.show, CREATED_OBJECT],
  edges: [...OBJECT_DETAIL.edges, 'created'],
  callout: {
    ...OBJECT_DETAIL.callout,
    // The object's thread: people and agents working on it together.
    thread: [
      { who: 'Alice', colour: '#5b8def', text: 'Can we ship sync before the Q3 review?' },
      { who: 'Planner', bot: true, colour: '#a07cf0', text: 'Sync depends on Auth, which lands Thursday.' },
      { who: 'Research', bot: true, colour: '#2fbf71', text: 'Two customers asked for offline mode last week.' },
      { who: 'Bob', colour: '#e57bd1', text: 'Then sync first, UI polish after.' },
      {
        who: 'Writer',
        bot: true,
        colour: '#f5a524',
        text: 'Drafted the roadmap update for review.',
        creates: CREATED_OBJECT,
        card: {
          kind: 'Document',
          title: 'Roadmap update',
          rows: [
            ['Created by', 'Writer'],
            ['Linked to', 'Roadmap'],
            ['Status', 'Draft'],
          ],
        },
      },
    ],
  },
};

// Seconds between messages in the left-hand conversations, quicker than the main one on the right.
const LEFT_PACE = 0.45;
// Both left-hand conversations sit this far in from the margin, one above the other.
const LEFT_INSET = 48;

// Scene 14: the camera closes in on ECHO as it turns to glass, showing the hypergraph of nested spaces it holds.
const ECHO_SPACES = {
  ...ECHO_HUB,
  id: 'echo-spaces',
  title: 'Inside ECHO: a hypergraph of clustered, nested spaces',
  show: [...ECHO_HUB.show, 'space'],
  opacity: { ...ECHO_HUB.opacity, hub: 0.12 },
  edges: ['links'],
  // Zoomed in, your data shows what holds it: ECHO, named large at the side.
  sideTitle: 'ECHO\nHypergraph',
  // The side title names it; the sphere's own label would only repeat it.
  labels: { ...ECHO_HUB.labels, 'echo-hub': '' },
  camera: { focus: 'echo-hub', fit: 1.15 },
};

// Scene 21: the vendors in the order they merge, the first picked at random.
const MERGING_VENDORS = [...YOUR_APP_IDS].sort(
  (left, right) => hashRandom(`${left}:merge`) - hashRandom(`${right}:merge`),
);

// Scene 21: the vendors merge into your company, one first, then the rest in turn, each staying in touch as it goes.
// The yellow data each vendor holds.
const dataOf = (vendor) => `yours-${vendor}`;
const mergeDelay = (index) => (index === 0 ? 0 : 0.3 + (index - 1) * 0.07);
const SAAS_MERGE = {
  ...ECHO_HUB,
  id: 'saas-merge',
  title: 'Your data folds into ECHO; the SaaS vendors fade away',
  seconds: 7,
  // Each vendor shrinks away where it stands, its name and links fading with it.
  hide: [...(ECHO_HUB.hide ?? []), ...MERGING_VENDORS],
  shrink: MERGING_VENDORS,
  // Its data leaves it (so it is not hidden with it) and merges into ECHO, which grows with each one.
  move: { ...ECHO_HUB.move, ...Object.fromEntries(MERGING_VENDORS.map((id) => [dataOf(id), 'org'])) },
  tether: Object.fromEntries(MERGING_VENDORS.map((id) => [dataOf(id), 'echo-hub'])),
  // Your company grows in step with ECHO, keeping it the same share of the company.
  growsWith: { org: 'echo-hub' },
  absorbGrowth: 0.06,
  scale: { ...ECHO_HUB.scale, ...Object.fromEntries(MERGING_VENDORS.map((id) => [dataOf(id), SHRUNK])) },
  // One vendor first, picked at random, then the rest in turn; each data sphere goes with its vendor.
  delay: Object.fromEntries(
    MERGING_VENDORS.flatMap((id, index) => [
      [id, mergeDelay(index)],
      [dataOf(id), mergeDelay(index)],
    ]),
  ),
};

// Scene 22: your company and ECHO grow until ECHO alone covers the frame, its edge past every corner.
const COMPANY_GROWTH = 16;
const ECHO_GROWTH = 16;
const COMPANY_FILLS = {
  ...SAAS_MERGE,
  id: 'company-fills',
  title: 'DXOS',
  // The closing title, once ECHO has filled the frame.
  // The DXOS logotype, then each line under it in turn.
  // Near black, over the blue ECHO turns as it fills the frame.
  captionImage: 'brand/dxos-horizontal-dark.svg',
  captionColor: '#141414',
  captionLead: 1,
  // ECHO's yellow turns blue as it fills the frame.
  tint: { 'echo-hub': '#f5c542' },
  caption: 'Your team\nYour apps\nYour data',
  seconds: 4,
  tether: {},
  delay: {},
  shrink: [],
  absorbGrowth: 0,
  hide: [...SAAS_MERGE.hide, ...MERGING_VENDORS.map(dataOf)],
  scale: { ...SAAS_MERGE.scale, container: COMPANY_GROWTH, hub: ECHO_GROWTH },
  // Solid, so nothing shows through at the edges.
  opacity: { ...SAAS_MERGE.opacity, hub: 1 },
};

/** A camera direction tilted `degrees` from straight down toward the viewer. */
const tilted = (degrees) => {
  const angle = (degrees * Math.PI) / 180;
  return [0, Math.cos(angle), Math.sin(angle)];
};

// Scene 8: the frontier lab arrives beside your company.
const FRONTIER = {
  id: 'frontier',
  // Just above the lab, as close as Your company's label sits to it (the gap is in the lab's own units, scaled up here).
  labelGap: { lab: 0.2 },
  title: 'A frontier lab arrives, far bigger than every other vendor',
  show: ['container', 'team', 'lab', 'yours-lab', ...YOUR_APP_IDS, ...YOUR_APP_IDS.map((app) => `yours-${app}`)],
  // Unseen here; held inside the lab so the other companies grow out of it in scene 5.
  move: { tenant: 'lab' },
  // The lab is a see-through shell like your company's, so its rim shades it and its data shows inside.
  opacity: { saas: 0.225 },
  scale: { ...shellScale, 'data': DATA_SCALE, 'lab': LAB_RADIUS / 5, 'yours-lab': 2 },
  containers: {
    world: [
      { kinds: ['container'], arrange: 'centre' },
      // The other vendors crowd onto the far side, out of the lab's way.
      {
        kinds: YOUR_APP_IDS,
        arrange: 'ring',
        radius: SPREAD_RING,
        absolute: true,
        start: Math.PI / 2,
        span: Math.PI,
      },
      { kinds: ['lab'], arrange: 'at', offset: [LAB_OFFSET, 0, 0] },
    ],
    // Tight enough that the teams nearly touch.
    org: [{ kinds: ['team'], arrange: 'pack', radius: 0.6 }],
    saas: [{ kinds: ['data'], arrange: 'centre' }],
    lab: [{ kinds: ['data'], arrange: 'centre' }],
  },
  edges: ['uses'],
  camera: {
    centre: [(LAB_OFFSET + LAB_RADIUS - SPREAD_RING - SHELL_RADIUS) / 2, 0, 0],
    radius: (LAB_OFFSET + LAB_RADIUS + SPREAD_RING + SHELL_RADIUS) / 2 + 8,
  },
};

const saasViews = [
  // A blank frame to start from: the first key press here also unlocks audio, so the next slide's sound plays.
  {
    id: 'blank',
    title: 'Blank',
    show: [],
    containers: SILO.containers,
    camera: SILO.camera,
  },
  // The opening title, on an empty frame framed as scene 1, so its spheres grow in where they will stand.
  {
    id: 'beginning',
    title: 'In the Beginning',
    caption: 'In the Beginning',
    // The chime (sounds/chime.ogg) rings in with the title; 'choir' and 'chord' are the synthesised alternatives.
    sound: 'chime',
    show: [],
    containers: SILO.containers,
    camera: SILO.camera,
  },
  SILO,
  // Scene 3: the same, with data going both ways across the link: yours into the vendor, its back to your teams.
  {
    ...SILO,
    id: 'silo-comms',
    // Busy: bigger bursts, close together.
    linkStyle: { ...SILO.linkStyle, flow: { ...DATA_FLOW, count: 16, gap: [0.15, 0.7], alert: 0.12 } },
  },
  SCALE,
  // Scene 4: the same, with three of the other companies named as your competitors.
  {
    ...SCALE,
    id: 'competitors',
    labels: Object.fromEntries(COMPETITORS.map((id) => [id, 'Your competitor'])),
    // The view tilts 70° from straight down, so the sphere is seen from low over its equator.
    camera: { ...SCALE.camera, direction: tilted(70) },
    // A slow tilt, so the sphere turns into view rather than snapping over.
    seconds: 6,

    // Every company's traffic now, not just yours: finer and a little slower, so sixty links read as a hum.
    linkStyle: { flow: { ...DATA_FLOW, size: 0.35, speed: 0.35 } },
  },
  SPREAD,
  // Scene 7: the same, with each team trading data with the apps it works in.
  { ...SPREAD, id: 'spread-comms', linkStyle: { ...SPREAD.linkStyle, flow: DATA_FLOW } },
  FRONTIER,
  // Scene 9: the same, with each team trading data with its apps and with the lab.
  {
    ...FRONTIER,
    id: 'frontier-comms',
    // The teams trade far more with the lab than with any app.
    linkStyle: {
      ...FRONTIER.linkStyle,
      flow: { ...DATA_FLOW, boost: { nodes: ['yours-lab'], count: 16, gap: [0.1, 0.6] } },
    },
  },
  {
    ...saasOrbit(),
    // Data flows between your company and its apps, and between every company and the lab: fine and unhurried.
    linkStyle: { flow: { ...DATA_FLOW, size: 0.5, speed: 0.25, opacity: 0.45 } },
  },
  {
    // Same picture as `orbit`, with every app pulled into the lab.
    ...saasOrbit(),
    id: 'absorb',
    title: 'The frontier lab absorbs the apps it can replace',
    seconds: 4,
    // The apps shrink away where they stand; the data each one held leaves it and merges into the lab's own data, one
    // after another, which grows with each piece it takes in.
    hide: ABSORBED,
    shrink: ABSORBED,
    labels: { ...saasOrbit().labels, org: '' },
    // Only the companies' links to the lab: your company's links to the apps go as the apps do.
    edges: ['adopts'],
    move: Object.fromEntries(ABSORBED.map((app) => [`yours-${app}`, 'lab'])),
    tether: Object.fromEntries(ABSORBED.map((app) => [`yours-${app}`, 'yours-lab'])),
    absorbGrowth: 0.03,
    // The lab grows in step with its data, keeping the same shell around it.
    growsWith: { lab: 'yours-lab' },
    delay: Object.fromEntries(
      ABSORBED.flatMap((app, index) => [
        [app, mergeDelay(index)],
        [`yours-${app}`, mergeDelay(index)],
      ]),
    ),
    // The rival labs wait far out of frame, so they can sweep in for scene 7.
    show: [...saasOrbit().show, 'rival'],
    containers: {
      ...saasOrbit().containers,
      world: [
        ...saasOrbit().containers.world,
        {
          kinds: ['rival'],
          arrange: 'ring',
          radius: RIVALS_WAITING,
          absolute: true,
          start: Math.PI / 6,
          span: (Math.PI * 2) / 3,
        },
      ],
    },
    scale: {
      ...saasOrbit().scale,
      rival: ORBIT_LAB / 5,
      ...Object.fromEntries(ABSORBED.map((app) => [`yours-${app}`, SHRUNK])),
    },
  },
  {
    id: 'rivals',
    title: "Your company, one of many in a frontier lab's orbit",
    // Your company keeps its scene 6 size, teams folded away; the other companies return as a scattered crowd.
    show: ['container', 'lab', 'rival', 'tenant'],
    labels: { org: '' },
    spin: ORBIT_SPIN,
    scale: { lab: RIVAL_RADIUS / 5, rival: RIVAL_RADIUS / 5, container: ORBIT_COMPANY / ORG_RADIUS },
    containers: {
      world: [
        // The original lab at 12 o'clock, the two rivals at 4 and 8.
        {
          kinds: ['lab', 'rival'],
          arrange: 'ring',
          radius: RIVAL_RING,
          absolute: true,
          start: -Math.PI / 2,
          fixedAngles: false,
        },
      ],
      // Each lab's companies orbit it on two interleaved rings.
      lab: [LAB_ORBITS],
      rival: [LAB_ORBITS],
    },
    // Every company, yours included, moves into the orbit of the lab it relies on.
    move: { ...TENANT_LAB, org: 'rival-1' },
    // No links: the orbits alone say who relies on which lab.
    edges: [],
    camera: { radius: RIVAL_RING + RIVAL_RADIUS * 1.75 + 14 },
  },
  merge({
    id: 'merge-1',
    title: 'Two frontier labs merge; their companies stay in orbit',
    survivor: { at: MERGED_12, radius: MERGED_12_RADIUS },
    absorbed: { 'rival-1': MERGED_12 },
    standing: { 'rival-2': LAB_AT[2] },
    orbit: { 'rival-1': 'lab' },
  }),
  // The second stage of the merge slide: it follows the first merge straight on.
  merge({ ...LAST_MERGE, id: 'merge-2', continues: true }),
  // Scene 14: the one lab left is renamed: "Labs" fades out, "The Final" fades in.
  {
    ...merge({
      ...LAST_MERGE,
      id: 'final-frontier',
      title: 'The Final Frontier',
      gone: ['rival-1', 'rival-2'],
      labelMorph: { lab: ['The Final ', 'Frontier', ' Labs'] },
    }),
    // The other companies recede, leaving the lab and your company to read.
    opacity: { tenant: 0.3 },
    // The lab's name swells to a title (1.6s, the label's font-size transition), then changes at once: the rename
    // starts when the scene's move ends.
    labelClass: { lab: 'title' },
    seconds: 1.6,
  },
  ENGULF,
  // Scene 16: on the black, a new caption.
  {
    ...ENGULF,
    id: 'dont-panic',
    title: "Don't Panic",
    caption: "Don't Panic",
    seconds: 3,
  },
  SPREAD_AGAIN,
  ECHO_HUB,
  ECHO_SPACES,
  OBJECT_GRAPH,
  OBJECT_DETAIL,
  OBJECT_THREAD,
  // Scene 18: the new document's card rises into the original's place, and a new conversation starts on it.
  {
    ...OBJECT_THREAD,
    id: 'object-created',
    title: 'The new document, and the conversation it starts',
    // Each conversation's artifact, held back until its last message.
    show: [...OBJECT_THREAD.show, REVIEW_OBJECT, BLOCKERS_OBJECT, FAQ_OBJECT],
    // The new document takes the focus, with a second object picked out on the left; the earlier ones stay lit.
    scale: {
      ...OBJECT_THREAD.scale,
      [PICKED_OBJECT]: 1,
      [CREATED_OBJECT]: 1.8,
      [LEFT_OBJECT]: 1.8,
      [LOWER_LEFT_OBJECT]: 1.8,
    },
    opacity: { ...OBJECT_THREAD.opacity, [LEFT_OBJECT]: 1, [LOWER_LEFT_OBJECT]: 1 },
    callouts: [
      {
        side: 'right',
        node: CREATED_OBJECT,
        accent: true,
        promote: true,
        ...OBJECT_THREAD.callout.thread.find((message) => message.creates).card,
        thread: [
          { who: 'Bob', colour: '#e57bd1', text: 'Looks good. Can it note the Auth dependency?' },
          { who: 'Writer', bot: true, colour: '#f5a524', text: 'Added Auth as a linked task, due Thursday.' },
          { who: 'Alice', colour: '#5b8def', text: 'Share it with Sales before Friday.' },
          {
            who: 'Planner',
            bot: true,
            colour: '#a07cf0',
            text: 'Shared with Sales; review set for Friday.',
            creates: REVIEW_OBJECT,
            card: {
              kind: 'Event',
              title: 'Roadmap review',
              rows: [
                ['Created by', 'Planner'],
                ['When', 'Friday 10:00'],
                ['With', 'Sales'],
              ],
            },
          },
        ],
      },
      // At the same time, another team works on another object, on the left.
      {
        side: 'left',
        node: LEFT_OBJECT,
        // Starts a few messages behind the right-hand conversation, at three-quarter size, in the upper left.
        wait: 3,
        scale: 0.75,
        pace: LEFT_PACE,
        anchor: 'top',
        inset: LEFT_INSET,
        kind: 'Board',
        title: 'Launch checklist',
        rows: [
          ['Space', 'Platform'],
          ['Items', '18 open'],
          ['Agents', '1 working'],
        ],
        thread: [
          { who: 'Dana', colour: '#2fbf71', text: 'Which launch items are blocked?' },
          { who: 'Triage', bot: true, colour: '#8fbfbf', text: 'Three, all waiting on Auth.' },
          { who: 'Eli', colour: '#c7a38f', text: 'Flag them on the roadmap.' },
          {
            who: 'Triage',
            bot: true,
            colour: '#8fbfbf',
            text: 'Flagged, and linked to the update.',
            creates: BLOCKERS_OBJECT,
            card: {
              kind: 'Task list',
              title: 'Auth blockers',
              rows: [
                ['Created by', 'Triage'],
                ['Items', '3'],
                ['Linked to', 'Roadmap update'],
              ],
            },
          },
        ],
      },
      // Before the upper-left one ends, a third conversation starts lower left, in line with it.
      {
        side: 'left',
        slot: 'left-lower',
        node: LOWER_LEFT_OBJECT,
        // Starts while the upper-left conversation is still going (it ends about 6s in).
        wait: 4.5,
        scale: 0.75,
        pace: LEFT_PACE,
        anchor: 'bottom',
        inset: LEFT_INSET,
        kind: 'Page',
        title: 'Pricing',
        rows: [
          ['Space', 'Platform'],
          ['Edited', 'today'],
        ],
        thread: [
          { who: 'Fay', colour: '#c79ab0', text: 'Customers keep asking about seats.' },
          { who: 'Support', bot: true, colour: '#9aa8b8', text: 'Twelve tickets this week, same question.' },
          {
            who: 'Support',
            bot: true,
            colour: '#9aa8b8',
            text: 'Drafted an FAQ from the answers.',
            creates: FAQ_OBJECT,
            card: {
              kind: 'Document',
              title: 'Seats FAQ',
              rows: [
                ['Created by', 'Support'],
                ['Linked to', 'Pricing'],
              ],
            },
          },
        ],
      },
    ],
  },
  // Scene 19: back out to the hypergraph of spaces (a replay of scene 14).
  {
    ...ECHO_SPACES,
    id: 'echo-spaces-again',
    noLabels: true,
    // Many tiny conversations pop up around the spaces: everyone at work in their data.
    chatter: { kinds: ['space'], around: 'echo-hub', rate: 1.6, delay: 0.8, max: 4 },
  },
  // Scene 20: further out, to your company holding ECHO (a replay of scene 13).
  // The spaces sink back into ECHO unnamed, as they left the scene before.
  { ...ECHO_HUB, id: 'echo-hub-again', noLabels: ['space'] },
  SAAS_MERGE,
  // Scene 23: your company, now holding everything, grows until ECHO fills the frame; then the closing title.
  COMPANY_FILLS,
];

export const scenarios = {
  saas: { title: 'SaaS', views: saasViews },
};
