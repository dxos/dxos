//
// Copyright 2026 DXOS.org
//

// A force-directed layout for card-sized nodes, computed once per graph: rings around the roots by hop distance,
// springs along edges, repulsion between all nodes, and rectangle collision so cards never overlap. Deterministic
// (no randomness), so the same graph always lays out the same way: what a test or a recording relies on.

import { type SubjectGraph } from '../../client/types.ts';

export type Size = { width: number; height: number };

export type Placement = { x: number; y: number; width: number; height: number; hops: number; root: boolean };

export type Layout = {
  placements: Map<string, Placement>;
  /** The bounding box of every card. */
  bounds: { x: number; y: number; width: number; height: number };
};

export type LayoutOptions = {
  sizeOf: (id: string, root: boolean) => Size;
  /** Distance between rings. */
  ring?: number;
  iterations?: number;
};

const GAP = 16;

/** Hops from the nearest root over the undirected edges; nodes no root reaches sit one ring past the furthest. */
export const hopsFrom = (graph: SubjectGraph): Map<string, number> => {
  const adjacency = new Map<string, string[]>();
  for (const edge of graph.edges) {
    adjacency.set(edge.from, [...(adjacency.get(edge.from) ?? []), edge.to]);
    adjacency.set(edge.to, [...(adjacency.get(edge.to) ?? []), edge.from]);
  }
  const ids = new Set(graph.nodes.map((node) => node.id));
  const roots = graph.roots.filter((root) => ids.has(root));
  const start = roots.length ? roots : graph.nodes.slice(0, 1).map((node) => node.id);
  const hops = new Map(start.map((id) => [id, 0]));
  const queue = [...start];
  while (queue.length) {
    const current = queue.shift();
    if (current === undefined) {
      break;
    }
    const hop = hops.get(current) ?? 0;
    for (const next of adjacency.get(current) ?? []) {
      if (ids.has(next) && !hops.has(next)) {
        hops.set(next, hop + 1);
        queue.push(next);
      }
    }
  }
  const furthest = Math.max(0, ...hops.values());
  for (const node of graph.nodes) {
    if (!hops.has(node.id)) {
      hops.set(node.id, furthest + 1);
    }
  }
  return hops;
};

/** Lays the graph out; see the module comment. */
export const layoutGraph = (graph: SubjectGraph, { sizeOf, ring = 340, iterations = 220 }: LayoutOptions): Layout => {
  const hops = hopsFrom(graph);
  const rootIds = new Set(graph.nodes.filter((node) => hops.get(node.id) === 0).map((node) => node.id));
  type Body = { id: string; x: number; y: number; width: number; height: number; hops: number; root: boolean };
  const bodies: Body[] = graph.nodes.map((node) => {
    const root = rootIds.has(node.id);
    const { width, height } = sizeOf(node.id, root);
    return { id: node.id, x: 0, y: 0, width, height, hops: hops.get(node.id) ?? 0, root };
  });
  const index = new Map(bodies.map((body, position) => [body.id, position]));
  const links = graph.edges.flatMap((edge) => {
    const source = index.get(edge.from);
    const target = index.get(edge.to);
    return source !== undefined && target !== undefined && source !== target ? [{ source, target }] : [];
  });

  // Start: roots on a small circle (one root at the centre); each ring's nodes ordered by their parent's angle.
  const angle = new Map<string, number>();
  const roots = bodies.filter((body) => body.root);
  roots.forEach((body, position) => {
    const theta = (2 * Math.PI * position) / Math.max(1, roots.length) - Math.PI / 2;
    const radius = roots.length > 1 ? ring * 0.6 : 0;
    body.x = Math.cos(theta) * radius;
    body.y = Math.sin(theta) * radius;
    angle.set(body.id, theta);
  });
  const maxHop = Math.max(0, ...bodies.map((body) => body.hops));
  for (let hop = 1; hop <= maxHop; hop++) {
    const level = bodies.filter((body) => body.hops === hop);
    const parentAngle = (body: Body) => {
      for (const { source, target } of links) {
        const other =
          bodies[source]?.id === body.id ? bodies[target] : bodies[target]?.id === body.id ? bodies[source] : undefined;
        if (other && other.hops === hop - 1 && angle.has(other.id)) {
          return angle.get(other.id) ?? 0;
        }
      }
      return 0;
    };
    const ordered = level
      .map((body, position) => ({ body, key: parentAngle(body), position }))
      .sort((a, b) => a.key - b.key || a.position - b.position);
    ordered.forEach(({ body }, position) => {
      const theta = (2 * Math.PI * position) / ordered.length - Math.PI / 2;
      body.x = Math.cos(theta) * ring * hop;
      body.y = Math.sin(theta) * ring * hop * 0.75;
      angle.set(body.id, theta);
    });
  }

  const radiusOf = (body: Body) => Math.hypot(body.width, body.height) / 2;
  const fixed = roots.length === 1 ? roots[0] : undefined;

  /** Pushes overlapping cards apart along the axis they overlap least on. */
  const collide = (a: Body, b: Body, strength: number) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const overlapX = (a.width + b.width) / 2 + GAP - Math.abs(dx);
    const overlapY = (a.height + b.height) / 2 + GAP - Math.abs(dy);
    if (overlapX <= 0 || overlapY <= 0) {
      return;
    }
    const moveA = a === fixed ? 0 : b === fixed ? 1 : 0.5;
    const moveB = 1 - moveA;
    if (overlapX < overlapY) {
      const push = overlapX * strength * (dx < 0 ? -1 : 1);
      a.x -= push * moveA;
      b.x += push * moveB;
    } else {
      const push = overlapY * strength * (dy < 0 ? -1 : 1);
      a.y -= push * moveA;
      b.y += push * moveB;
    }
  };

  for (let step = 0; step < iterations; step++) {
    const cooling = 1 - step / iterations;
    const limit = 2 + 60 * cooling;
    const forces = bodies.map(() => ({ x: 0, y: 0 }));

    // Repulsion between every pair.
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const a = bodies[i];
        const b = bodies[j];
        const fa = forces[i];
        const fb = forces[j];
        if (!a || !b || !fa || !fb) {
          continue;
        }
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        if (dx === 0 && dy === 0) {
          dx = (j - i) % 2 === 0 ? 1 : -1;
          dy = 0.5;
        }
        const distance = Math.max(1, Math.hypot(dx, dy));
        const reach = radiusOf(a) + radiusOf(b) + 80;
        const force = distance < reach * 2.5 ? (reach * reach) / (distance * distance) : 0;
        fa.x -= (dx / distance) * force * 6;
        fa.y -= (dy / distance) * force * 6;
        fb.x += (dx / distance) * force * 6;
        fb.y += (dy / distance) * force * 6;
      }
    }

    // Springs along edges, to a length that clears both cards.
    for (const { source, target } of links) {
      const a = bodies[source];
      const b = bodies[target];
      const fa = forces[source];
      const fb = forces[target];
      if (!a || !b || !fa || !fb) {
        continue;
      }
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const rest = radiusOf(a) + radiusOf(b) + 40;
      const pull = (distance - rest) * 0.06;
      fa.x += (dx / distance) * pull;
      fa.y += (dy / distance) * pull;
      fb.x -= (dx / distance) * pull;
      fb.y -= (dy / distance) * pull;
    }

    // Rings: each node is drawn towards its hop's distance from the centre.
    bodies.forEach((body, position) => {
      const force = forces[position];
      if (!force || body.root) {
        return;
      }
      const distance = Math.max(1, Math.hypot(body.x, body.y * (4 / 3)));
      const pull = (ring * body.hops - distance) * 0.08;
      force.x += (body.x / distance) * pull;
      force.y += (body.y / distance) * pull;
    });

    bodies.forEach((body, position) => {
      const force = forces[position];
      if (!force || body === fixed) {
        return;
      }
      const magnitude = Math.hypot(force.x, force.y);
      const scale = magnitude > limit ? limit / magnitude : 1;
      body.x += force.x * scale;
      body.y += force.y * scale;
    });

    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const a = bodies[i];
        const b = bodies[j];
        if (a && b) {
          collide(a, b, 0.5);
        }
      }
    }
  }

  // Settle: collision only, until no two cards overlap (or the passes run out).
  for (let pass = 0; pass < 60; pass++) {
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const a = bodies[i];
        const b = bodies[j];
        if (a && b) {
          collide(a, b, 1);
        }
      }
    }
  }

  const placements = new Map(
    bodies.map((body) => [
      body.id,
      // `+ 0` turns a negative zero into zero.
      { x: body.x + 0, y: body.y + 0, width: body.width, height: body.height, hops: body.hops, root: body.root },
    ]),
  );
  const left = Math.min(0, ...bodies.map((body) => body.x - body.width / 2));
  const top = Math.min(0, ...bodies.map((body) => body.y - body.height / 2));
  const right = Math.max(0, ...bodies.map((body) => body.x + body.width / 2));
  const bottom = Math.max(0, ...bodies.map((body) => body.y + body.height / 2));
  return { placements, bounds: { x: left, y: top, width: right - left, height: bottom - top } };
};

/**
 * The segment between two cards' borders, so an arrowhead lands on the card's edge rather than under it; undefined
 * while the cards overlap.
 */
export const clipEdge = (
  from: Placement,
  to: Placement,
): { x1: number; y1: number; x2: number; y2: number } | undefined => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const cut = (placement: Placement, pad: number) => {
    const kx = dx === 0 ? Infinity : (placement.width / 2 + pad) / Math.abs(dx);
    const ky = dy === 0 ? Infinity : (placement.height / 2 + pad) / Math.abs(dy);
    return Math.min(kx, ky);
  };
  const start = cut(from, 2);
  const end = 1 - cut(to, 6);
  if (!(end > start)) {
    return undefined;
  }
  return { x1: from.x + dx * start, y1: from.y + dy * start, x2: from.x + dx * end, y2: from.y + dy * end };
};
