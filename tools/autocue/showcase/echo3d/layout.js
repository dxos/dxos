//
// Copyright 2026 DXOS.org
//

// Derives positions from containment: each container places its children by its slots in model.js.

import { containers, hashRandom, nodes, packGeometry, relations } from './model.js';

const byId = new Map(nodes.map((node) => [node.id, node]));

const add = (centre, offset) => centre.map((component, axis) => component + offset[axis]);

const arrangers = {
  centre: (members, centre) => members.map((node) => [node.id, centre]),

  // At a fixed offset from the container's centre.
  at: (members, centre, radius, slot) => members.map((node) => [node.id, add(centre, slot.offset)]),

  // Evenly spaced on a circle from `start` (radians, 0 = 3 o'clock, π = 9 o'clock), or on an arc when `span` is set;
  // a node with a fixed `angle` keeps it and the rest share the remaining places.
  ring: (unordered, centre, radius, slot) => {
    // `shuffle` orders members by a stable hash, so a chosen node lands at an arbitrary place among the rest.
    const members = slot.shuffle
      ? [...unordered].sort((left, right) => hashRandom(`${left.id}:order`) - hashRandom(`${right.id}:order`))
      : unordered;
    // `fixedAngles: false` spaces every member evenly, ignoring any node's own `angle`.
    const fixed = (node) => slot.fixedAngles !== false && node.angle !== undefined;
    const free = members.filter((node) => !fixed(node));
    // An arc has a place at each end; a full circle does not repeat its first place.
    const places = slot.span ? Math.max(1, free.length - 1) : free.length;
    const sweep = slot.span ?? Math.PI * 2;
    // `rings: n` deals members round-robin onto n concentric rings, each `ringGap` (a fraction of the radius) further
    // out, offset by half a step so neighbouring rings interleave.
    const rings = slot.rings ?? 1;
    return members.map((node) => {
      const index = free.indexOf(node);
      const ring = index % rings;
      const count = Math.ceil(free.length / rings);
      const step = Math.floor(index / rings) + (slot.offset ?? 0) + (ring % 2) * 0.5;
      const angle = fixed(node) ? node.angle : (slot.start ?? 0) + (step / (rings > 1 ? count : places)) * sweep;
      const distance = radius * (1 + ring * (slot.ringGap ?? 0));
      return [node.id, add(centre, [Math.cos(angle) * distance, 0, Math.sin(angle) * distance])];
    });
  },

  // A loose ball; `flatten` squashes it toward the ground plane so it reads from above.
  cloud: (members, centre, radius, slot) =>
    members.map((node) => {
      const theta = hashRandom(`${node.id}:theta`) * Math.PI * 2;
      const height = hashRandom(`${node.id}:height`) * 2 - 1;
      const distance = radius * Math.cbrt(hashRandom(`${node.id}:distance`));
      const ring = Math.sqrt(1 - height * height);
      return [
        node.id,
        add(centre, [
          Math.cos(theta) * ring * distance,
          height * distance * slot.flatten,
          Math.sin(theta) * ring * distance,
        ]),
      ];
    }),

  // Side by side along x, each a container's-width apart; used for a side view.
  row: (members, centre, radius, slot, sizeOf) => {
    const widths = members.map((node) => sizeOf(node));
    const total = widths.reduce((sum, width) => sum + width * 2, 0) + slot.gap * (members.length - 1);
    let cursor = -total / 2;
    return members.map((node, index) => {
      const x = cursor + widths[index];
      cursor += widths[index] * 2 + slot.gap;
      return [node.id, add(centre, [x, 0, 0])];
    });
  },

  // Concentric shells: each node sits along its `direction` at `level` steps out, a step being `step` units (the slot
  // radius is the unit).
  shells: (members, centre, radius, slot) =>
    members.map((node) => [
      node.id,
      add(
        centre,
        node.direction.map((component) => component * node.level * slot.step * radius),
      ),
    ]),

  // A horizontal slice of the container's sphere at height `level` (a fraction of the radius, 0 = through the centre),
  // filled at random: even coverage of the disc, with a little vertical jitter (`thickness`, also a fraction).
  slice: (members, centre, radius, slot) => {
    const level = (slot.level ?? 0) * radius;
    const disc = Math.sqrt(Math.max(0, radius * radius - level * level));
    return members.map((node) => {
      const angle = hashRandom(`${node.id}:slice:a`) * Math.PI * 2;
      const distance = disc * Math.sqrt(hashRandom(`${node.id}:slice:d`));
      const jitter = (hashRandom(`${node.id}:slice:y`) * 2 - 1) * (slot.thickness ?? 0.04) * radius;
      return [node.id, add(centre, [Math.cos(angle) * distance, level + jitter, Math.sin(angle) * distance])];
    });
  },

  // Groups by each node's `cluster`: cluster centres spread over a sphere of the slot radius, members in a small ball
  // (`spread`, a fraction of the container's size, before scaling by radius) round their centre.
  clusters: (members, centre, radius, slot) => {
    const ids = [...new Set(members.map((node) => node.cluster))].sort((left, right) => left - right);
    const centres = new Map(
      ids.map((cluster, index) => {
        const y = 1 - ((index + 0.5) / ids.length) * 2;
        const ring = Math.sqrt(1 - y * y);
        const theta = index * 2.399963;
        return [
          cluster,
          add(centre, [Math.cos(theta) * ring * radius, y * radius * 0.7, Math.sin(theta) * ring * radius]),
        ];
      }),
    );
    const ball = (radius / (slot.radius ?? 1)) * (slot.spread ?? 0.2);
    return members.map((node) => {
      const theta = hashRandom(`${node.id}:theta`) * Math.PI * 2;
      const height = hashRandom(`${node.id}:height`) * 2 - 1;
      const distance = ball * Math.cbrt(hashRandom(`${node.id}:distance`));
      const ring = Math.sqrt(1 - height * height);
      return [
        node.id,
        add(centres.get(node.cluster), [
          Math.cos(theta) * ring * distance,
          height * distance,
          Math.sin(theta) * ring * distance,
        ]),
      ];
    });
  },

  // Scattered at random between `inner` and the slot radius, in the ground plane, kept clear of the spheres named in
  // `avoid` (already placed by an earlier slot).
  scatter: (members, centre, radius, slot, sizeOf, placed) => {
    const obstacles = (slot.avoid ?? [])
      .filter((id) => placed.has(id))
      .map((id) => ({ at: placed.get(id), clear: sizeOf(byId.get(id)) + (slot.margin ?? 4) }));
    return members.map((node) => {
      let position;
      for (let attempt = 0; attempt < 40; attempt++) {
        const angle = hashRandom(`${node.id}:scatter:${attempt}:a`) * Math.PI * 2;
        const distance = slot.inner + (radius - slot.inner) * Math.sqrt(hashRandom(`${node.id}:scatter:${attempt}:d`));
        position = add(centre, [Math.cos(angle) * distance, 0, Math.sin(angle) * distance]);
        if (obstacles.every(({ at, clear }) => Math.hypot(position[0] - at[0], position[2] - at[2]) > clear)) {
          break;
        }
      }
      return [node.id, position];
    });
  },

  // Rotated so no child sits at the top (-z), where the container's label is drawn.
  pack: (members, centre, radius) => {
    const { distance } = packGeometry(members.length, radius);
    return members.map((node, index) => {
      const angle = (index / members.length) * Math.PI * 2 - Math.PI / 2 + Math.PI / members.length;
      return [node.id, add(centre, [Math.cos(angle) * distance, 0, Math.sin(angle) * distance])];
    });
  },

  // Roots at the centre, children on a Fibonacci sphere of directions, grandchildren fanned around their parent.
  tree: (members, centre, radius, slot) => {
    const ids = new Set(members.map((node) => node.id));
    const edges = relations.filter((edge) => edge.type === slot.edge && ids.has(edge.from) && ids.has(edge.to));
    const childrenOf = (id) => edges.filter((edge) => edge.from === id).map((edge) => edge.to);
    const roots = members.filter((node) => !edges.some((edge) => edge.to === node.id));
    const placed = [];
    for (const root of roots) {
      placed.push([root.id, centre]);
      const children = childrenOf(root.id);
      children.forEach((child, index) => {
        const y = 1 - ((index + 0.5) / children.length) * 2;
        const ring = Math.sqrt(1 - y * y);
        const theta = index * 2.399963;
        const direction = [Math.cos(theta) * ring, y * 0.8, Math.sin(theta) * ring];
        placed.push([
          child,
          add(
            centre,
            direction.map((component) => component * radius * 0.42),
          ),
        ]);
        const grandchildren = childrenOf(child);
        grandchildren.forEach((grandchild, grandIndex) => {
          const spread = (grandIndex - (grandchildren.length - 1) / 2) * 0.9;
          const fanned = [
            direction[0] + Math.cos(theta + Math.PI / 2) * spread * 0.5,
            direction[1] + spread * 0.35,
            direction[2] + Math.sin(theta + Math.PI / 2) * spread * 0.5,
          ];
          const length = Math.hypot(...fanned);
          placed.push([
            grandchild,
            add(
              centre,
              fanned.map((component) => (component / length) * radius * 0.78),
            ),
          ]);
        });
      });
    }
    return placed;
  },
};

/**
 * Lays out every node for one view.
 * @param {{ move?: Record<string, string>, containers?: Record<string, object[]> }} view `move` maps a kind or id to
 *   a container, overriding the default parent; `containers` replaces the model's slots for the named containers.
 * @param {(node: object) => number} scaleOf the view's size multiplier for a node, so slots fit drawn sizes.
 * @returns {{ positions: Map<string, number[]>, parentOf: (id: string) => string, rings: Map<string, { radius: number, members: string[] }> }}
 */
export const layout = ({ move = {}, containers: overrides = {} } = {}, scaleOf = () => 1) => {
  const sizeOf = (node) => node.size * scaleOf(node);
  const parentOf = (id) => {
    const node = byId.get(id);
    return move[id] ?? move[node.kind] ?? node.parent;
  };
  const children = new Map();
  for (const node of nodes) {
    const parent = parentOf(node.id);
    children.set(parent, [...(children.get(parent) ?? []), node]);
  }

  const positions = new Map();
  const rings = new Map();
  const place = (containerId, centre) => {
    const container = byId.get(containerId);
    const slots =
      overrides[containerId] ??
      overrides[container?.kind] ??
      containers[containerId] ??
      containers[container?.kind] ??
      [];
    const contents = children.get(containerId) ?? [];
    for (const slot of slots) {
      // A slot matches by kind or by id, so a view can pick out individual nodes.
      const members = contents.filter((node) => slot.kinds.includes(node.kind) || slot.kinds.includes(node.id));
      const radius = slot.absolute ? slot.radius : (slot.radius ?? 1) * (container ? sizeOf(container) : 0);
      if (slot.ring) {
        rings.set(slot.ring, { radius, members: members.map((node) => node.id) });
        positions.set(slot.ring, centre);
      }
      for (const [id, position] of arrangers[slot.arrange](members, centre, radius, slot, sizeOf, positions)) {
        positions.set(id, position);
        place(id, position);
      }
    }
  };
  place('world', [0, 0, 0]);
  return { positions, parentOf, rings };
};
