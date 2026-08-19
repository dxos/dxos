//
// Copyright 2026 DXOS.org
//

//
// Rule-based pluggable layout: prioritized rules claim disjoint node GROUPS and lay each out in
// group-local coordinates; groups then pack as super-nodes (ranked by their cross-group edges)
// with non-overlapping borders, and the shared router connects nodes across them. Rules capture
// domain shape the generic engines cannot: an inheritance tree reads as a tree, a call chain as
// a column. See `docs/DESIGN.md`.
//

import * as Layout from './layout';
import type * as Scene from './scene';
import { type UmlModel, parse, relationRanks } from './uml';
import { type Cell, GRID, type CompileOptions as GridCompileOptions, type Rect, emit, measureCell } from './uml-grid';

const GAP = GRID * 2;
const GROUP_GAP = GRID * 3;
const FRAME_PAD = GRID;

const snap = (value: number) => Math.round(value / GRID) * GRID;

/** A laid-out group: member rects in group-local coordinates plus the packed bounds. */
export type Group = {
  id: string;
  /** Rule that claimed the group (frame label; singletons carry none). */
  rule?: string;
  rects: Map<string, Rect>;
  w: number;
  h: number;
};

/**
 * A layout rule: claims disjoint groups from the still-unclaimed nodes and lays each out
 * internally. Rules run in priority order; unclaimed nodes fall through to singleton groups.
 */
export type GroupRule = {
  id: string;
  apply: (model: UmlModel, unclaimed: Set<string>, cell: Cell) => Group[];
};

/** Relations oriented so the target should sit ABOVE the source (arrows read upward). */
const upEdges = (model: UmlModel): { from: string; to: string }[] =>
  model.relations.map((relation) =>
    relation.kind === 'inheritance' || relation.kind === 'realization' || relation.kind === 'dependency'
      ? { from: relation.from, to: relation.to }
      : { from: relation.to, to: relation.from },
  );

/**
 * Inheritance trees: each supertype with claimable subtypes forms a group — the hierarchy stacks
 * vertically (root on top, arrows up) and peers share a horizontal axis, packed as a tidy tree
 * (each parent centered over its subtree).
 */
export const inheritanceTreeRule: GroupRule = {
  id: 'inheritance',
  apply: (model, unclaimed, cell) => {
    const children = new Map<string, string[]>();
    const hasParent = new Set<string>();
    for (const relation of model.relations) {
      if (
        (relation.kind === 'inheritance' || relation.kind === 'realization') &&
        unclaimed.has(relation.from) &&
        unclaimed.has(relation.to)
      ) {
        // relation: subtype → supertype.
        children.set(relation.to, [...(children.get(relation.to) ?? []), relation.from]);
        hasParent.add(relation.from);
      }
    }

    const groups: Group[] = [];
    for (const [root] of children) {
      if (hasParent.has(root)) {
        continue;
      }
      const rects = new Map<string, Rect>();
      // Cyclic or diamond hierarchies (LLM/user input) must not recurse forever; each node
      // renders once, on first visit.
      const claimable = (id: string) => unclaimed.has(id) && !rects.has(id);
      const widths = new Map<string, number>();
      // Tidy-tree: a subtree is as wide as its children row (or one cell); parent centers over it.
      const layoutSubtree = (id: string, x: number, depth: number): number => {
        rects.set(id, { x: 0, y: 0, w: cell.w, h: cell.h });
        const kids = (children.get(id) ?? []).filter(claimable);
        const kidWidths = kids.map((kid) => subtreeWidth(kid));
        const rowWidth = kidWidths.reduce((sum, w) => sum + w, 0) + Math.max(0, kids.length - 1) * GAP;
        const width = Math.max(cell.w, rowWidth);
        let childX = x + (width - rowWidth) / 2;
        for (const [index, kid] of kids.entries()) {
          layoutSubtree(kid, childX, depth + 1);
          childX += kidWidths[index] + GAP;
        }
        rects.set(id, { x: x + (width - cell.w) / 2, y: depth * (cell.h + GAP), w: cell.w, h: cell.h });
        return width;
      };
      const subtreeWidth = (id: string, seen: Set<string> = new Set()): number => {
        const cached = widths.get(id);
        if (cached !== undefined) {
          return cached;
        }
        if (seen.has(id)) {
          return cell.w;
        }
        seen.add(id);
        const kids = (children.get(id) ?? []).filter((kid) => unclaimed.has(kid) && !rects.has(kid) && !seen.has(kid));
        const width =
          kids.length === 0
            ? cell.w
            : Math.max(cell.w, kids.reduce((sum, kid) => sum + subtreeWidth(kid, seen), 0) + (kids.length - 1) * GAP);
        widths.set(id, width);
        return width;
      };
      const width = layoutSubtree(root, 0, 0);
      const depth = Math.max(...[...rects.values()].map((rect) => rect.y)) + cell.h;
      if (rects.size < 2) {
        continue;
      }
      for (const id of rects.keys()) {
        unclaimed.delete(id);
      }
      groups.push({ id: `tree:${root}`, rule: 'inheritance', rects, w: width, h: depth });
    }
    return groups;
  },
};

/**
 * Longest linear chain: the longest path through the still-unclaimed up-oriented relation graph
 * renders left to right (each target directly right of its source).
 */
export const linearChainRule: GroupRule = {
  id: 'chain',
  apply: (model, unclaimed, cell) => {
    const edges = upEdges(model).filter((edge) => unclaimed.has(edge.from) && unclaimed.has(edge.to));
    const back = Layout.backEdges([...unclaimed], edges);
    const forward = edges.filter((edge) => !back.has(edge));
    const next = new Map<string, string[]>();
    for (const edge of forward) {
      next.set(edge.from, [...(next.get(edge.from) ?? []), edge.to]);
    }

    // Longest path by DFS memo (the forward graph is acyclic after back-edge removal).
    const memo = new Map<string, string[]>();
    const longestFrom = (id: string): string[] => {
      const cached = memo.get(id);
      if (cached) {
        return cached;
      }
      let best: string[] = [];
      for (const target of next.get(id) ?? []) {
        const path = longestFrom(target);
        if (path.length > best.length) {
          best = path;
        }
      }
      const result = [id, ...best];
      memo.set(id, result);
      return result;
    };

    let chain: string[] = [];
    for (const id of unclaimed) {
      const path = longestFrom(id);
      if (path.length > chain.length) {
        chain = path;
      }
    }
    if (chain.length < 3) {
      return [];
    }

    const rects = new Map<string, Rect>();
    // Chain runs source → target, reading left to right.
    chain.forEach((id, index) => {
      rects.set(id, { x: index * (cell.w + GAP), y: 0, w: cell.w, h: cell.h });
      unclaimed.delete(id);
    });
    return [
      { id: `chain:${chain[0]}`, rule: 'chain', rects, w: chain.length * cell.w + (chain.length - 1) * GAP, h: cell.h },
    ];
  },
};

export type CompileOptions = Omit<GridCompileOptions, 'route'> & {
  /** Grouping rules, highest priority first. */
  rules?: GroupRule[];
};

/** Run the rules over the model; leftovers become singleton groups. */
export const buildGroups = (model: UmlModel, cell: Cell, rules: GroupRule[]): Group[] => {
  const unclaimed = new Set(model.classes.map((entry) => entry.id));
  const groups: Group[] = [];
  for (const rule of rules) {
    groups.push(...rule.apply(model, unclaimed, cell));
  }
  for (const id of unclaimed) {
    groups.push({
      id: `node:${id}`,
      rects: new Map([[id, { x: 0, y: 0, w: cell.w, h: cell.h }]]),
      w: cell.w,
      h: cell.h,
    });
  }
  return groups;
};

/**
 * Pack groups as super-nodes: rank by up-oriented cross-group edges (target group above), then
 * lay ranks out as rows, bottom rank last — mirroring the node-level convention.
 */
export const packGroups = (model: UmlModel, groups: Group[]): Map<string, Scene.Point> => {
  const groupOf = new Map<string, Group>();
  for (const group of groups) {
    for (const id of group.rects.keys()) {
      groupOf.set(id, group);
    }
  }
  const crossEdges = upEdges(model)
    .map((edge) => ({ from: groupOf.get(edge.from)!.id, to: groupOf.get(edge.to)!.id }))
    .filter((edge) => edge.from !== edge.to);
  const groupRanks = Layout.rank(
    groups.map((group) => group.id),
    // Rank grows downward from sources; cross edges point up, so invert.
    crossEdges.map((edge) => ({ from: edge.to, to: edge.from })),
  );

  const lanes = new Map<number, Group[]>();
  for (const group of groups) {
    const rank = groupRanks.get(group.id) ?? 0;
    lanes.set(rank, [...(lanes.get(rank) ?? []), group]);
  }
  const origins = new Map<string, Scene.Point>();
  let y = 0;
  for (const rank of [...lanes.keys()].sort((left, right) => left - right)) {
    const members = lanes.get(rank)!;
    let x = 0;
    for (const group of members) {
      origins.set(group.id, { x: snap(x), y: snap(y) });
      x += group.w + GROUP_GAP;
    }
    y += Math.max(...members.map((group) => group.h)) + GROUP_GAP;
  }
  return origins;
};

/** Absolute node rects for a (possibly partial) group placement. */
export const resolveRects = (groups: Group[], origins: Map<string, Scene.Point>): Map<string, Rect> => {
  const rects = new Map<string, Rect>();
  for (const group of groups) {
    const at = origins.get(group.id);
    if (!at) {
      continue;
    }
    for (const [id, rect] of group.rects) {
      rects.set(id, { ...rect, x: at.x + rect.x, y: at.y + rect.y });
    }
  }
  return rects;
};

/** Dashed frames behind multi-node groups. */
export const frameCommands = (
  groups: Group[],
  origins: Map<string, Scene.Point>,
  { origin = { x: 0, y: 0 }, scale = 1 }: { origin?: Scene.Point; scale?: number } = {},
): Scene.Command[] =>
  groups
    .filter((group) => group.rects.size > 1 && origins.has(group.id))
    .map((group) => {
      const at = origins.get(group.id)!;
      return {
        op: 'upsert-object',
        object: {
          id: `group:${group.id}`,
          origin: { x: origin.x + (at.x - FRAME_PAD) * scale, y: origin.y + (at.y - FRAME_PAD) * scale },
          scale,
          elements: [
            {
              kind: 'rect',
              id: 'frame',
              x: 0,
              y: 0,
              w: group.w + FRAME_PAD * 2,
              h: group.h + FRAME_PAD * 2,
              stroke: 'dashed',
              color: 'grey',
            },
          ],
        },
      };
    });

/**
 * Compile with rule-based grouping: rules claim groups, leftovers become singletons, groups pack
 * as super-nodes ranked by their cross-group edges (lanes advance vertically; no borders overlap
 * by construction), and multi-node groups render a dashed frame behind their members.
 */
export const compile = (source: string, options: CompileOptions = {}): Scene.Command[] => {
  const { origin = { x: 0, y: 0 }, scale = 1, maxWidth = GRID * 6 } = options;
  const rules = options.rules ?? [inheritanceTreeRule, linearChainRule];
  const model = parse(source);
  const cell = measureCell(model, { maxWidth, cell: options.cell, titleHeight: options.titleHeight });
  const groups = buildGroups(model, cell, rules);
  const origins = packGroups(model, groups);
  const rects = resolveRects(groups, origins);
  return [
    ...frameCommands(groups, origins, { origin, scale }),
    ...emit({ model, cell, rects, ranks: relationRanks(model) }, { origin, scale }),
  ];
};
