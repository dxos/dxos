//
// Copyright 2026 DXOS.org
//

import type * as Schema from 'effect/Schema';

import * as Type from '../../Type.ts';
import { compose } from './compose.ts';
import { invert } from './invert.ts';
import { all } from './registry.ts';
import { type AnyLens } from './types.ts';

//
// The version graph: one node per `typename@version`, one edge per registered lens, plus (where
// `Lens.invert` allows it) its reverse. `Lens.findPath`/`Lens.resolveView` walk it for VIEWING only —
// a migration never takes a discovered path, only an explicitly declared one (DESIGN.md §10.7 q4).
//

/** `typename@version` identity of a declared type, keying the version graph. */
export const versionId = (entity: Type.AnyObj): string => Type.getURI(entity);

const asDeclaredObject = (entity: Type.AnyObj | Schema.Top): Type.AnyObj | undefined => {
  return Type.isType(entity) && Type.isObject(entity) ? entity : undefined;
};

type Edge = { readonly lens: AnyLens; readonly to: string };

/** Every registered lens as a forward edge, plus a reverse edge for each one {@link invert} allows. */
const buildGraph = (): Map<string, Edge[]> => {
  const graph = new Map<string, Edge[]>();
  const addEdge = (from: string, edge: Edge): void => {
    const edges = graph.get(from);
    if (edges) {
      edges.push(edge);
    } else {
      graph.set(from, [edge]);
    }
  };

  for (const lens of all()) {
    const target = asDeclaredObject(lens.target);
    if (!target) {
      // A plain-schema target (e.g. the rich-text tree) has no version, so it is not a graph node.
      continue;
    }
    const from = versionId(lens.source);
    const to = versionId(target);
    addEdge(from, { lens, to });

    const reverse = invert(lens);
    if (reverse) {
      addEdge(to, { lens: reverse, to: from });
    }
  }
  return graph;
};

/** Lexicographic comparison of two equal-length lens-id sequences — the path tie-break. */
const compareSequences = (a: readonly AnyLens[], b: readonly AnyLens[]): number => {
  for (let index = 0; index < a.length && index < b.length; index++) {
    if (a[index].id !== b[index].id) {
      return a[index].id < b[index].id ? -1 : 1;
    }
  }
  return a.length - b.length;
};

/**
 * The shortest sequence of lenses from `from` to `to`, walking the version graph — forward edges plus
 * the reverse of every invertible lens. `undefined` when no path exists; `[]` when `from` and `to` are
 * already the same type.
 *
 * Ties (two paths of equal length) resolve lexicographically by the sequence of lens ids, so every
 * peer resolving the same pair of types walks the same path. A direct lens, once registered, is simply
 * the shortest path of length one and needs no special case here.
 */
export const findPath = (from: Type.AnyObj, to: Type.AnyObj): readonly AnyLens[] | undefined => {
  const start = versionId(from);
  const goal = versionId(to);
  if (start === goal) {
    return [];
  }

  const graph = buildGraph();
  const visited = new Set<string>([start]);
  let frontier = new Map<string, readonly AnyLens[]>([[start, []]]);

  while (frontier.size > 0) {
    const next = new Map<string, readonly AnyLens[]>();
    for (const [node, path] of frontier) {
      for (const edge of graph.get(node) ?? []) {
        if (visited.has(edge.to)) {
          continue;
        }
        const candidate = [...path, edge.lens];
        const existing = next.get(edge.to);
        if (!existing || compareSequences(candidate, existing) < 0) {
          next.set(edge.to, candidate);
        }
      }
    }
    const found = next.get(goal);
    if (found) {
      return found;
    }
    if (next.size === 0) {
      return undefined;
    }
    for (const node of next.keys()) {
      visited.add(node);
    }
    frontier = next;
  }
  return undefined;
};

/** The composed lens for the shortest path from `from` to `to`, or `undefined` when there is none. */
export const resolveView = (from: Type.AnyObj, to: Type.AnyObj): AnyLens | undefined => {
  const path = findPath(from, to);
  if (!path || path.length === 0) {
    return undefined;
  }
  const [first, ...rest] = path;
  return rest.reduce((accumulated, lens) => compose(accumulated, lens), first);
};
