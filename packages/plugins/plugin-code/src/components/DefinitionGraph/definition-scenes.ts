//
// Copyright 2026 DXOS.org
//

import { type Scene as DiagramScene, Dsl, Semantic, SemanticEngine } from '@dxos/diagram';
import { type DiagramSet, type LatticeSpec, boxId, quantize } from '@dxos/react-ui-canvas';

import { type DefinitionEdge, type DefinitionGrouping, type DefinitionModel } from '../SpecModel/index.ts';

export type Point = { x: number; y: number };
export type Size = { width: number; height: number };

/** One card size and cell pitch for every level, shared with the canvas so the engine's boxes are its cards 1:1. */
export const CARD: Size = { width: 272, height: 112 };
export const PITCH: Size = { width: 352, height: 192 };

/**
 * Where a moved card lands: on 32px steps, at least 16px from its neighbours. Every side's midpoint then sits on the
 * router's 8px grid, so an arrow rerouted after a move leaves and meets its cards square. A card spans whole cells
 * (9 by 4) and the engine's pitch whole steps, so the engine's layout lies on the lattice too.
 */
export const LATTICE: LatticeSpec = { width: 16, height: 16, gutterX: 16, gutterY: 16 };

/** The lattice centre nearest a card centred at `center`, so its links take the gutters from the start. */
export const onLattice = (center: Point): Point => {
  const { x, y, width, height } = quantize(
    { x: center.x - CARD.width / 2, y: center.y - CARD.height / 2, ...CARD },
    LATTICE,
  );
  return { x: x + width / 2, y: y + height / 2 };
};

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

/**
 * The level as illustrator DSL: one box per card, a group per frame, one edge per arrow; each card by DSL id, and each
 * arrow's label by the id of the link it compiles to. Labels are the canvas's to place: placing them while routing is
 * most of a level's layout time.
 */
const toDsl = (
  scene: DefinitionScene,
  cells?: ReadonlyMap<string, Point>,
): { source: string; cards: Map<string, SceneNode>; labels: Map<string, string> } => {
  const cards = new Map<string, SceneNode>();
  const dslId = new Map<string, string>();
  scene.nodes.forEach((node, index) => {
    cards.set(`n${index}`, node);
    dslId.set(node.id, `n${index}`);
  });
  const lines = [`diagram flow=down box=${CARD.width}x${CARD.height} grid=${PITCH.width}x${PITCH.height}`];
  const nodeLine = (node: SceneNode) => {
    const id = dslId.get(node.id) ?? node.id;
    const cell = cells?.get(id);
    return `node ${id} ${Dsl.formatString(node.id)}${cell ? ` @cell(${cell.x},${cell.y})` : ''}`;
  };
  const byId = new Map(scene.nodes.map((node) => [node.id, node]));
  const framed = new Set<string>();
  scene.frames.forEach((frame, index) => {
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
  const labels = new Map<string, string>();
  let index = 0;
  for (const edge of scene.edges) {
    const [from, to] = [dslId.get(edge.from), dslId.get(edge.to)];
    if (from && to && from !== to) {
      // Laid out against the flow, the edge runs from its target and is headed at its source.
      const [source, target] = edge.against ? [to, from] : [from, to];
      // The engine names each edge's link by its ends and its place among the edges.
      edge.label && labels.set(`${Semantic.CONNECTORS}/${source}-${target}-${index}`, edge.label);
      index++;
      const stroke = edge.dashed ? ' stroke=dashed' : '';
      lines.push(
        edge.against
          ? `edge ${source} -> ${target}${stroke} head=none tail=arrow`
          : `edge ${source} -> ${target}${stroke}${edge.both ? ' tail=arrow' : ''}`,
      );
    }
  }
  return { source: lines.join('\n'), cards, labels };
};

/** A level laid out by plugin-illustrator's semantic engine: its scene commands, and its cards by DSL id. */
export type CompiledScene = {
  commands: readonly DiagramScene.Command[];
  cards: ReadonlyMap<string, SceneNode>;
  /** Each arrow's label, by the id of its link. */
  labels: ReadonlyMap<string, string>;
};

const solve = (source: string): DiagramScene.Command[] => {
  const reading = Dsl.read(source);
  return Dsl.withLayout(reading, reading.diagram && SemanticEngine.solve(reading.diagram, { restarts: 1 })).commands;
};

/** The cell of each box the commands place, by DSL id, counted from the top-left box. */
const cellsOf = (commands: readonly DiagramScene.Command[]): Map<string, Point> => {
  const centers = new Map<string, Point>();
  for (const command of commands) {
    const box = command.op === 'upsert-object' ? command.object.elements.find(({ id }) => id === 'box') : undefined;
    if (command.op === 'upsert-object' && box && 'w' in box && 'h' in box) {
      const { origin = { x: 0, y: 0 }, scale = 1 } = command.object;
      centers.set(command.object.id, {
        x: origin.x + (box.x + box.w / 2) * scale,
        y: origin.y + (box.y + box.h / 2) * scale,
      });
    }
  }
  const x0 = Math.min(...[...centers.values()].map(({ x }) => x));
  const y0 = Math.min(...[...centers.values()].map(({ y }) => y));
  return new Map(
    [...centers].map(([id, { x, y }]) => [
      id,
      { x: Math.round((x - x0) / PITCH.width), y: Math.round((y - y0) / PITCH.height) },
    ]),
  );
};

/**
 * Lays a level out in two passes, since routing every arrow inside the placement search is what costs: the cards are
 * placed with one arrow per pair of frames (a card outside a frame its own), then pinned to those cells while every
 * arrow is routed.
 */
export const compileScene = (scene: DefinitionScene): CompiledScene => {
  const frameOf = new Map(scene.frames.flatMap(({ id, members }) => members.map((member) => [member, id] as const)));
  const pairs = new Map<string, SceneEdge>();
  for (const edge of scene.edges) {
    const key = `${frameOf.get(edge.from) ?? edge.from}|${frameOf.get(edge.to) ?? edge.to}`;
    pairs.has(key) || pairs.set(key, edge);
  }
  const first = toDsl({ ...scene, edges: [...pairs.values()] });
  const placed = solve(first.source);
  if (pairs.size === scene.edges.length) {
    return { commands: placed, cards: first.cards, labels: first.labels };
  }
  const { source, cards, labels } = toDsl(scene, cellsOf(placed));
  return { commands: solve(source), cards, labels };
};

export const SPEC_LEVEL = 'spec';
const clusterLevel = (cluster: string) => `cluster:${cluster}`;
const blockLevel = (ref: string) => `block:${ref}`;

export type DefinitionLevelsOptions = {
  spec: { name: string; scene: DefinitionScene };
  cluster: (cluster: string) => { name: string; scene: DefinitionScene };
  block: (ref: string) => { name: string; scene: DefinitionScene };
  /** Whether a block's card opens its level. */
  opens: (card: Extract<SceneNode, { kind: 'definition' }>) => boolean;
};

/** A level as named and laid out, by level id; what {@link definitionLevels} has done so far. */
export type CompiledLevels = ReadonlyMap<string, CompiledScene & { name: string }>;

export type DefinitionLevels = {
  set: DiagramSet;
  /** Each card, by its level and the id of the box it compiles to (`<level>#<box>`). */
  cards: ReadonlyMap<string, SceneNode>;
  /** Each arrow's label, by its level and the id of its link (`<level>#<link>`). */
  labels: ReadonlyMap<string, string>;
  /** Every level laid out, those given and those this call laid out. */
  compiled: CompiledLevels;
  /** The blocks whose levels are not laid out yet, which open nothing until they are. */
  pending: readonly string[];
};

export const cardKey = (level: string, box: string) => `${level}#${box}`;

/**
 * Every level as one diagram set: the spec, whose clusters drill into their levels, whose blocks drill into theirs.
 * A block level drills no further, and a block reached from two clusters is laid out once. The spec and cluster
 * levels are laid out here; a block level only by {@link compileBlock}, so the canvas opens before they are done.
 */
export const definitionLevels = (
  { spec, cluster, opens }: DefinitionLevelsOptions,
  given: CompiledLevels = new Map(),
): DefinitionLevels => {
  const compiled = new Map(given);
  const diagrams: Record<string, readonly DiagramScene.Command[]> = {};
  const names: Record<string, string> = {};
  const drills: Record<string, Record<string, string>> = {};
  const cards = new Map<string, SceneNode>();
  const labels = new Map<string, string>();
  const pending = new Set<string>();
  const add = (level: string, { name, scene }: { name: string; scene: DefinitionScene }) => {
    const entry = compiled.get(level) ?? { ...compileScene(scene), name };
    compiled.set(level, entry);
    return use(level, entry);
  };
  const use = (level: string, entry: CompiledScene & { name: string }) => {
    diagrams[level] = entry.commands;
    names[level] = entry.name;
    for (const [id, card] of entry.cards) {
      cards.set(cardKey(level, boxId(id)), card);
    }
    for (const [id, label] of entry.labels) {
      labels.set(cardKey(level, id), label);
    }
    return entry.cards;
  };
  drills[SPEC_LEVEL] = {};
  for (const [id, card] of add(SPEC_LEVEL, spec)) {
    if (card.kind !== 'cluster') {
      continue;
    }
    const level = clusterLevel(card.cluster);
    drills[SPEC_LEVEL][id] = level;
    drills[level] = {};
    for (const [blockId, member] of add(level, cluster(card.cluster))) {
      if (member.kind === 'definition' && opens(member)) {
        const target = blockLevel(member.ref);
        const entry = compiled.get(target);
        if (entry) {
          drills[level][blockId] = target;
          target in diagrams || use(target, entry);
        } else {
          pending.add(member.ref);
        }
      }
    }
  }
  return { set: { root: SPEC_LEVEL, diagrams, names, drills }, cards, labels, compiled, pending: [...pending] };
};

/** Lays out one block's level, for {@link definitionLevels} to drill into. */
export const compileBlock = (
  { block }: Pick<DefinitionLevelsOptions, 'block'>,
  ref: string,
): [string, CompiledScene & { name: string }] => {
  const { name, scene } = block(ref);
  return [blockLevel(ref), { ...compileScene(scene), name }];
};
