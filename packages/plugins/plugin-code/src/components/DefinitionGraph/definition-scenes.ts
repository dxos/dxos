//
// Copyright 2026 DXOS.org
//

import { Dsl, Semantic, SemanticEngine } from '@dxos/diagram';
import { type Shape } from '@dxos/scene';

import { type DefinitionEdge, type DefinitionGrouping, type DefinitionModel } from '../SpecModel/index.ts';

export type Point = { x: number; y: number };
export type Size = { width: number; height: number };

/** One card size and cell pitch for every level, shared with the canvas so the engine's positions land on cards 1:1. */
export const CARD: Size = { width: 224, height: 72 };
export const PITCH: Size = { width: 288, height: 152 };

/** A card on a level: a cluster, or a block (`ref`) under an id unique on the level. */
export type SceneNode =
  | { id: string; kind: 'cluster'; cluster: string }
  | {
      id: string;
      kind: 'definition';
      ref: string;
      count?: number;
      focused?: boolean;
      outside?: boolean;
    };

/**
 * An arrow; `both` heads it at each end, for two cards that name each other. One laid out `against` the flow is placed
 * as if it ran from `to` to `from`, so its source sits below its target.
 */
export type SceneEdge = {
  id: string;
  from: string;
  to: string;
  label?: string;
  dashed?: boolean;
  both?: boolean;
  against?: boolean;
};

/** A frame drawn round some of a level's cards, at most `maxWidth` cards wide. */
export type SceneFrame = { id: string; label: string; members: string[]; maxWidth?: number };

/** What one level draws, before the engine places it. */
export type DefinitionScene = { nodes: SceneNode[]; edges: SceneEdge[]; frames: SceneFrame[] };

/**
 * The whole spec: a card per cluster, and one arrow for each pair of clusters where one names the other's blocks,
 * labelled with how many, headed at each end that is named.
 */
export const specScene = (grouping: DefinitionGrouping): DefinitionScene => {
  const pairs = new Map<string, SceneEdge & { count: number }>();
  for (const { from, to, count } of grouping.links) {
    const key = [from, to].sort().join('|');
    const pair = pairs.get(key);
    if (pair) {
      pair.count += count;
      pair.both = true;
    } else {
      pairs.set(key, { id: key, from, to, count });
    }
  }
  return {
    nodes: grouping.clusters.map(({ id }) => ({ id, kind: 'cluster', cluster: id })),
    edges: [...pairs.values()].map(({ count, ...edge }) => ({ ...edge, label: `${count}` })),
    frames: [],
  };
};

/**
 * One cluster: a frame per group that names blocks of its own, holding its anchor and those blocks; the cluster's
 * shared blocks outside the frames; and the groups elsewhere that its groups build on or are built on by, marked as
 * outside it.
 */
export const clusterScene = (
  grouping: DefinitionGrouping,
  clusterId: string,
  { buildsOn }: { buildsOn: string },
): DefinitionScene => {
  const cluster = grouping.clusters.find(({ id }) => id === clusterId);
  if (!cluster) {
    return { nodes: [], edges: [], frames: [] };
  }
  const members = new Set(cluster.groups);
  const groups = grouping.groups.filter(({ id }) => members.has(id));
  const shared = new Set(cluster.shared);
  const nodes = new Map<string, SceneNode>();
  const add = (ref: string, extra: Partial<Extract<SceneNode, { kind: 'definition' }>> = {}) =>
    nodes.has(ref) || nodes.set(ref, { id: ref, kind: 'definition', ref, ...extra });
  const edges: SceneEdge[] = [];
  const frames: SceneFrame[] = [];
  for (const group of groups) {
    add(group.id);
    const own = [...group.owned, ...group.context];
    own.forEach((id) => add(id));
    own.length > 0 && frames.push({ id: `frame:${group.id}`, label: group.id, members: [group.id, ...own] });
    for (const id of own) {
      edges.push({ id: `${group.id}->${id}`, from: group.id, to: id });
    }
    for (const id of group.shared.filter((id) => shared.has(id))) {
      add(id, { count: grouping.memberOf.get(id)?.length });
      edges.push({ id: `${group.id}->${id}`, from: group.id, to: id });
    }
  }
  for (const group of grouping.groups) {
    for (const target of group.buildsOn) {
      if (members.has(group.id) || members.has(target)) {
        add(group.id, { outside: !members.has(group.id) });
        add(target, { outside: !members.has(target) });
        edges.push({ id: `${group.id}=>${target}`, from: group.id, to: target, label: buildsOn, dashed: true });
      }
    }
  }
  return { nodes: [...nodes.values()], edges, frames };
};

/** Prefixes keeping a block above the focus apart from the same block below it. */
const ABOVE = 'above:';
const BELOW = 'below:';
const CHECK = 'check:';

/** Cards across a block level's frame before it wraps, so a block named by many reads as a block, not a strip. */
const SIDE_WIDTH = 3;

/**
 * One block and what touches it, each side in a frame: what names it above, and what it names and the checks that
 * name it below. Mentions in prose are dashed; field references are labelled with the field.
 */
export const blockScene = (
  byId: ReadonlyMap<string, DefinitionModel>,
  grouping: DefinitionGrouping,
  edges: readonly DefinitionEdge[],
  focus: string,
  labels: { above: string; below: string; checks: string },
): DefinitionScene => {
  const roleOf = (id: string) => {
    const kind = byId.get(id)?.kind;
    return kind === undefined ? undefined : grouping.roles.get(kind);
  };
  const nodes = new Map<string, SceneNode>([[focus, { id: focus, kind: 'definition', ref: focus, focused: true }]]);
  const sceneEdges = new Map<string, SceneEdge>();
  const sides = { above: new Set<string>(), below: new Set<string>(), checks: new Set<string>() };
  const link = (id: string, from: string, to: string, edge: DefinitionEdge, against = false) => {
    const existing = sceneEdges.get(id);
    const label = edge.field ?? existing?.label;
    const dashed = (existing?.dashed ?? true) && !edge.field;
    sceneEdges.set(id, { id, from, to, ...(label && { label }), dashed, ...(against && { against }) });
  };
  for (const edge of edges) {
    if (edge.from === edge.to || !byId.has(edge.from) || !byId.has(edge.to)) {
      continue;
    }
    if (edge.to === focus) {
      const check = roleOf(edge.from) === 'verification';
      const id = `${check ? CHECK : ABOVE}${edge.from}`;
      sides[check ? 'checks' : 'above'].add(id);
      nodes.set(id, { id, kind: 'definition', ref: edge.from });
      link(`${id}->${focus}`, id, focus, edge, check);
    } else if (edge.from === focus && roleOf(edge.to) !== 'verification') {
      const id = `${BELOW}${edge.to}`;
      sides.below.add(id);
      nodes.set(id, { id, kind: 'definition', ref: edge.to });
      link(`${focus}->${id}`, focus, id, edge);
    }
  }
  return {
    nodes: [...nodes.values()],
    edges: [...sceneEdges.values()],
    frames: (['above', 'below', 'checks'] as const).flatMap((side) =>
      sides[side].size > 0
        ? [{ id: `frame:${side}`, label: labels[side], members: [...sides[side]], maxWidth: SIDE_WIDTH }]
        : [],
    ),
  };
};

/** A frame as the engine drew it, in canvas units, for the canvas's diagram shape to draw. */
export type PlacedFrame = {
  id: string;
  label: string;
  center: Point;
  size: Size;
  element: Shape.Box;
  heading?: { id: string; x: number; y: number; w?: number; color?: Shape.Color; weight?: Shape.Weight };
};

export type PlacedScene = {
  positions: Record<string, Point>;
  frames: PlacedFrame[];
  /** Each arrow's route as the engine drew it, by edge id, from the source's outline to the target's. */
  routes: Record<string, Point[]>;
};

/** How far a frame is drawn inside the cells it spans, so neighbouring frames keep a gutter between them. */
const FRAME_INSET = 12;

/** The level as illustrator DSL: one box per card, a group per frame, one edge per arrow. */
const toDsl = (
  scene: DefinitionScene,
): { source: string; ids: Map<string, string>; frames: Map<string, string>; edges: string[] } => {
  const ids = new Map<string, string>();
  const dslId = new Map<string, string>();
  scene.nodes.forEach(({ id }, index) => {
    ids.set(`n${index}`, id);
    dslId.set(id, `n${index}`);
  });
  const lines = [`diagram flow=down box=${CARD.width}x${CARD.height} grid=${PITCH.width}x${PITCH.height}`];
  const nodeLine = (node: SceneNode) => `node ${dslId.get(node.id)} ${Dsl.formatString(node.id)}`;
  const byId = new Map(scene.nodes.map((node) => [node.id, node]));
  const framed = new Set<string>();
  const frames = new Map<string, string>();
  scene.frames.forEach((frame, index) => {
    frames.set(`g${index}`, frame.id);
    lines.push(
      `group g${index} ${Dsl.formatString(frame.label)}${frame.maxWidth ? ` max-width=${frame.maxWidth}` : ''} {`,
    );
    for (const member of frame.members) {
      const node = byId.get(member);
      if (node && !framed.has(member)) {
        framed.add(member);
        lines.push(`  ${nodeLine(node)}`);
      }
    }
    lines.push('}');
  });
  for (const node of scene.nodes) {
    framed.has(node.id) || lines.push(nodeLine(node));
  }
  // The engine names each edge's route by its place among the edges.
  const edges: string[] = [];
  for (const edge of scene.edges) {
    const [from, to] = [dslId.get(edge.from), dslId.get(edge.to)];
    if (from && to && from !== to) {
      edges.push(edge.id);
      lines.push(edge.against ? `edge ${to} -> ${from}` : `edge ${from} -> ${to}`);
    }
  }
  return { source: lines.join('\n'), ids, frames, edges };
};

/**
 * Places a level with plugin-illustrator's semantic engine: card centres by id, and each frame's box and title. One
 * search restart, so a level lays out quickly enough to open on a double-click.
 */
export const placeScene = (scene: DefinitionScene): PlacedScene => {
  if (scene.nodes.length === 0) {
    return { positions: {}, frames: [], routes: {} };
  }
  const { source, ids, frames: frameIds, edges } = toDsl(scene);
  const reading = Dsl.read(source);
  const solution = reading.diagram && SemanticEngine.solve(reading.diagram, { restarts: 1 });
  const { commands } = Dsl.withLayout(reading, solution);
  const labels = new Map(scene.frames.map(({ id, label }) => [id, label]));
  const against = new Set(scene.edges.filter((edge) => edge.against).map(({ id }) => id));
  const positions: Record<string, Point> = {};
  const frames: PlacedFrame[] = [];
  const routes: Record<string, Point[]> = {};
  for (const command of commands) {
    if (command.op !== 'upsert-object') {
      continue;
    }
    const { object } = command;
    const scale = object.scale ?? 1;
    const origin = object.origin ?? { x: 0, y: 0 };
    const at = (x: number, y: number): Point => ({ x: origin.x + x * scale, y: origin.y + y * scale });
    const node = ids.get(object.id);
    const frame = frameIds.get(object.id);
    if (object.id === Semantic.CONNECTORS) {
      // An arrow `<from>-<to>-<index>` runs from the end of its `-path` line, when it bends, to its target.
      for (const arrow of object.elements) {
        const edge = arrow.kind === 'arrow' ? edges[Number(arrow.id.split('-').at(-1))] : undefined;
        if (arrow.kind !== 'arrow' || edge === undefined) {
          continue;
        }
        const path = object.elements.find((element) => element.id === `${arrow.id}-path`);
        const points = path?.kind === 'line' ? [...path.points, arrow.end] : [arrow.start, arrow.end];
        const route = points.flatMap((point) => (point ? [at(point.x, point.y)] : []));
        // A route laid out against the flow runs from the edge's target; the canvas wants it from its source.
        routes[edge] = against.has(edge) ? route.reverse() : route;
      }
    } else if (node) {
      const box = object.elements.find((element) => 'w' in element && 'h' in element);
      if (box && 'w' in box) {
        positions[node] = at(box.x + box.w / 2, box.y + box.h / 2);
      }
    } else if (frame) {
      const cell = object.elements.find((element): element is Shape.Box => element.kind === 'rect');
      if (!cell) {
        continue;
      }
      const box = {
        ...cell,
        x: cell.x + FRAME_INSET,
        y: cell.y + FRAME_INSET,
        w: cell.w - 2 * FRAME_INSET,
        h: cell.h - 2 * FRAME_INSET,
      };
      const title = object.elements.find((element): element is Shape.Text => element.kind === 'text');
      frames.push({
        id: frame,
        label: title?.text ?? labels.get(frame) ?? frame,
        center: at(box.x + box.w / 2, box.y + box.h / 2),
        size: { width: box.w * scale, height: box.h * scale },
        element: box,
        ...(title && {
          heading: {
            id: title.id,
            x: (title.x - box.x) * scale,
            y: (title.y - box.y) * scale,
            ...(title.w !== undefined && { w: title.w * scale }),
            ...(title.color && { color: title.color }),
            ...(title.weight && { weight: title.weight }),
          },
        }),
      });
    }
  }
  return { positions, frames, routes };
};
