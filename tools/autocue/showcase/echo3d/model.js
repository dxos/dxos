//
// Copyright 2026 DXOS.org
//

// The logical model: nodes, where each lives (containment), how they relate, and how each container arranges its
// children. Nothing here is a coordinate; layout.js derives positions and views.js decides what each scene shows.

export const ORG_RADIUS = 27;
// Google Workspace takes the original vendor's place once the vendors spread out (scene 5 onward).
export const YOUR_APP_IDS = ['Google Workspace', 'Slack', 'Notion', 'Salesforce', 'Jira', 'HubSpot', 'Workday'];

/** Deterministic per-node random in [0, 1), so a node keeps its place across reloads and edits elsewhere. */
export const hashRandom = (key) => {
  let hash = 2166136261;
  for (const char of key) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  }
  return ((hash >>> 0) % 100000) / 100000;
};

/** Children of a packed container sit evenly around its centre; the spacing keeps siblings from touching. */
export const packGeometry = (count, radius) => {
  const distance = count === 1 ? 0 : radius * 0.52;
  const size = count === 1 ? radius * 0.6 : Math.min(radius * 0.42, distance * Math.sin(Math.PI / count) * 0.92);
  return { distance, size };
};

const SAAS = [
  'Google Workspace',
  'Slack',
  'Notion',
  'Salesforce',
  'Jira',
  'HubSpot',
  'Asana',
  'Zoom',
  'Figma',
  'GitHub',
  'Zendesk',
  'Linear',
  'Workday',
];

// The SaaS scenario: one vendor holding the data of many tenant orgs.
const TENANTS = 60;

// Label, colour, and radius (Your company's radius is 27), sized roughly by headcount.
const TEAMS = [
  ['Eng', '#5b8def', 7.5],
  ['Sales', '#2fbf71', 5.5],
  ['Ops', '#e57bd1', 3.8],
];

// Which apps each team works in; every team uses the frontier lab.
const TEAM_APPS = {
  Eng: ['Slack', 'Jira', 'Notion', 'lab'],
  Sales: ['Salesforce', 'HubSpot', 'Google Workspace', 'lab'],
  Ops: ['Workday', 'Google Workspace', 'Slack', 'lab'],
};

// The apps that each hold another piece of your company's data (SaaS scenario, scene 3).
const YOUR_APPS = YOUR_APP_IDS;

// The ECHO hypergraph: clusters of spaces, where a space can hold child spaces.
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

// Spaces deeper than this are drawn without a label, to keep the top-down view readable.
const SPACE_LABEL_DEPTH = 1;
const SPACE_STYLE = [
  { color: '#4f6bd8', opacity: 0.22 },
  { color: '#7b96ff', opacity: 0.4 },
  { color: '#b4c4ff', opacity: 1 },
];

// The objects held by one space, in concentric shells: one object at the centre, then each level on a sphere a fixed
// step further out. The step is 3 object radii, so neighbouring shells never touch.
const OBJECT_SPACE = 'Platform';
const OBJECT_LEVELS = 4;
const SHELL_STEP = 3;
// Objects on a shell sit about this many object radii apart; DENSITY then thins each shell (1 = fully packed).
const SHELL_SPACING = 3;
const SHELL_DENSITY = 0.7;
// Each level out draws its objects this much smaller than the level inside it.
const SHELL_SHRINK = 0.85;
// Vivid colours, one picked per object by a stable hash, so the objects read as different kinds of thing.
const OBJECT_PALETTE = ['#4f8dff', '#3ccf6e', '#ff8a3d', '#a66bff', '#22c7c7', '#f2c230', '#ff5fa2', '#7fa3ff'];
const objectColor = (id) => OBJECT_PALETTE[Math.floor(hashRandom(`${id}:colour`) * OBJECT_PALETTE.length)];

//
// Nodes and containment. `parent` is the default container; a view can move a kind into another container.
//

const ECHO_RADIUS = ORG_RADIUS * 0.5;

export const nodes = [
  {
    id: 'org',
    kind: 'container',
    label: 'Your company',
    labelClass: 'hero',
    size: ORG_RADIUS,
    color: '#8fa3d9',
    parent: 'world',
  },
  ...SAAS.map((label) => ({
    id: label,
    kind: 'saas',
    label,
    size: 2.4 + hashRandom(label) * 1.4,
    color: '#a07cf0',
    parent: 'world',
  })),
  {
    id: 'lab',
    kind: 'lab',
    label: 'Frontier Labs',
    size: 5,
    color: '#a07cf0',
    opacity: 0.22,
    labelClass: 'hero',
    parent: 'world',
  },
];

// A SaaS vendor, its tenant orgs, and each org's data held inside the vendor.
nodes.push(
  {
    id: 'vendor',
    kind: 'vendor',
    label: 'SaaS',
    labelClass: 'hero',
    size: ORG_RADIUS,
    color: '#a07cf0',
    // A clear near half, a near-solid far half that hides what passes behind it, and a light lattice for depth.
    opacity: 0.08,
    backOpacity: 0.95,
    wire: 0.6,
    rim: 0.3,
    parent: 'world',
  },
  { id: 'data-org', kind: 'data', label: 'Your data', size: 9, color: '#f5c542', parent: 'vendor' },
  // Your people, as one sphere inside your company (SaaS scenario, scene 2).
  { id: 'your-teams', kind: 'people', label: 'Your teams', size: 9, color: '#5b8def', parent: 'org' },
  // What the vendor learns across every tenant's data.
  { id: 'metadata', kind: 'metadata', label: '“Metadata”', size: 22, color: '#f08a5d', parent: 'vendor' },
  { id: 'data-ring', kind: 'ring', size: ORG_RADIUS, color: '#f5c542', parent: 'vendor' },
  ...YOUR_APPS.map((app) => ({ id: `yours-${app}`, kind: 'data', size: 9, color: '#f5c542', parent: app })),
  { id: 'yours-lab', kind: 'data', label: '', size: 9, color: '#f5c542', parent: 'lab' },
  // Your company's own data, held in ECHO inside it; ECHO in turn holds the spaces.
  { id: 'echo-hub', kind: 'hub', label: 'ECHO', size: ECHO_RADIUS, color: '#f5c542', parent: 'org' },
  // Two more frontier labs, competitors to the first (SaaS scenario, scene 7).
  ...['rival-1', 'rival-2'].map((id) => ({
    id,
    kind: 'rival',
    label: 'Frontier Labs',
    labelClass: 'hero',
    size: 5,
    color: '#a07cf0',
    opacity: 0.22,
    parent: 'world',
  })),
  // Your company's teams, packed inside it.
  ...TEAMS.map(([label, color, size]) => ({
    id: `team-${label}`,
    kind: 'team',
    label,
    size,
    color,
    parent: 'org',
  })),
  ...Array.from({ length: TENANTS }, (_, index) => [
    // An empty label, so a scene can name one.
    { id: `tenant-${index}`, kind: 'tenant', label: '', size: 2, color: '#8fa3d9', parent: 'world' },
    { id: `data-${index}`, kind: 'data', size: 9, color: '#f5c542', parent: 'vendor' },
  ]).flat(),
);

const spaceId = (label) => `space-${label}`;
const byId = new Map(nodes.map((node) => [node.id, node]));

// Space sizes follow from packing, so they are fixed here once; layout.js only positions them.
const addSpaces = (spaces, parent, radius, depth) => {
  const { size } = packGeometry(spaces.length, radius);
  for (const space of spaces) {
    const leaf = !space.children?.length;
    const node = {
      id: spaceId(space.label),
      kind: 'space',
      label: depth <= SPACE_LABEL_DEPTH ? space.label : undefined,
      size,
      parent,
      ...(leaf ? SPACE_STYLE[2] : SPACE_STYLE[Math.min(depth, 1)]),
    };
    nodes.push(node);
    byId.set(node.id, node);
    if (!leaf) {
      addSpaces(space.children, node.id, size, depth + 1);
    }
  }
};
addSpaces(SPACES, 'echo-hub', ECHO_RADIUS * 0.95, 0);

// The unit object radius: the outermost shell plus one object fits inside the space with a margin.
const spaceRadius = byId.get(spaceId(OBJECT_SPACE)).size;
export const OBJECT_UNIT = (spaceRadius * 0.9) / (SHELL_STEP * (OBJECT_LEVELS - 1) + 1);

/** Even directions on a sphere (Fibonacci lattice). */
const sphereDirection = (index, count) => {
  const y = 1 - ((index + 0.5) / count) * 2;
  const ring = Math.sqrt(1 - y * y);
  const theta = index * 2.399963;
  return [Math.cos(theta) * ring, y, Math.sin(theta) * ring];
};

// Level 0 is the centre object; each further level has as many objects as its sphere fits at SHELL_SPACING apart.
// The inner two levels are `object`, the outer two `mote`, so a scene can bring the outer shells in later.
const objectShells = Array.from({ length: OBJECT_LEVELS }, (_, level) => {
  const shellRadius = level * SHELL_STEP;
  const count =
    level === 0 ? 1 : Math.round(((4 * Math.PI * shellRadius ** 2) / (SHELL_SPACING ** 2 * 0.866)) * SHELL_DENSITY);
  return Array.from({ length: count }, (_, index) => ({
    id: level === 0 ? 'object-Roadmap' : `object-${level}-${index}`,
    level,
    direction: level === 0 ? [0, 0, 0] : sphereDirection(index, count),
  }));
});
for (const shell of objectShells) {
  for (const { id, level, direction } of shell) {
    nodes.push({
      id,
      kind: level < 2 ? 'object' : 'mote',
      // Drawn at half the unit, so the shells read as open lattices rather than solid balls, and smaller each level out.
      size: OBJECT_UNIT * 0.5 * SHELL_SHRINK ** level,
      color: objectColor(id),
      parent: spaceId(OBJECT_SPACE),
      level,
      direction,
    });
  }
}

// The object scene 16 picks out: any one off the centre, chosen by a stable hash.
const offCentre = objectShells.slice(1).flat();
export const PICKED_OBJECT = offCentre[Math.floor(hashRandom('picked-object') * offCentre.length)].id;
// A second object, on the far side (screen-left), for the conversation in the left-hand panel.
const leftSide = objectShells[2].filter((object) => object.direction[0] < -0.5);
export const LEFT_OBJECT = leftSide[Math.floor(hashRandom('left-object') * leftSide.length)].id;
// A third, lower on the left (toward the viewer, so lower on screen), for the second left-hand conversation.
const lowerLeft = objectShells[2].filter(
  (object) => object.id !== LEFT_OBJECT && object.direction[0] < -0.15 && object.direction[2] > 0.5,
);
export const LOWER_LEFT_OBJECT = lowerLeft[Math.floor(hashRandom('lower-left-object') * lowerLeft.length)].id;

// Objects agents create at the end of a conversation: each sits just outside the object it came from, on the same
// bearing, nudged toward the middle of the screen so it stays clear of the card columns in the margins.
const objectById = new Map(objectShells.flat().map((object) => [object.id, object]));
const createdNodes = [];
const createNear = (id, sourceId, nudge, color) => {
  const source = objectById.get(sourceId);
  const object = {
    id,
    level: source.level + 0.7,
    direction: source.direction.map((component, axis) => component + nudge[axis]),
  };
  objectById.set(id, object);
  nodes.push({
    id,
    kind: 'spawn',
    size: OBJECT_UNIT * 0.5,
    color,
    parent: spaceId(OBJECT_SPACE),
    ...object,
  });
  createdNodes.push({ type: 'created', from: sourceId, to: id });
};
export const CREATED_OBJECT = 'object-created';
export const REVIEW_OBJECT = 'object-review';
export const BLOCKERS_OBJECT = 'object-blockers';
export const FAQ_OBJECT = 'object-faq';
// Each artifact has its own colour, carried by its card and the line to it, so each can be told apart.
createNear(CREATED_OBJECT, PICKED_OBJECT, [-0.35, 0.1, 0.05], '#3ccf6e');
createNear(REVIEW_OBJECT, CREATED_OBJECT, [-0.3, -0.12, 0.1], '#ff4d4d');
createNear(BLOCKERS_OBJECT, LEFT_OBJECT, [0.35, 0.1, -0.05], '#4f8dff');
createNear(FAQ_OBJECT, LOWER_LEFT_OBJECT, [0.35, 0.05, -0.1], '#f5c542');
// The created objects form a chain: the blockers list is linked to the roadmap update it was flagged on.
createdNodes.push({ type: 'created', from: CREATED_OBJECT, to: BLOCKERS_OBJECT });
createdNodes.push({ type: 'created', from: BLOCKERS_OBJECT, to: FAQ_OBJECT });

const distance = (left, right) => Math.hypot(...left.map((component, axis) => component - right[axis]));
const placed = (object) => object.direction.map((component) => component * object.level);
// Hierarchy: every object hangs off the nearest object one level in; a few also link to a neighbour on their own
// shell, so each branch forms a small sub-graph.
const childEdges = objectShells.slice(1).flatMap((shell, index) =>
  shell.map((object) => {
    const inner = objectShells[index];
    const nearest = inner.reduce((best, candidate) =>
      distance(placed(candidate), placed(object)) < distance(placed(best), placed(object)) ? candidate : best,
    );
    return { type: 'child', from: nearest.id, to: object.id };
  }),
);
const shellLinks = objectShells.slice(1).flatMap((shell) =>
  shell
    .filter((object) => hashRandom(`${object.id}:peer`) < 0.3)
    .map((object) => {
      const neighbour = shell
        .filter((candidate) => candidate !== object)
        .reduce((best, candidate) =>
          distance(candidate.direction, object.direction) < distance(best.direction, object.direction)
            ? candidate
            : best,
        );
      return { type: 'refs', from: object.id, to: neighbour.id };
    }),
);

//
// Relations: typed edges a view chooses to draw.
//

// Hyperedges joining spaces across clusters.
const links = [
  ['US', 'Acme'],
  ['EMEA', 'Globex'],
  ['Platform', 'Cloudflare'],
  ['Apps', 'Agency'],
  ['Notes', 'Engineering'],
  ['Inbox', 'Customers'],
].map(([from, to]) => ({ type: 'links', from: spaceId(from), to: spaceId(to) }));

// Each org owns its data, wherever that data is held.
const owns = [
  { type: 'owns', from: 'org', to: 'data-org' },
  ...YOUR_APPS.map((app) => ({ type: 'owns', from: 'org', to: `yours-${app}` })),
  { type: 'owns', from: 'org', to: 'yours-lab' },
  ...Array.from({ length: TENANTS }, (_, index) => ({ type: 'owns', from: `tenant-${index}`, to: `data-${index}` })),
];

// A team uses the piece of your data held by each app it works in ('org' is the original vendor's piece).
const uses = Object.entries(TEAM_APPS).flatMap(([team, apps]) =>
  apps.map((app) => ({ type: 'uses', from: `team-${team}`, to: app === 'org' ? 'data-org' : `yours-${app}` })),
);

// Each other company relies on one of the three frontier labs.
const LABS = ['lab', 'rival-1', 'rival-2'];
// Three of the other companies, picked at random, named as your competitors (SaaS scenario, scene 3).
export const COMPETITORS = Array.from({ length: TENANTS }, (_, index) => `tenant-${index}`)
  .sort((left, right) => hashRandom(`${left}:competitor`) - hashRandom(`${right}:competitor`))
  .slice(0, 3);
export const TENANT_LAB = Object.fromEntries(
  Array.from({ length: TENANTS }, (_, index) => [
    `tenant-${index}`,
    LABS[Math.floor(hashRandom(`tenant-${index}:lab`) * LABS.length)],
  ]),
);
const relies = Object.entries(TENANT_LAB).map(([tenant, lab]) => ({ type: 'relies', from: tenant, to: lab }));

// Your company comes to depend on every frontier lab.
const depends = ['lab', 'rival-1', 'rival-2'].map((lab) => ({ type: 'depends', from: 'org', to: lab }));

// Every other company comes to rely on the frontier lab.
const adopts = Array.from({ length: TENANTS }, (_, index) => ({ type: 'adopts', from: `tenant-${index}`, to: 'lab' }));

// The vendor derives its metadata from every tenant's data.
const derives = ['data-org', ...Array.from({ length: TENANTS }, (_, index) => `data-${index}`)].map((data) => ({
  type: 'derives',
  from: data,
  to: 'metadata',
}));

export const relations = [
  ...links,
  ...childEdges,
  ...shellLinks,
  ...createdNodes,
  ...owns,
  ...derives,
  ...uses,
  ...adopts,
  ...depends,
  ...relies,
];

//
// Container layouts: each container arranges its children in slots, matched by kind.
// Radii are fractions of the container's size unless `absolute` is set.
//

export const containers = {
  'world': [{ kinds: ['container'], arrange: 'centre' }],
  'org': [{ kinds: ['hub'], arrange: 'centre' }],
  'echo-hub': [{ kinds: ['space'], arrange: 'pack', radius: 0.95 }],
  'vendor': [{ kinds: ['data'], arrange: 'cloud', radius: 0.5, flatten: 0.6 }],
  'space': [
    { kinds: ['space'], arrange: 'pack', radius: 1 },
    // Shell spacing comes from the unit, not the drawn size, so shrinking the objects leaves the shells in place.
    { kinds: ['object', 'mote', 'spawn'], arrange: 'shells', step: SHELL_STEP, radius: OBJECT_UNIT / spaceRadius },
  ],
};
