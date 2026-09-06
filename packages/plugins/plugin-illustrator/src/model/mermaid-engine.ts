//
// Copyright 2026 DXOS.org
//

//
// Engine-backed mermaid flowchart dialect. ELK lays out the graph as a compound graph (subgraphs
// are hierarchical nodes), node origins are quantized to a lattice of the cell size so neighbours
// align exactly, and connectors take the shared obstacle-avoiding router with straightened ports.
// Placement and emission are candidate generators — lattice × sibling order × inheritance bus —
// and the `Objective` picks the layout. Parsing stays in `mermaid.ts`; see `docs/DESIGN.md`.
//

import ELK, { type ElkNode } from 'elkjs/lib/elk.bundled.js';

import { invariant } from '@dxos/invariant';

import * as Diagnostics from './diagnostics';
import * as Layout from './layout';
import { type Direction, type MermaidEdge, type MermaidGraph, markers, parse } from './mermaid';
import * as Objective from './objective';
import { makeAvoidingRouter } from './ortho-router';
import type * as Scene from './scene';
import { GRID, type Rect, type Router, zRouter } from './uml-grid';

const MIN_W = GRID * 3;
const MAX_W = GRID * 6;
const MIN_H = GRID * 2;
const PAD_X = GRID;
const PAD_Y = GRID / 2;
/** Frame inset around a subgraph's members; the top also holds the frame label. */
const FRAME_PAD = GRID;
const FRAME_LABEL_H = GRID;
/** Clear space between two frames, so packages read as separate even when their nodes are adjacent. */
const FRAME_GAP = GRID;
const GRID_FINE = GRID / 2;

const FONT = Layout.FONT_METRICS.m;
const LABEL_FONT = Layout.FONT_METRICS.s;

const ELK_DIRECTION: Record<Direction, string> = { TB: 'DOWN', BT: 'UP', LR: 'RIGHT', RL: 'LEFT' };

const snapUp = (value: number) => Math.ceil(value / GRID) * GRID;
const fineSnap = (value: number) => Math.round(value / GRID_FINE) * GRID_FINE;

/** How ELK orders siblings within a layer. */
export type Order = 'model' | 'free';

/**
 * How groups relate: `layered` lays the whole hierarchy out in one flow (groups stack along it);
 * `columns` lays each group out in the flow direction and arranges the groups side by side
 * across it, so cross-package edges run sideways instead of stacking packages.
 */
export type Arrangement = 'layered' | 'columns';

/**
 * How a plain reference ranks its ends. Inheritance always ranks the base above, has-many and
 * containment the owner above; a reference has no such convention, so it is a candidate axis:
 * `down` — the referenced sits below, ELK's reading of an arrow; `up` — the referenced sits above,
 * as the abstraction does, so a node many others point at heads its package; `free` — a reference
 * ranks nothing and its ends may share a row. Between packages a reference always orders the packages.
 */
export type Layering = 'down' | 'up' | 'free';

/**
 * How packages sit along the flow in `columns`: `none` keeps ELK's placement; `edges` shifts each
 * package by whole rows to where its cross-package edges meet their partners' rows, so those edges
 * run straight instead of jogging between a short package and a tall one.
 */
export type Alignment = 'none' | 'edges';

const LATTICES: readonly number[] = [1.5, 2];
const ORDERS: readonly Order[] = ['model', 'free'];
const ARRANGEMENTS: readonly Arrangement[] = ['layered', 'columns'];
const LAYERINGS: readonly Layering[] = ['down', 'up', 'free'];
const ALIGNMENTS: readonly Alignment[] = ['none', 'edges'];

/** The direction perpendicular to the flow, for arranging groups across it. */
const ACROSS: Record<Direction, string> = { TB: 'RIGHT', BT: 'RIGHT', LR: 'DOWN', RL: 'DOWN' };

export type CompileOptions = {
  /** Canvas position of the diagram's top-left, in canvas px. */
  origin?: Scene.Point;
  /** Canvas px per scene unit. */
  scale?: number;
  /**
   * Pitch of the placement lattice as a multiple of the cell size. Node origins snap to lattice
   * points, so nodes that ELK placed roughly in line share an axis exactly and their connectors
   * run straight; the gutter between neighbours is `(lattice − 1) × cell`. A list names the
   * candidates the objective chooses among (default `[1.5, 2]`); a number fixes it.
   */
  lattice?: number | readonly number[];
  /** ELK sibling ordering candidates (default both): declaration order, or free to minimize crossings. */
  order?: readonly Order[];
  /** Group arrangement candidates (default both when the graph has two or more groups). */
  arrangement?: readonly Arrangement[];
  /** How references rank their ends (default all three candidates). */
  layering?: readonly Layering[];
  /** Package alignment candidates along the flow, in `columns` (default both). */
  alignment?: readonly Alignment[];
  /**
   * Inheritance bus candidates (default both): with `true`, subtypes on one row that share a base
   * connect through one horizontal bus and a single triangle-headed trunk instead of parallel arrows.
   */
  bus?: readonly boolean[];
  /** Objective that picks among candidates (default `Objective.DEFAULT`). */
  objective?: Objective.Objective;
  /** Maximum cell width, in scene units (default GRID × 6); longer labels wrap. */
  maxWidth?: number;
  /** Connector router (default: obstacle-avoiding A* with the Z-router as fallback). */
  route?: Router;
};

/** One generated layout with the objective's verdict on it. */
export type Candidate = {
  lattice: number;
  order: Order;
  arrangement: Arrangement;
  layering: Layering;
  alignment: Alignment;
  bus: boolean;
  commands: Scene.Command[];
  layout: Objective.Layout;
};

export type Result = {
  commands: Scene.Command[];
  chosen: Objective.Ranked<Candidate>;
  /** Every candidate, best first. */
  ranked: readonly Objective.Ranked<Candidate>[];
};

type Cell = { w: number; h: number };
type Pitch = { x: number; y: number };

/** One cell size for every node, sized to the longest label wrapped at `maxWidth`. */
const measureCell = (graph: MermaidGraph, maxWidth: number): Cell => {
  const longest = Math.max(0, ...graph.nodes.map((node) => node.label.length));
  const w = snapUp(Math.min(maxWidth, Math.max(MIN_W, longest * FONT.charW + PAD_X * 2)));
  const perLine = Math.max(1, Math.floor((w - PAD_X) / FONT.charW));
  const lines = Math.max(1, ...graph.nodes.map((node) => Math.ceil(node.label.length / perLine)));
  const h = snapUp(Math.max(MIN_H, (lines - 1) * FONT.lineH + FONT.lineH / 1.35 + PAD_Y * 2));
  return { w, h };
};

/**
 * Lattice pitch for a cell. With groups, the gutter between lattice rows must also hold two frame
 * borders, a label band, and clear space between the frames, or adjacent frames touch or overlap
 * after quantization — so that clearance is a floor on the pitch.
 */
const pitchFor = (graph: MermaidGraph, cell: Cell, lattice: number): Pitch => {
  const framed = graph.groups.some((group) => group.children.length > 0);
  return {
    x: snapUp(Math.max(cell.w * lattice, framed ? cell.w + FRAME_PAD * 2 + FRAME_GAP : 0)),
    y: snapUp(Math.max(cell.h * lattice, framed ? cell.h + FRAME_PAD * 2 + FRAME_LABEL_H + FRAME_GAP : 0)),
  };
};

type Placement = {
  nodes: Map<string, Rect>;
  frames: Map<string, Rect>;
};

/**
 * Quantize ELK's positions to the lattice. Each node takes the nearest lattice point; when two
 * nodes claim the same point, the later one slides along the cross axis to the nearest free slot,
 * so quantization can never stack nodes.
 */
const quantize = (positions: Map<string, Scene.Point>, pitch: Pitch, horizontal: boolean): Map<string, Scene.Point> => {
  const taken = new Set<string>();
  const result = new Map<string, Scene.Point>();
  // Place in reading order so a slide pushes the later node, not an earlier one.
  const ordered = [...positions.entries()].sort(([, a], [, b]) =>
    horizontal ? a.x - b.x || a.y - b.y : a.y - b.y || a.x - b.x,
  );
  for (const [id, point] of ordered) {
    const col = Math.round(point.x / pitch.x);
    const row = Math.round(point.y / pitch.y);
    for (let step = 0; ; step++) {
      // Alternate sides so the node stays as close as possible to where ELK wanted it.
      const offset = step === 0 ? 0 : (step % 2 ? 1 : -1) * Math.ceil(step / 2);
      const cell = horizontal ? { col, row: row + offset } : { col: col + offset, row };
      const key = `${cell.col}:${cell.row}`;
      if (!taken.has(key)) {
        taken.add(key);
        result.set(id, { x: cell.col * pitch.x, y: cell.row * pitch.y });
        break;
      }
    }
  }
  return result;
};

/**
 * Close surplus gutters between groups along the cross axis. ELK spaces compound nodes by their
 * own padded extents, so after quantization two groups can sit a whole lattice pitch further apart
 * than the frame clearance needs while another pair sits at the minimum — the uneven gaps a reader
 * notices first. Groups are walked in cross-axis order and each, with everything beyond it, is
 * pulled back by whole pitches while its gap to the previous group stays above the clearance, so
 * every node remains on the lattice and cross-group connectors stay straight.
 */
const compactGroups = (
  graph: MermaidGraph,
  positions: Map<string, Scene.Point>,
  cell: Cell,
  pitch: Pitch,
  horizontal: boolean,
): Map<string, Scene.Point> => {
  const axis = horizontal ? 'y' : 'x';
  const step = horizontal ? pitch.y : pitch.x;
  const size = horizontal ? cell.h : cell.w;
  const groups = graph.groups
    .filter((group) => group.children.some((id) => positions.has(id)))
    .map((group) => {
      const coords = group.children.flatMap((id) => (positions.has(id) ? [positions.get(id)![axis]] : []));
      return { ids: group.children, start: Math.min(...coords), end: Math.max(...coords) };
    })
    .sort((left, right) => left.start - right.start);

  const result = new Map(positions);
  for (let index = 1; index < groups.length; index++) {
    const previous = groups[index - 1];
    const current = groups[index];
    // Gap between the two frames: last member's far edge plus pad, to first member's near edge less pad.
    const gap = current.start - FRAME_PAD - (previous.end + size + FRAME_PAD);
    let surplus = Math.floor((gap - FRAME_GAP) / step) * step;
    if (surplus <= 0) {
      continue;
    }
    // Everything at or beyond this group's start shifts together, so relative order is preserved —
    // but only onto free lattice points: an ungrouped node moving with the block must not land on
    // a node that stays put.
    const moving = [...result].filter(([, point]) => point[axis] >= current.start);
    const staying = new Set(
      [...result].filter(([, point]) => point[axis] < current.start).map(([, point]) => `${point.x}:${point.y}`),
    );
    const collides = (shift: number) =>
      moving.some(([, point]) =>
        staying.has(`${axis === 'x' ? point.x - shift : point.x}:${axis === 'y' ? point.y - shift : point.y}`),
      );
    while (surplus > 0 && collides(surplus)) {
      surplus -= step;
    }
    if (surplus <= 0) {
      continue;
    }
    for (const [id, point] of moving) {
      result.set(id, { ...point, [axis]: point[axis] - surplus });
    }
    for (const later of groups.slice(index)) {
      later.start -= surplus;
      later.end -= surplus;
    }
  }
  return result;
};

type ElkEdge = { id: string; sources: string[]; targets: string[] };

/**
 * Edges for ELK's layering. Inheritance points at the abstraction, which ranks ABOVE its
 * subtypes — so those edges are reversed, as `relationRanks` does for class diagrams; has-many
 * and containment already flow owner-above-owned. In `columns`, the root lays out groups without
 * seeing inside them (`SEPARATE_CHILDREN`), so every edge is lifted to its endpoints' root-level
 * representatives — the group, or the node itself when ungrouped — and the groups fall into
 * dependency order; edges within one group stay where they are for that group's own layout.
 * A reference between packages always orders the packages; within one it ranks per `layering`.
 */
const layeringEdges = (graph: MermaidGraph, arrangement: Arrangement, layering: Layering): ElkEdge[] => {
  const groupOf = new Map(graph.groups.flatMap((group) => group.children.map((id) => [id, group.id] as const)));
  const betweenGroups = (edge: MermaidEdge) =>
    groupOf.has(edge.from) && groupOf.has(edge.to) && groupOf.get(edge.from) !== groupOf.get(edge.to);
  const oriented = graph.edges.flatMap((edge) => {
    if (edge.kind === 'inheritance') {
      return [{ from: edge.to, to: edge.from }];
    }
    if (edge.kind !== 'reference' || layering === 'down' || betweenGroups(edge)) {
      return [{ from: edge.from, to: edge.to }];
    }
    return layering === 'up' ? [{ from: edge.to, to: edge.from }] : [];
  });
  if (arrangement === 'layered') {
    return oriented.map((edge, index) => ({ id: `edge-${index}`, sources: [edge.from], targets: [edge.to] }));
  }
  const edges: ElkEdge[] = [];
  const seen = new Set<string>();
  oriented.forEach((edge, index) => {
    const from = groupOf.get(edge.from);
    const to = groupOf.get(edge.to);
    if (from !== undefined && from === to) {
      edges.push({ id: `edge-${index}`, sources: [edge.from], targets: [edge.to] });
      return;
    }
    const lifted = { from: from ?? edge.from, to: to ?? edge.to };
    const key = `${lifted.from}->${lifted.to}`;
    if (lifted.from !== lifted.to && !seen.has(key)) {
      seen.add(key);
      edges.push({ id: `group-edge-${index}`, sources: [lifted.from], targets: [lifted.to] });
    }
  });
  return edges;
};

/**
 * ELK compound layout. Groups become hierarchical nodes whose children ELK lays out inside
 * them; positions come back parent-relative and are flattened here. Node origins are then
 * quantized to the lattice and frames recomputed from their quantized members, so quantization
 * can never break containment.
 */
const place = async (
  graph: MermaidGraph,
  cell: Cell,
  pitch: Pitch,
  order: Order,
  arrangement: Arrangement,
  layering: Layering,
): Promise<Map<string, Scene.Point>> => {
  const horizontal = graph.direction === 'LR' || graph.direction === 'RL';
  const grouped = new Set(graph.groups.flatMap((group) => group.children));
  const leaf = (id: string): ElkNode => ({ id, width: cell.w, height: cell.h });
  // Spacing is per compound node, not inherited: left unset, ELK packs a group's members at its
  // 20px default — inside the router's clearance — and every route through that group is fenced.
  // Matching the lattice gutters keeps ELK's output close to lattice points before quantization.
  const spacing = {
    'elk.layered.spacing.nodeNodeBetweenLayers': String(horizontal ? pitch.x - cell.w : pitch.y - cell.h),
    'elk.spacing.nodeNode': String(horizontal ? pitch.y - cell.h : pitch.x - cell.w),
  };
  const flow = {
    'elk.algorithm': 'layered',
    'elk.direction': ELK_DIRECTION[graph.direction],
    'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
    'elk.layered.considerModelOrder.strategy': order === 'model' ? 'PREFER_NODES' : 'NONE',
  };
  const children: ElkNode[] = [
    ...graph.nodes.filter((node) => !grouped.has(node.id)).map((node) => leaf(node.id)),
    ...graph.groups
      .filter((group) => group.children.length > 0)
      .map((group) => ({
        id: group.id,
        layoutOptions: {
          ...spacing,
          // Columns: each group is its own flow; the root only arranges the groups.
          ...(arrangement === 'columns' ? flow : {}),
          'elk.padding': `[top=${FRAME_PAD + FRAME_LABEL_H},left=${FRAME_PAD},bottom=${FRAME_PAD},right=${FRAME_PAD}]`,
        },
        children: group.children.map(leaf),
      })),
  ];

  const elk = new ELK();
  const result = await elk.layout({
    id: 'root',
    layoutOptions:
      arrangement === 'columns'
        ? {
            // Groups side by side across the flow, each laid out internally first.
            ...flow,
            'elk.direction': ACROSS[graph.direction],
            'elk.hierarchyHandling': 'SEPARATE_CHILDREN',
            ...spacing,
          }
        : {
            ...flow,
            // Lay out the whole hierarchy in one pass so edges crossing group borders still order layers.
            'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
            ...spacing,
          },
    children,
    edges: layeringEdges(graph, arrangement, layering),
  });

  const raw = new Map<string, Scene.Point>();
  const visit = (node: ElkNode, offset: Scene.Point) => {
    for (const child of node.children ?? []) {
      const x = offset.x + (child.x ?? 0);
      const y = offset.y + (child.y ?? 0);
      if (child.children?.length) {
        visit(child, { x, y });
      } else {
        raw.set(child.id, { x, y });
      }
    }
  };
  visit(result, { x: 0, y: 0 });

  return compactGroups(graph, quantize(raw, pitch, horizontal), cell, pitch, horizontal);
};

/**
 * Align each package to its cross-package edges: among the whole-row shifts that put one of its
 * members on the row of that member's partner, take the one leaving its edges the least total row
 * offset (nearest to no shift on a tie), onto free lattice points only. Two sweeps, since a partner
 * may itself move in the first.
 */
const alignGroups = (
  graph: MermaidGraph,
  positions: Map<string, Scene.Point>,
  direction: Direction,
  alignment: Alignment,
): Map<string, Scene.Point> => {
  if (alignment === 'none') {
    return positions;
  }
  const axis = direction === 'LR' || direction === 'RL' ? 'x' : 'y';
  const groupOf = new Map(graph.groups.flatMap((group) => group.children.map((id) => [id, group.id] as const)));
  const result = new Map(positions);
  for (let sweep = 0; sweep < 2; sweep++) {
    for (const group of graph.groups) {
      const members = new Set(group.children.filter((id) => result.has(id)));
      // Each cross-package edge, as the member's coordinate and the partner's along the flow.
      const pairs = graph.edges.flatMap((edge) => {
        const [member, partner] = members.has(edge.from) ? [edge.from, edge.to] : [edge.to, edge.from];
        const here = result.get(member);
        const there = result.get(partner);
        return members.has(member) && !members.has(partner) && groupOf.has(partner) && here && there
          ? [{ here: here[axis], there: there[axis] }]
          : [];
      });
      if (pairs.length === 0) {
        continue;
      }
      const offset = (shift: number) => pairs.reduce((sum, pair) => sum + Math.abs(pair.here + shift - pair.there), 0);
      const shifts = [...new Set([0, ...pairs.map((pair) => pair.there - pair.here)])].sort(
        (left, right) => offset(left) - offset(right) || Math.abs(left) - Math.abs(right),
      );
      const others = new Set(
        [...result].filter(([id]) => !members.has(id)).map(([, point]) => `${point.x}:${point.y}`),
      );
      const shift = shifts.find(
        (candidate) =>
          ![...members].some((id) => {
            const point = result.get(id);
            return (
              point &&
              others.has(
                `${axis === 'x' ? point.x + candidate : point.x}:${axis === 'y' ? point.y + candidate : point.y}`,
              )
            );
          }),
      );
      if (!shift) {
        continue;
      }
      for (const id of members) {
        const point = result.get(id);
        if (point) {
          result.set(id, { ...point, [axis]: point[axis] + shift });
        }
      }
    }
  }
  return result;
};

/** Node rects at the origin plus the frame around each group's members. */
const frame = (graph: MermaidGraph, positions: Map<string, Scene.Point>, cell: Cell): Placement => {
  const minX = Math.min(0, ...[...positions.values()].map((point) => point.x));
  const minY = Math.min(0, ...[...positions.values()].map((point) => point.y));
  const nodes = new Map<string, Rect>(
    [...positions].map(([id, point]) => [id, { x: point.x - minX, y: point.y - minY, w: cell.w, h: cell.h }]),
  );

  const frames = new Map<string, Rect>();
  for (const group of graph.groups) {
    const members = group.children.flatMap((id) => nodes.get(id) ?? []);
    if (members.length === 0) {
      continue;
    }
    const x = Math.min(...members.map((rect) => rect.x)) - FRAME_PAD;
    const y = Math.min(...members.map((rect) => rect.y)) - FRAME_PAD - FRAME_LABEL_H;
    const right = Math.max(...members.map((rect) => rect.x + rect.w)) + FRAME_PAD;
    const bottom = Math.max(...members.map((rect) => rect.y + rect.h)) + FRAME_PAD;
    frames.set(group.id, { x, y, w: right - x, h: bottom - y });
  }

  return { nodes, frames };
};

type Ports = { start?: number; end?: number };

/**
 * Straightened ports: when an edge's nodes overlap on the cross axis, both terminals take one
 * shared coordinate inside the overlap, so the connector is a single straight run instead of a
 * jog between nearly aligned nodes. Distinct edges leaving the same node side take distinct
 * coordinates. Mirrors the straightening pass in the UML emitter.
 */
const straighten = (
  edges: readonly MermaidEdge[],
  nodes: Map<string, Rect>,
  isHorizontal: (edge: MermaidEdge) => boolean,
): Map<MermaidEdge, Ports> => {
  const ports = new Map<MermaidEdge, Ports>();
  const taken = new Map<string, number[]>();
  for (const edge of edges) {
    const from = nodes.get(edge.from);
    const to = nodes.get(edge.to);
    if (!from || !to) {
      continue;
    }
    const horizontal = isHorizontal(edge);
    const sameLane = horizontal ? from.x === to.x : from.y === to.y;
    const alongY = horizontal ? sameLane : !sameLane;
    const lo = (alongY ? Math.max(from.x, to.x) : Math.max(from.y, to.y)) + GRID_FINE;
    const hi = (alongY ? Math.min(from.x + from.w, to.x + to.w) : Math.min(from.y + from.h, to.y + to.h)) - GRID_FINE;
    if (lo > hi) {
      continue;
    }
    const sides = alongY
      ? [`${edge.from}:${to.y >= from.y ? 'bottom' : 'top'}`, `${edge.to}:${to.y >= from.y ? 'top' : 'bottom'}`]
      : [`${edge.from}:${to.x >= from.x ? 'right' : 'left'}`, `${edge.to}:${to.x >= from.x ? 'left' : 'right'}`];
    const center = alongY ? (from.x + from.w / 2 + to.x + to.w / 2) / 2 : (from.y + from.h / 2 + to.y + to.h / 2) / 2;
    const base = Math.min(hi, Math.max(lo, fineSnap(center)));
    const isFree = (coord: number) =>
      sides.every((side) => (taken.get(side) ?? []).every((used) => Math.abs(used - coord) >= GRID_FINE));
    let chosen: number | undefined;
    for (let step = 0; step <= Math.ceil((hi - lo) / GRID_FINE) && chosen === undefined; step++) {
      for (const candidate of step === 0 ? [base] : [base - step * GRID_FINE, base + step * GRID_FINE]) {
        if (candidate >= lo && candidate <= hi && isFree(candidate)) {
          chosen = candidate;
          break;
        }
      }
    }
    if (chosen === undefined) {
      continue;
    }
    ports.set(edge, { start: chosen, end: chosen });
    for (const side of sides) {
      taken.set(side, [...(taken.get(side) ?? []), chosen]);
    }
  }
  return ports;
};

/**
 * Inheritance bus (TB only): subtypes of one base that sit on one row above which the base sits
 * connect through a shared horizontal bus and a single triangle-headed trunk, the UML tree
 * connector. Returns the elements and the edges it consumed; edges that do not qualify are left
 * to the per-edge router.
 */
const inheritanceBuses = (
  edges: readonly MermaidEdge[],
  nodes: Map<string, Rect>,
): { elements: Scene.Element[]; consumed: Set<MermaidEdge> } => {
  const elements: Scene.Element[] = [];
  const consumed = new Set<MermaidEdge>();
  const byBase = new Map<string, MermaidEdge[]>();
  for (const edge of edges) {
    // A labelled edge keeps its own connector: the bus has no place to put its text.
    if (edge.kind === 'inheritance' && !edge.label) {
      byBase.set(edge.to, [...(byBase.get(edge.to) ?? []), edge]);
    }
  }
  for (const [baseId, group] of byBase) {
    const base = nodes.get(baseId);
    const subs = group.map((edge) => nodes.get(edge.from));
    if (!base || group.length < 2 || subs.some((sub) => !sub)) {
      continue;
    }
    const rects = subs as Rect[];
    const row = rects[0].y;
    if (rects.some((sub) => sub.y !== row) || base.y + base.h >= row) {
      continue;
    }
    const busY = fineSnap((base.y + base.h + row) / 2);
    const trunkX = fineSnap(base.x + base.w / 2);
    const centers = rects.map((sub) => fineSnap(sub.x + sub.w / 2));
    const span = [Math.min(trunkX, ...centers), Math.max(trunkX, ...centers)];
    elements.push({
      kind: 'line',
      id: `${baseId}-bus`,
      points: [
        { x: span[0], y: busY },
        { x: span[1], y: busY },
      ],
    });
    group.forEach((edge, index) => {
      elements.push({
        kind: 'line',
        id: `${edge.from}-${baseId}-stub-${index}`,
        points: [
          { x: centers[index], y: row },
          { x: centers[index], y: busY },
        ],
      });
      consumed.add(edge);
    });
    elements.push({
      kind: 'arrow',
      id: `${baseId}-inherit`,
      start: { x: trunkX, y: busY },
      end: { x: trunkX, y: base.y + base.h },
      head: 'triangle',
    });
  }
  return { elements, consumed };
};

type EmitOptions = {
  origin: Scene.Point;
  scale: number;
  bus: boolean;
  arrangement: Arrangement;
  route?: Router;
};

/**
 * Scene commands for a placement: one world object per subgraph frame (painted first) and per
 * node, plus an `edges` object of connectors.
 */
const emit = (
  graph: MermaidGraph,
  cell: Cell,
  { nodes, frames }: Placement,
  { origin, scale, bus, arrangement, route }: EmitOptions,
): Scene.Command[] => {
  const horizontal = graph.direction === 'LR' || graph.direction === 'RL';
  const at = (rect: Rect): Scene.Point => ({ x: origin.x + rect.x * scale, y: origin.y + rect.y * scale });
  const commands: Scene.Command[] = [];

  for (const group of graph.groups) {
    const frame = frames.get(group.id);
    if (!frame) {
      continue;
    }
    commands.push({
      op: 'upsert-object',
      object: {
        id: group.id,
        origin: at(frame),
        scale,
        elements: [
          { kind: 'rect', id: 'frame', x: 0, y: 0, w: frame.w, h: frame.h, stroke: 'dashed', color: 'grey' },
          // The label sits in the frame's top band rather than centered, where members would cover it.
          ...(group.label.trim()
            ? [
                {
                  kind: 'text',
                  id: 'label',
                  x: FRAME_PAD / 2,
                  y: (FRAME_LABEL_H - LABEL_FONT.lineH) / 2,
                  text: group.label,
                  weight: 's',
                  color: 'grey',
                } satisfies Scene.Text,
              ]
            : []),
        ],
      },
    });
  }

  for (const node of graph.nodes) {
    const rect = nodes.get(node.id);
    if (!rect) {
      continue;
    }
    commands.push({
      op: 'upsert-object',
      object: {
        id: node.id,
        origin: at(rect),
        scale,
        ...(node.ref ? { ref: node.ref } : {}),
        elements: [{ kind: 'rect', id: 'box', x: 0, y: 0, w: cell.w, h: cell.h, text: node.label }],
      },
    });
  }

  if (graph.edges.length > 0) {
    // Frames are containers, not obstacles: only node rects block routes.
    const router = route ?? makeAvoidingRouter([...nodes.values()], zRouter);
    const buses = bus && !horizontal ? inheritanceBuses(graph.edges, nodes) : { elements: [], consumed: new Set() };
    const routed = graph.edges.filter((edge) => !buses.consumed.has(edge));
    // In columns the root level runs across the flow, so an edge between two of its members — groups
    // or ungrouped nodes — runs across it too.
    const groupOf = new Map(graph.groups.flatMap((group) => group.children.map((id) => [id, group.id] as const)));
    const rootOf = (id: string) => groupOf.get(id) ?? id;
    const isHorizontal = (edge: MermaidEdge) =>
      arrangement === 'columns' && rootOf(edge.from) !== rootOf(edge.to) ? !horizontal : horizontal;
    const ports = straighten(routed, nodes, isHorizontal);
    const elements: Scene.Element[] = [...buses.elements];
    // Terminals already placed, per node, with their role. Edges are routed independently (and an
    // internal edge and a cross-group edge may even route in different modes), so a later edge can
    // land its terminal on an earlier one. Only an exit on an entry is a defect — it reads as a
    // crossing — so a slot is taken by the opposite role alone: two exits (a fork) or two entries (a
    // merge) share a trunk, as a bus does. Such an edge is re-routed with the port nudged to a free
    // slot on that side, preferring the nudge that keeps the route straightest.
    type Role = 'exit' | 'entry';
    const terminals = new Map<string, { point: Scene.Point; role: Role }[]>();
    const taken = (nodeId: string, point: Scene.Point, role: Role) =>
      (terminals.get(nodeId) ?? []).some(
        (other) =>
          other.role !== role &&
          Math.abs(other.point.x - point.x) < GRID_FINE &&
          Math.abs(other.point.y - point.y) < GRID_FINE,
      );
    // Paired nudges first: both ends move together, so a straight edge stays straight; single-ended
    // ones for when only one end is crowded.
    const NUDGES: [number, number][] = [
      [0, 0],
      [1, 1],
      [-1, -1],
      [2, 2],
      [-2, -2],
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    const routeEdge = (edge: MermaidEdge, from: Rect, to: Rect): Scene.Point[] => {
      const horizontal = isHorizontal(edge);
      const sameLane = horizontal ? from.x === to.x : from.y === to.y;
      const alongY = horizontal ? sameLane : !sameLane;
      const base = ports.get(edge) ?? {};
      const center = (rect: Rect) => (alongY ? rect.x + rect.w / 2 : rect.y + rect.h / 2);
      const within = (rect: Rect, value: number) =>
        alongY
          ? Math.min(rect.x + rect.w - GRID_FINE, Math.max(rect.x + GRID_FINE, value))
          : Math.min(rect.y + rect.h - GRID_FINE, Math.max(rect.y + GRID_FINE, value));
      const route = ([startNudge, endNudge]: [number, number]) =>
        router({
          relation: edge,
          from,
          to,
          horizontal,
          offset: 0,
          ports: {
            start: within(from, (base.start ?? center(from)) + startNudge * GRID_FINE),
            end: within(to, (base.end ?? center(to)) + endNudge * GRID_FINE),
          },
        });
      const free = (points: Scene.Point[]) =>
        !taken(edge.from, points[0], 'exit') && !taken(edge.to, points[points.length - 1], 'entry');
      const direct = route(NUDGES[0]);
      if (free(direct)) {
        return direct;
      }
      let best: Scene.Point[] | undefined;
      for (const nudge of NUDGES.slice(1)) {
        const attempt = route(nudge);
        if (free(attempt) && (!best || attempt.length < best.length)) {
          best = attempt;
        }
      }
      return best ?? direct;
    };
    routed.forEach((edge, index) => {
      const from = nodes.get(edge.from);
      const to = nodes.get(edge.to);
      if (!from || !to) {
        return;
      }
      const points = routeEdge(edge, from, to);
      terminals.set(edge.from, [...(terminals.get(edge.from) ?? []), { point: points[0], role: 'exit' }]);
      terminals.set(edge.to, [...(terminals.get(edge.to) ?? []), { point: points[points.length - 1], role: 'entry' }]);
      const id = `${edge.from}-${edge.to}-${index}`;
      if (points.length > 2) {
        elements.push({ kind: 'line', id: `${id}-path`, points: points.slice(0, -1) });
      }
      elements.push({
        kind: 'arrow',
        id,
        start: points[points.length - 2],
        end: points[points.length - 1],
        ...markers(edge.kind),
      });
      if (edge.label) {
        const head = points[Math.floor(points.length / 2) - 1];
        const tail = points[Math.floor(points.length / 2)];
        elements.push({
          kind: 'text',
          id: `${id}-label`,
          x: (head.x + tail.x) / 2 + GRID / 4,
          y: (head.y + tail.y) / 2 - LABEL_FONT.lineH,
          text: edge.label,
          weight: 's',
        });
      }
    });
    commands.push({ op: 'upsert-object', object: { id: 'edges', origin, scale, elements } });
  }

  return commands;
};

const objectsOf = (commands: readonly Scene.Command[]): Scene.WorldObject[] =>
  commands.flatMap((command) => (command.op === 'upsert-object' ? [command.object] : []));

/**
 * Lay out a mermaid flowchart: place once per lattice × ordering, emit with and without the
 * inheritance bus, analyze every candidate, and let the objective choose. All candidates come back
 * ranked so a bench can show what lost and why. Async because ELK is.
 */
export const layout = async (source: string, options: CompileOptions = {}): Promise<Result> => {
  const graph = parse(source);
  const { origin = { x: 0, y: 0 }, scale = 1, maxWidth = MAX_W, objective = Objective.DEFAULT, route } = options;
  const cell = measureCell(graph, maxWidth);
  const lattices = typeof options.lattice === 'number' ? [options.lattice] : (options.lattice ?? LATTICES);
  const orders = options.order ?? ORDERS;
  const buses = options.bus ?? [true, false];
  // Columns only mean something with two or more groups to arrange.
  const grouped = graph.groups.filter((group) => group.children.length > 0).length;
  const arrangements = options.arrangement ?? (grouped >= 2 ? ARRANGEMENTS : ['layered']);
  const layerings = options.layering ?? LAYERINGS;
  const alignments = options.alignment ?? ALIGNMENTS;
  invariant(
    lattices.length > 0 &&
      orders.length > 0 &&
      buses.length > 0 &&
      arrangements.length > 0 &&
      layerings.length > 0 &&
      alignments.length > 0,
    'every candidate axis needs a value',
  );

  const candidates: Candidate[] = [];
  // Knobs often reach the same placement (a graph with no in-package references layers the same
  // either way; equal-height packages align the same every way); each is routed and graded once.
  const seen = new Set<string>();
  for (const lattice of lattices) {
    for (const order of orders) {
      for (const arrangement of arrangements) {
        for (const layering of layerings) {
          const pitch = pitchFor(graph, cell, lattice);
          const positions = await place(graph, cell, pitch, order, arrangement, layering);
          // Alignment moves packages relative to each other, which only columns set side by side.
          for (const alignment of arrangement === 'columns' ? alignments : (['none'] as const)) {
            const placement = frame(graph, alignGroups(graph, positions, graph.direction, alignment), cell);
            const key = [...placement.nodes]
              .map(([id, rect]) => `${id}:${rect.x}:${rect.y}`)
              .sort()
              .join(' ');
            for (const bus of buses) {
              if (seen.has(`${arrangement}|${bus}|${key}`)) {
                continue;
              }
              seen.add(`${arrangement}|${bus}|${key}`);
              const commands = emit(graph, cell, placement, { origin, scale, bus, arrangement, route });
              const objects = objectsOf(commands);
              candidates.push({
                lattice,
                order,
                arrangement,
                layering,
                alignment,
                bus,
                commands,
                layout: { objects, report: Diagnostics.analyze(objects) },
              });
            }
          }
        }
      }
    }
  }

  const { chosen, ranked } = Objective.select(objective, candidates);
  return { commands: chosen.candidate.commands, chosen, ranked };
};

/** The chosen layout's scene commands; see {@link layout} for the candidates and verdicts. */
export const compile = async (source: string, options: CompileOptions = {}): Promise<Scene.Command[]> =>
  (await layout(source, options)).commands;
