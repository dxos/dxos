#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Renders the ECHO infographic: a cell-like cutaway of the data layers plus a lens on one object's threads.
// Usage: node infographic.mjs [outDir]  → echo-cell.svg and echo-cell.png (via headless Chrome).

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const outDir = resolve(process.argv[2] ?? 'temp/infographic');
const W = 1920;
const H = 1080;

// Plane tilt: circles on the cell's floor are drawn as ellipses with ry = rx * TILT.
const TILT = 0.52;
const CX = 640;
const CY = 590;

let seed = 7;
const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

const defs = [];
const gradients = new Map();

/** Glossy sphere gradient for a base colour. */
const sphere = (base, light = '#ffffff', dark = shade(base, -0.45)) => {
  const key = `${base}${light}${dark}`;
  if (!gradients.has(key)) {
    const id = `s${gradients.size}`;
    gradients.set(key, id);
    defs.push(`<radialGradient id="${id}" cx="38%" cy="32%" r="70%" fx="32%" fy="26%">
      <stop offset="0" stop-color="${light}" stop-opacity="0.95"/>
      <stop offset="0.28" stop-color="${shade(base, 0.25)}"/>
      <stop offset="0.75" stop-color="${base}"/>
      <stop offset="1" stop-color="${dark}"/>
    </radialGradient>`);
  }
  return `url(#${gradients.get(key)})`;
};

function shade(hex, amount) {
  const value = parseInt(hex.slice(1), 16);
  const channel = (shift) => {
    const component = (value >> shift) & 255;
    const target = amount > 0 ? 255 : 0;
    return Math.round(component + (target - component) * Math.abs(amount));
  };
  return `#${[16, 8, 0].map((shift) => channel(shift).toString(16).padStart(2, '0')).join('')}`;
}

const onFloor = (rx, angle, dy = 0) => [CX + rx * Math.cos(angle), CY + rx * TILT * Math.sin(angle) + dy];

const ball = (x, y, r, base, extra = '') =>
  `<ellipse cx="${x + r * 0.15}" cy="${y + r * 0.92}" rx="${r * 0.95}" ry="${r * 0.28}" fill="#1b2559" opacity="0.14" filter="url(#blur)"/>` +
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${sphere(base)}" ${extra}/>`;

const label = (x, y, text, { size = 15, weight = 600, anchor = 'middle', fill = '#1d2440', pill = true } = {}) => {
  const width = text.length * size * 0.56 + 18;
  const left = anchor === 'middle' ? x - width / 2 : anchor === 'end' ? x - width : x;
  return (
    (pill
      ? `<rect x="${left}" y="${y - size * 0.95}" width="${width}" height="${size * 1.55}" rx="${size * 0.78}" fill="#ffffff" opacity="0.92" stroke="#d9def0"/>`
      : '') +
    `<text x="${anchor === 'middle' ? x : anchor === 'end' ? x - 9 : x + 9}" y="${y + size * 0.15}" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}" fill="${fill}">${text}</text>`
  );
};

const body = [];

//
// Cell: membrane ring with embedded external systems.
//

const MEMBRANE_OUT = 540;
const MEMBRANE_IN = 470;

defs.push(`
  <filter id="blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
  <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#1b2559" flood-opacity="0.18"/></filter>
  <filter id="glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <radialGradient id="bg" cx="40%" cy="45%" r="75%"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e9edf7"/></radialGradient>
  <linearGradient id="membrane" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd9c7"/><stop offset="1" stop-color="#f3a98c"/></linearGradient>
  <linearGradient id="membraneSide" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e48c6c"/><stop offset="1" stop-color="#b9583d"/></linearGradient>
  <radialGradient id="cytoplasm" cx="50%" cy="40%" r="65%"><stop offset="0" stop-color="#f4f8ff"/><stop offset="0.7" stop-color="#dce8fd"/><stop offset="1" stop-color="#c3d5f7"/></radialGradient>
  <radialGradient id="nucleus" cx="40%" cy="30%" r="75%"><stop offset="0" stop-color="#ffffff" stop-opacity="0.9"/><stop offset="0.45" stop-color="#b9c6ff" stop-opacity="0.75"/><stop offset="1" stop-color="#5b6fe0" stop-opacity="0.85"/></radialGradient>
  <linearGradient id="capsule" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#127c72"/><stop offset="0.35" stop-color="#5fd6c6"/><stop offset="0.6" stop-color="#2bb3a3"/><stop offset="1" stop-color="#0d5f57"/></linearGradient>
  <radialGradient id="lens" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#eef2fc"/></radialGradient>
`);

body.push(`<rect width="${W}" height="${H}" fill="url(#bg)"/>`);

// Slab: the membrane's side wall gives the disc its thickness.
const DEPTH = 46;
body.push(`<g filter="url(#soft)">
  <ellipse cx="${CX}" cy="${CY + DEPTH}" rx="${MEMBRANE_OUT}" ry="${MEMBRANE_OUT * TILT}" fill="url(#membraneSide)"/>
  <rect x="${CX - MEMBRANE_OUT}" y="${CY}" width="${MEMBRANE_OUT * 2}" height="${DEPTH}" fill="url(#membraneSide)"/>
  <ellipse cx="${CX}" cy="${CY}" rx="${MEMBRANE_OUT}" ry="${MEMBRANE_OUT * TILT}" fill="url(#membrane)"/>
</g>`);

// Lipid heads along both faces of the membrane.
for (const [rx, r] of [
  [MEMBRANE_OUT - 9, 6.5],
  [MEMBRANE_IN + 9, 6],
]) {
  const count = Math.round(rx / 5.2);
  for (let index = 0; index < count; index++) {
    const [x, y] = onFloor(rx, (index / count) * Math.PI * 2);
    body.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${sphere('#f08a6a', '#fff3ec')}"/>`);
  }
}

// Inner well, sunk slightly below the membrane.
body.push(`<ellipse cx="${CX}" cy="${CY + 6}" rx="${MEMBRANE_IN}" ry="${MEMBRANE_IN * TILT}" fill="#b7c9ee"/>
<ellipse cx="${CX}" cy="${CY + 12}" rx="${MEMBRANE_IN - 4}" ry="${(MEMBRANE_IN - 4) * TILT}" fill="url(#cytoplasm)"/>`);

// External systems: channel proteins spanning the membrane.
const SOURCES = ['Email', 'SQL', 'ERP', 'CRM', 'Files', 'Chat', 'Calendar', 'APIs', 'Docs', 'Tickets'];
const sourceItems = SOURCES.map((name, index) => {
  const angle = -Math.PI / 2 + (index / SOURCES.length) * Math.PI * 2 + 0.18;
  const [x, y] = onFloor((MEMBRANE_OUT + MEMBRANE_IN) / 2, angle);
  return { name, angle, x, y };
});

const drawSource = ({ name, x, y, angle }) => {
  const scale = 0.85 + 0.15 * ((y - (CY - MEMBRANE_OUT * TILT)) / (MEMBRANE_OUT * TILT * 2));
  const width = 30 * scale;
  const height = 58 * scale;
  const top = y - height + 8;
  const parts = [
    `<ellipse cx="${x}" cy="${y + 10}" rx="${width * 0.8}" ry="${width * 0.3}" fill="#5a2414" opacity="0.25" filter="url(#blur)"/>`,
    `<rect x="${x - width / 2}" y="${top}" width="${width}" height="${height}" rx="${width / 2}" fill="url(#capsule)"/>`,
    `<ellipse cx="${x}" cy="${top + width / 2}" rx="${width / 2 - 3}" ry="${width * 0.22}" fill="#9df0e4" opacity="0.8"/>`,
  ];
  // Inward flow: beads drifting from the channel toward the spaces.
  for (let step = 1; step <= 3; step++) {
    const [fx, fy] = onFloor((MEMBRANE_OUT + MEMBRANE_IN) / 2 - 28 * step, angle);
    parts.push(`<circle cx="${fx}" cy="${fy}" r="${4.5 - step}" fill="#2bb3a3" opacity="${0.75 - step * 0.18}"/>`);
  }
  const outward = Math.sin(angle) < 0 ? -1 : 1;
  const labelY = outward < 0 ? top - 16 : y + 34;
  parts.push(label(x, labelY, name, { size: 14 }));
  return { y, svg: parts.join('') };
};

//
// Hypergraph: spaces floating in the cytoplasm.
//

const spaces = [];
const SPACE_COLORS = ['#5b8def', '#6a7cf0', '#4aa3e8', '#8a6cf0', '#5b8def'];
const rings = [
  { rx: 385, count: 9, offset: 0.2 },
  { rx: 290, count: 6, offset: 0.65 },
];
for (const { rx, count, offset } of rings) {
  for (let index = 0; index < count; index++) {
    const angle = offset + (index / count) * Math.PI * 2 + (random() - 0.5) * 0.25;
    const radius = rx + (random() - 0.5) * 30;
    const [x, floorY] = onFloor(radius, angle);
    const depth = (floorY - (CY - radius * TILT)) / (radius * TILT * 2);
    const r = (26 + random() * 16) * (0.8 + depth * 0.35);
    spaces.push({ x, y: floorY - r * 0.9, floorY, r, color: SPACE_COLORS[(index + count) % SPACE_COLORS.length] });
  }
}

const nearest = (space, list, take) =>
  list
    .filter((other) => other !== space)
    .map((other) => ({ other, distance: Math.hypot(other.x - space.x, (other.y - space.y) / TILT) }))
    .sort((left, right) => left.distance - right.distance)
    .slice(0, take)
    .map(({ other }) => other);

const nucleus = { x: CX, y: CY - 60, r: 128 };

// Hyperedges: soft hulls joining three spaces, then plain links.
const hyperedges = [
  [0, 1, 10],
  [3, 4, 12],
  [6, 7, 14],
  [11, 12, 13],
];
for (const [first, second, third] of hyperedges) {
  const points = [spaces[first], spaces[second], spaces[third]].map(({ x, y }) => `${x},${y}`).join(' ');
  body.push(
    `<polygon points="${points}" fill="#7d8ff2" fill-opacity="0.13" stroke="#7d8ff2" stroke-opacity="0.18" stroke-width="34" stroke-linejoin="round"/>`,
  );
}
const links = new Set();
for (const space of spaces) {
  for (const other of nearest(space, spaces, 2)) {
    const key = [spaces.indexOf(space), spaces.indexOf(other)].sort((a, b) => a - b).join('-');
    if (links.has(key)) {
      continue;
    }
    links.add(key);
    const mx = (space.x + other.x) / 2;
    const my = (space.y + other.y) / 2 - 18;
    body.push(
      `<path d="M${space.x},${space.y} Q${mx},${my} ${other.x},${other.y}" fill="none" stroke="#4a5fd6" stroke-opacity="0.35" stroke-width="2"/>`,
    );
  }
}
// Every inner-ring space is joined to the central space.
for (const space of spaces.slice(rings[0].count)) {
  body.push(
    `<line x1="${space.x}" y1="${space.y}" x2="${nucleus.x}" y2="${nucleus.y}" stroke="#4a5fd6" stroke-opacity="0.22" stroke-width="2" stroke-dasharray="4 6"/>`,
  );
}

// Each space shows a hint of its own objects as a few specks on its surface.
const drawSpace = ({ x, y, r, color }) => {
  const specks = [0, 1, 2, 3]
    .map((index) => {
      const angle = index * 1.7 + x;
      const distance = r * 0.45;
      return `<circle cx="${x + Math.cos(angle) * distance}" cy="${y + Math.sin(angle) * distance * 0.8}" r="${r * 0.11}" fill="#ffffff" opacity="0.7"/>`;
    })
    .join('');
  return ball(x, y, r, color) + specks;
};

//
// Central space: a translucent dome with its ECHO objects inside.
//

const objects = [];
for (let index = 0; index < 16; index++) {
  const angle = random() * Math.PI * 2;
  const distance = Math.sqrt(random()) * (nucleus.r - 34);
  objects.push({
    x: nucleus.x + Math.cos(angle) * distance,
    y: nucleus.y + Math.sin(angle) * distance * 0.9,
    r: 8 + random() * 7,
  });
}
const focus = objects.reduce((best, object) => (object.x > best.x ? object : best));
focus.r = 15;

const drawNucleus = () => {
  const parts = [
    `<ellipse cx="${nucleus.x}" cy="${nucleus.y + nucleus.r * 0.95}" rx="${nucleus.r * 1.05}" ry="${nucleus.r * 0.3}" fill="#1b2559" opacity="0.2" filter="url(#blur)"/>`,
    `<circle cx="${nucleus.x}" cy="${nucleus.y}" r="${nucleus.r}" fill="url(#nucleus)" stroke="#4458d6" stroke-opacity="0.5" stroke-width="3"/>`,
  ];
  for (const object of objects) {
    for (const other of nearest(object, objects, 2)) {
      parts.push(
        `<line x1="${object.x}" y1="${object.y}" x2="${other.x}" y2="${other.y}" stroke="#2c3aa8" stroke-opacity="0.55" stroke-width="1.6"/>`,
      );
    }
  }
  for (const object of [...objects].sort((left, right) => left.y - right.y)) {
    parts.push(
      `<circle cx="${object.x}" cy="${object.y}" r="${object.r}" fill="${sphere(object === focus ? '#f5a524' : '#3d4fd0', '#ffffff')}"/>`,
    );
  }
  parts.push(
    `<circle cx="${focus.x}" cy="${focus.y}" r="${focus.r + 9}" fill="none" stroke="#f5a524" stroke-width="2.5" stroke-dasharray="5 4"/>`,
  );
  // Glass highlight on the dome.
  parts.push(
    `<ellipse cx="${nucleus.x - 52}" cy="${nucleus.y - 78}" rx="58" ry="26" fill="#ffffff" opacity="0.55" transform="rotate(-28 ${nucleus.x - 52} ${nucleus.y - 78})"/>`,
  );
  return parts.join('');
};

// Paint back to front so nearer items overlap farther ones.
const layered = [
  ...sourceItems.filter(({ y }) => y < CY).map((item) => drawSource(item)),
  ...spaces.map((space) => ({ y: space.floorY, svg: drawSpace(space) })),
  { y: CY + 40, svg: drawNucleus() },
  ...sourceItems.filter(({ y }) => y >= CY).map((item) => drawSource(item)),
].sort((left, right) => left.y - right.y);
// Back sources must stay behind everything inside the membrane.
body.push(...layered.filter(({ svg }) => svg).map(({ svg }) => svg));

//
// Lens: one ECHO object, its threads and the agents working on them.
//

const LENS = { x: 1560, y: 560, r: 305 };
const tangent = (sign) => {
  const dx = LENS.x - focus.x;
  const dy = LENS.y - focus.y;
  const distance = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx) + sign * (Math.PI / 2 + Math.asin((LENS.r - focus.r - 9) / distance));
  return [LENS.x + LENS.r * Math.cos(angle), LENS.y + LENS.r * Math.sin(angle)];
};
const [upperX, upperY] = tangent(1);
const [lowerX, lowerY] = tangent(-1);
body.push(
  `<polygon points="${focus.x},${focus.y - focus.r - 9} ${lowerX},${lowerY} ${upperX},${upperY} ${focus.x},${focus.y + focus.r + 9}" fill="#f5a524" opacity="0.08"/>`,
  `<line x1="${focus.x}" y1="${focus.y - focus.r - 9}" x2="${lowerX}" y2="${lowerY}" stroke="#f5a524" stroke-opacity="0.7" stroke-width="1.5"/>`,
  `<line x1="${focus.x}" y1="${focus.y + focus.r + 9}" x2="${upperX}" y2="${upperY}" stroke="#f5a524" stroke-opacity="0.7" stroke-width="1.5"/>`,
  `<circle cx="${LENS.x}" cy="${LENS.y}" r="${LENS.r}" fill="url(#lens)" stroke="#f5a524" stroke-width="3" filter="url(#soft)"/>`,
  `<clipPath id="lensClip"><circle cx="${LENS.x}" cy="${LENS.y}" r="${LENS.r - 4}"/></clipPath>`,
);

// Thread tree: each branch is a reply chain that can fork into sub-threads.
const ROOT = { x: LENS.x - 215, y: LENS.y + 10 };
const AGENTS = [
  { name: 'Research agent', color: '#9b5de5' },
  { name: 'Planner', color: '#f5a524' },
  { name: 'Writer', color: '#2fbf71' },
  { name: 'You', color: '#e5484d' },
];
const tree = [
  {
    dy: -170,
    agent: 0,
    children: [
      { dy: -230, children: [], agent: 0 },
      { dy: -120, children: [{ dy: -150 }] },
    ],
  },
  {
    dy: 0,
    agent: 1,
    children: [
      { dy: -45, children: [{ dy: -60 }, { dy: -15, agent: 3 }] },
      { dy: 50, children: [] },
    ],
  },
  {
    dy: 160,
    agent: 2,
    children: [
      { dy: 125, children: [{ dy: 115 }] },
      { dy: 215, children: [], agent: 2 },
    ],
  },
];

const lensParts = [];
const agentMarks = [];
const LEVEL_X = [ROOT.x, ROOT.x + 150, ROOT.x + 300, ROOT.x + 420];
const walk = (node, from, level, color) => {
  const to = { x: LEVEL_X[level], y: LENS.y + node.dy };
  const tint = node.agent !== undefined ? AGENTS[node.agent].color : color;
  const midX = (from.x + to.x) / 2;
  const width = 7 - level * 1.6;
  lensParts.push(
    `<path d="M${from.x},${from.y} C${midX},${from.y} ${midX},${to.y} ${to.x},${to.y}" fill="none" stroke="${tint}" stroke-width="${width + 6}" stroke-opacity="0.15" stroke-linecap="round"/>`,
    `<path d="M${from.x},${from.y} C${midX},${from.y} ${midX},${to.y} ${to.x},${to.y}" fill="none" stroke="${tint}" stroke-width="${width}" stroke-linecap="round"/>`,
  );
  // Messages: beads along the reply chain.
  for (let bead = 1; bead <= 3; bead++) {
    const t = bead / 4;
    const x = (1 - t) ** 3 * from.x + 3 * (1 - t) ** 2 * t * midX + 3 * (1 - t) * t ** 2 * midX + t ** 3 * to.x;
    const y = (1 - t) ** 3 * from.y + 3 * (1 - t) ** 2 * t * from.y + 3 * (1 - t) * t ** 2 * to.y + t ** 3 * to.y;
    lensParts.push(`<circle cx="${x}" cy="${y}" r="${width * 0.55 + 2.5}" fill="${sphere(tint)}"/>`);
  }
  lensParts.push(`<circle cx="${to.x}" cy="${to.y}" r="${width + 2}" fill="${sphere(tint)}"/>`);
  if (node.agent !== undefined) {
    agentMarks.push({ ...to, agent: AGENTS[node.agent] });
  }
  for (const child of node.children ?? []) {
    walk(child, to, level + 1, tint);
  }
};
for (const node of tree) {
  walk(node, ROOT, 1, '#4a5fd6');
}

// Agents: glowing hexagons perched on the thread ends they are working on.
const hexagon = (x, y, r) =>
  Array.from({ length: 6 }, (_, index) => {
    const angle = Math.PI / 6 + (index * Math.PI) / 3;
    return `${(x + r * Math.cos(angle)).toFixed(1)},${(y + r * Math.sin(angle)).toFixed(1)}`;
  }).join(' ');
const labelled = new Set();
for (const { x, y, agent } of agentMarks) {
  const hx = x + 30;
  lensParts.push(
    `<line x1="${x}" y1="${y}" x2="${hx}" y2="${y}" stroke="${agent.color}" stroke-width="2" stroke-dasharray="3 3"/>`,
    `<polygon points="${hexagon(hx, y, 15)}" fill="${sphere(agent.color)}" filter="url(#glow)"/>`,
    `<circle cx="${hx}" cy="${y}" r="4" fill="#ffffff"/>`,
  );
  if (!labelled.has(agent.name)) {
    labelled.add(agent.name);
    lensParts.push(label(hx + 22, y, agent.name, { size: 13, anchor: 'start', fill: shade(agent.color, -0.35) }));
  }
}

lensParts.push(
  `<ellipse cx="${ROOT.x + 5}" cy="${ROOT.y + 42}" rx="40" ry="10" fill="#1b2559" opacity="0.18" filter="url(#blur)"/>`,
  `<circle cx="${ROOT.x}" cy="${ROOT.y}" r="40" fill="${sphere('#f5a524')}"/>`,
  `<circle cx="${ROOT.x}" cy="${ROOT.y}" r="40" fill="none" stroke="#ffffff" stroke-opacity="0.6" stroke-width="2"/>`,
);
body.push(`<g clip-path="url(#lensClip)">${lensParts.join('')}</g>`);
body.push(label(ROOT.x, ROOT.y + 70, 'ECHO object', { size: 14 }));

//
// Annotations.
//

const callout = (fromX, fromY, toX, toY, title, detail, anchor = 'start') => {
  const textX = fromX;
  const [startX, startY] = toY > fromY ? [fromX + 40, fromY + 36] : [fromX + 40, fromY - 28];
  body.push(
    `<path d="M${startX},${startY} L${toX},${toY}" fill="none" stroke="#1d2440" stroke-opacity="0.45" stroke-width="1.3"/>`,
    `<circle cx="${toX}" cy="${toY}" r="4" fill="#1d2440"/>`,
    `<text x="${textX}" y="${fromY}" font-size="19" font-weight="700" fill="#1d2440" text-anchor="${anchor}">${title}</text>`,
    `<text x="${textX}" y="${fromY + 24}" font-size="15" fill="#525b7a" text-anchor="${anchor}">${detail}</text>`,
  );
};

body.push(
  `<text x="64" y="92" font-size="44" font-weight="800" fill="#1d2440" letter-spacing="-0.5">ECHO</text>`,
  `<text x="64" y="128" font-size="20" fill="#525b7a">One semantic graph, partitioned into secure spaces</text>`,
);

const [membraneX, membraneY] = onFloor(MEMBRANE_OUT - 20, Math.PI * 1.03);
callout(64, 890, membraneX, membraneY, 'External systems', 'Connected at the edge, synced in');
const outerSpace = spaces.reduce((best, space) => (space.y < best.y ? space : best));
callout(
  470,
  196,
  outerSpace.x - outerSpace.r * 0.6,
  outerSpace.y - outerSpace.r * 0.6,
  'ECHO hypergraph',
  'A constellation of linked spaces',
);
callout(
  250,
  1010,
  nucleus.x - nucleus.r * 0.7,
  nucleus.y + nucleus.r * 0.55,
  'Space',
  'Objects and relations, shared securely',
);
body.push(
  `<text x="${LENS.x}" y="${LENS.y - LENS.r - 26}" font-size="19" font-weight="700" fill="#1d2440" text-anchor="middle">Inside an object</text>`,
  `<text x="${LENS.x}" y="${LENS.y + LENS.r + 40}" font-size="15" fill="#525b7a" text-anchor="middle">Threads branch into sub-threads; agents work on them side by side</text>`,
);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Inter, -apple-system, 'Helvetica Neue', Arial, sans-serif">
<defs>${defs.join('\n')}</defs>
${body.join('\n')}
</svg>`;

mkdirSync(outDir, { recursive: true });
const svgPath = join(outDir, 'echo-cell.svg');
const htmlPath = join(outDir, 'echo-cell.html');
const pngPath = join(outDir, 'echo-cell.png');
writeFileSync(svgPath, svg);
writeFileSync(htmlPath, `<!doctype html><html><body style="margin:0">${svg}</body></html>`);
execFileSync(
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  [
    '--headless=new',
    '--hide-scrollbars',
    '--force-device-scale-factor=2',
    `--window-size=${W},${H}`,
    `--screenshot=${pngPath}`,
    `file://${htmlPath}`,
  ],
  { stdio: 'ignore' },
);
console.log(pngPath);
