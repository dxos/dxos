//
// Copyright 2026 DXOS.org
//

//
// Grid variant of the UML class-diagram dialect: every class renders as an equal-size node
// (uniform cell sized to the largest class) placed on a fixed grid, and relations render as
// orthogonally routed connectors. Routing is pluggable via `CompileOptions.route` so callers
// can substitute channel assignment or full obstacle-avoiding routers later.
//

import * as Layout from './layout';
import { makeAvoidingRouter } from './ortho-router';
import type * as Scene from './scene';
import { type UmlModel, type UmlRelation, parse, relationRanks, relationStyle, relationText } from './uml';

/**
 * Snap unit for cells, gaps, and positions, chosen so node edges land on the grid lines tldraw
 * renders at working zoom (it draws lines at power-of-two multiples of its document gridSize).
 */
export const GRID = 32;

/** Half-cell minor grid, used for sub-cell nudges (ports, channel separation, label offsets). */
const GRID_FINE = GRID / 2;

const MIN_W = GRID * 2;
const MAX_W = GRID * 6;

const MIN_H = GRID * 2;
const MAX_H = GRID * 5;

const MIN_TITLE_H = GRID;
const MAX_TITLE_H = GRID * 2;

const TITLE_PAD = GRID / 2;
const TEXT_PAD = GRID_FINE * 1;
const PAD_X = GRID * 2;
const SECTION_PAD = GRID / 2;
const GAP_MAIN = GRID * 4;
const GAP_CROSS = GRID * 4;

const TITLE_FONT = Layout.FONT_METRICS.m;
const MEMBER_FONT = Layout.FONT_METRICS.s;

const snap = (value: number) => Math.ceil(value / GRID) * GRID;

/** Node rect in scene units. */
export type Rect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type RoutedRelation = {
  /** The edge being routed; routers read only its endpoints, so any dialect's edge type fits. */
  relation: Layout.LayoutEdge;
  from: Rect;
  to: Rect;
  /** True when the diagram flows LR/RL, so ranks stack along x. */
  horizontal: boolean;
  /** Channel slot among relations sharing a gutter, centered on it (shift = offset × GRID_FINE). */
  offset: number;
  /** Terminal cross-axis coordinates (port positions); node-edge centers when omitted. */
  ports?: { start?: number; end?: number };
};

/**
 * Produces the connector waypoints for one relation, in scene units. The returned polyline is
 * rendered verbatim (last segment carries the arrowhead), so a router fully controls the path.
 */
export type Router = (edge: RoutedRelation) => Scene.Point[];

/** Z route along y: leave the facing horizontal edge, run a channel at mid, enter the peer's. */
const routeAlongY = (from: Rect, to: Rect, shift: number, ports?: RoutedRelation['ports']): Scene.Point[] => {
  const down = to.y >= from.y;
  const start = { x: ports?.start ?? from.x + from.w / 2, y: down ? from.y + from.h : from.y };
  const end = { x: ports?.end ?? to.x + to.w / 2, y: down ? to.y : to.y + to.h };
  if (start.x === end.x) {
    // Aligned terminals: a straight line, shifted sideways so parallel edges stay distinct.
    return [
      { x: start.x + shift, y: start.y },
      { x: end.x + shift, y: end.y },
    ];
  }
  const mid = snap((start.y + end.y) / 2) + shift;
  return [start, { x: start.x, y: mid }, { x: end.x, y: mid }, end];
};

/** Z route along x; mirror of `routeAlongY`. */
const routeAlongX = (from: Rect, to: Rect, shift: number, ports?: RoutedRelation['ports']): Scene.Point[] => {
  const right = to.x >= from.x;
  const start = { x: right ? from.x + from.w : from.x, y: ports?.start ?? from.y + from.h / 2 };
  const end = { x: right ? to.x : to.x + to.w, y: ports?.end ?? to.y + to.h / 2 };
  if (start.y === end.y) {
    return [
      { x: start.x, y: start.y + shift },
      { x: end.x, y: end.y + shift },
    ];
  }
  const mid = snap((start.x + end.x) / 2) + shift;
  return [start, { x: mid, y: start.y }, { x: mid, y: end.y }, end];
};

/**
 * Default router: an orthogonal Z along the flow axis — rank-crossing edges route through the
 * inter-rank gutter (channel shifted per parallel edge); same-rank edges route out the side.
 */
export const zRouter: Router = ({ from, to, offset, horizontal, ports }) => {
  const sameLane = horizontal ? from.x === to.x : from.y === to.y;
  const alongY = horizontal ? sameLane : !sameLane;
  return (alongY ? routeAlongY : routeAlongX)(from, to, offset * GRID_FINE, ports);
};

/**
 * Pull strength per relation kind when aligning columns: parts stick to their whole's column
 * before subtypes, which in turn beat loose dependencies/associations.
 */
const COLUMN_WEIGHT: Record<UmlRelation['kind'], number> = {
  composition: 4,
  aggregation: 3,
  inheritance: 2,
  realization: 2,
  dependency: 1,
  association: 1,
};

/**
 * Assign each node an integer column: the first lane keeps declaration order, later lanes pull
 * each node toward the weighted mean column of its already-placed neighbours. The strongest-tied
 * node picks its column first, so a part claims the column under its whole even when weaker
 * relations compete for it; collisions take the free column nearest the desired mean. Aligned
 * columns turn rank-crossing connectors into straight lines.
 */
const assignColumns = (
  model: UmlModel,
  ranks: Map<string, number>,
  lanes: Map<number, string[]>,
): Map<string, number> => {
  type Link = { peer: string; weight: number };
  const neighbors = new Map<string, Link[]>();
  for (const relation of model.relations) {
    const weight = COLUMN_WEIGHT[relation.kind];
    neighbors.set(relation.from, [...(neighbors.get(relation.from) ?? []), { peer: relation.to, weight }]);
    neighbors.set(relation.to, [...(neighbors.get(relation.to) ?? []), { peer: relation.from, weight }]);
  }

  const columns = new Map<string, number>();
  const laneOrder = [...lanes.keys()].sort((left, right) => left - right);
  laneOrder.forEach((lane, position) => {
    const members = lanes.get(lane)!;
    const desired = members.map((id, index) => {
      const placed = (neighbors.get(id) ?? []).filter((link) => columns.has(link.peer));
      const pull = placed.reduce((sum, link) => sum + link.weight, 0);
      const mean =
        position > 0 && pull > 0
          ? placed.reduce((sum, link) => sum + link.weight * columns.get(link.peer)!, 0) / pull
          : index;
      return { id, mean, pull, index };
    });
    desired.sort((left, right) => right.pull - left.pull || left.index - right.index);
    const used = new Set<number>();
    for (const entry of desired) {
      // Round half toward the left so a node between two equal parents aligns with the first;
      // on collision take the free column nearest the desired mean.
      const base = Math.ceil(entry.mean - 0.5);
      let column = base;
      for (let step = 1; used.has(column); step++) {
        const left = base - step;
        const right = base + step;
        if (!used.has(left) && (used.has(right) || Math.abs(left - entry.mean) <= Math.abs(right - entry.mean))) {
          column = left;
        } else if (!used.has(right)) {
          column = right;
        }
      }
      used.add(column);
      columns.set(entry.id, column);
    }
  });

  // Normalize so the leftmost column is 0.
  const min = Math.min(...columns.values(), 0);
  return new Map([...columns].map(([id, column]) => [id, column - min]));
};

/** Fixed cell size, in scene units; omitted dimensions are measured from content. */
export type CellSize = { w?: number; h?: number };

export type Cell = { w: number; h: number; titleH: number };

export type MeasureOptions = {
  maxWidth: number;
  cell?: CellSize;
  titleHeight?: number;
};

/** One cell fits the largest class: widest line (wrapped at maxWidth) and tallest member list. */
export const measureCell = (model: UmlModel, { maxWidth, cell: override = {}, titleHeight }: MeasureOptions): Cell => {
  const memberLines = (entry: UmlModel['classes'][number]) => [...entry.attributes, ...entry.methods];
  const titleW =
    Math.max(0, ...model.classes.map((entry) => Math.max(entry.label.length, (entry.stereotype?.length ?? 0) + 2))) *
    TITLE_FONT.charW;
  const memberW =
    Math.max(0, ...model.classes.flatMap((entry) => memberLines(entry).map((line) => line.length))) * MEMBER_FONT.charW;
  const w = snap(override.w ?? Math.min(maxWidth, Math.max(MIN_W, Math.ceil(Math.max(titleW, memberW)) + PAD_X)));
  const wrapped = (length: number, font: Layout.FontMetrics) =>
    Math.max(1, Math.ceil((length * font.charW) / (w - TEXT_PAD * 2)));
  const titleLines = Math.max(
    1,
    ...model.classes.map((entry) => wrapped(entry.label.length, TITLE_FONT) + (entry.stereotype ? 1 : 0)),
  );
  const bodyLines = Math.max(
    1,
    ...model.classes.map(
      (entry) =>
        memberLines(entry).reduce((sum, line) => sum + wrapped(line.length, MEMBER_FONT), 0) +
        // The emitted body inserts a blank separator line between attributes and methods.
        (entry.attributes.length && entry.methods.length ? 1 : 0),
    ),
  );
  // A fixed header snaps to the fine grid so it can sit below one GRID cell; the measured
  // default clamps to the GRID-derived title bounds.
  const titleH =
    titleHeight !== undefined
      ? Math.ceil(titleHeight / GRID_FINE) * GRID_FINE
      : Math.min(MAX_TITLE_H, Math.max(MIN_TITLE_H, snap(titleLines * TITLE_FONT.lineH + TITLE_PAD)));
  const bodyH = snap(bodyLines * MEMBER_FONT.lineH + SECTION_PAD);
  // Measured height clamps to the GRID-derived bounds (very large classes cap at MAX_H and may
  // elide content); an explicit override wins, still reserving the title bar.
  const measured = Math.min(MAX_H, Math.max(MIN_H, titleH + bodyH));
  const h = override.h !== undefined ? Math.max(snap(override.h), titleH + GRID) : measured;
  return { w, h, titleH };
};

export type CompileOptions = {
  /** Canvas position of the diagram's top-left, in canvas px. */
  origin?: Scene.Point;
  /** Canvas px per scene unit. */
  scale?: number;
  /** Gap between ranks along the flow direction, in scene units (default GRID × 4, snapped). */
  gapMain?: number;
  /** Gap between classes within a rank, in scene units (default GRID × 4, snapped). */
  gapCross?: number;
  /** Maximum cell width, in scene units (default GRID × 6); longer lines wrap. */
  maxWidth?: number;
  /** Fixed cell size (snapped to GRID); overrides measurement per dimension. */
  cell?: CellSize;
  /** Fixed header height, in scene units (snapped to the fine grid); measured when unset. */
  titleHeight?: number;
  /** Connector routing (default `zRouter`). */
  route?: Router;
};

/** A placed diagram: the parsed model plus per-class node rects (scene units). */
export type Placement = {
  model: UmlModel;
  cell: Cell;
  rects: Map<string, Rect>;
  ranks: Map<string, number>;
};

export type EmitOptions = {
  origin?: Scene.Point;
  scale?: number;
  route?: Router;
};

/**
 * Compile a mermaid class diagram into scene commands with equal-size grid-aligned nodes: per
 * class a `title` bar plus a `body` compartment filling the cell, and an `edges` object holding
 * orthogonal connector paths (polyline waypoints, an arrowhead segment, and a floating label).
 */
export const compile = (source: string, options: CompileOptions = {}): Scene.Command[] => {
  const model = parse(source);
  const { origin = { x: 0, y: 0 }, scale = 1, maxWidth = MAX_W, route } = options;
  const gapMain = snap(options.gapMain ?? GAP_MAIN);
  const gapCross = snap(options.gapCross ?? GAP_CROSS);
  const horizontal = model.direction === 'LR' || model.direction === 'RL';
  const cell = measureCell(model, { maxWidth, cell: options.cell, titleHeight: options.titleHeight });
  const ranks = relationRanks(model);

  const lanes = new Map<number, string[]>();
  for (const entry of model.classes) {
    const value = ranks.get(entry.id) ?? 0;
    lanes.set(value, [...(lanes.get(value) ?? []), entry.id]);
  }

  // Uniform cells make lanes a plain grid: nodes take shared integer columns (aligned via their
  // neighbours) so as many connectors as possible run straight through the gutters.
  const cross = horizontal ? cell.h : cell.w;
  const main = horizontal ? cell.w : cell.h;
  const columns = assignColumns(model, ranks, lanes);
  const rects = new Map<string, Rect>();
  for (const [lane, members] of lanes) {
    for (const id of members) {
      const crossOffset = columns.get(id)! * (cross + gapCross);
      const mainOffset = lane * (main + gapMain);
      rects.set(id, {
        x: horizontal ? mainOffset : crossOffset,
        y: horizontal ? crossOffset : mainOffset,
        w: cell.w,
        h: cell.h,
      });
    }
  }

  return emit({ model, cell, rects, ranks }, { origin, scale, route });
};

/**
 * Emit scene commands from a placed model — the shared back half of `compile`, also used by the
 * engine-backed dialects (`uml-engine.ts`) which supply their own placement.
 */
export const emit = (
  { model, cell, rects, ranks }: Placement,
  { origin = { x: 0, y: 0 }, scale = 1, route }: EmitOptions = {},
): Scene.Command[] => {
  const horizontal = model.direction === 'LR' || model.direction === 'RL';
  // Default routing avoids every node (fewest turns), falling back to the Z-router per edge.
  const router = route ?? makeAvoidingRouter([...rects.values()], zRouter);
  const commands: Scene.Command[] = [];

  for (const entry of model.classes) {
    const rect = rects.get(entry.id)!;
    const title = entry.stereotype ? `«${entry.stereotype}»\n${entry.label}` : entry.label;
    const members = [
      ...entry.attributes,
      ...(entry.attributes.length && entry.methods.length ? [''] : []),
      ...entry.methods,
    ].join('\n');
    commands.push({
      op: 'upsert-object',
      object: {
        id: entry.id,
        origin: { x: origin.x + rect.x * scale, y: origin.y + rect.y * scale },
        scale,
        // One rounded frame encapsulates the node; the header rounds only its top corners so it
        // sits flush against the frame, and members render as free left-aligned text below it.
        elements: [
          { kind: 'rect', id: 'frame', x: 0, y: 0, w: cell.w, h: cell.h },
          {
            kind: 'rect',
            id: 'title',
            x: 0,
            y: 0,
            w: cell.w,
            h: cell.titleH,
            text: title,
            fill: 'solid',
            corners: 'top',
          },
          ...(members
            ? [
                {
                  kind: 'text',
                  id: 'body',
                  x: TEXT_PAD,
                  y: cell.titleH + SECTION_PAD / 2,
                  w: cell.w - TEXT_PAD * 2,
                  text: members,
                  weight: 's',
                } satisfies Scene.Text,
              ]
            : []),
        ],
      },
    });
  }

  if (model.relations.length > 0) {
    // A route's channel run sits on the gutter line at the midpoint between its terminals, so ALL
    // edges sharing that line — not just those between the same rank pair — must take distinct
    // channels or their runs overlap. Straight edges (aligned terminals) share the column/row line
    // instead, and the router shifts them sideways. Offsets center each block on its line.
    const gutterOf = (relation: UmlRelation): string => {
      const from = rects.get(relation.from)!;
      const to = rects.get(relation.to)!;
      const sameLane = horizontal ? from.x === to.x : from.y === to.y;
      const alongY = horizontal ? sameLane : !sameLane;
      if (alongY) {
        if (from.x + from.w / 2 === to.x + to.w / 2) {
          return `v:${from.x + from.w / 2}`;
        }
        const startY = to.y >= from.y ? from.y + from.h : from.y;
        const endY = to.y >= from.y ? to.y : to.y + to.h;
        return `y:${snap((startY + endY) / 2)}`;
      }
      if (from.y + from.h / 2 === to.y + to.h / 2) {
        return `h:${from.y + from.h / 2}`;
      }
      const startX = to.x >= from.x ? from.x + from.w : from.x;
      const endX = to.x >= from.x ? to.x : to.x + to.w;
      return `x:${snap((startX + endX) / 2)}`;
    };

    const gutters = new Map<string, number>();
    for (const relation of model.relations) {
      const gutter = gutterOf(relation);
      gutters.set(gutter, (gutters.get(gutter) ?? 0) + 1);
    }

    // Port distribution: terminals attaching to the same node side spread across it (ordered by
    // peer position) instead of stacking on the center — the final approach segments of distinct
    // relations would otherwise coincide exactly.
    type PortSlot = { relation: UmlRelation; end: boolean; order: number };
    const portGroups = new Map<string, PortSlot[]>();
    const addSlot = (key: string, slot: PortSlot) => portGroups.set(key, [...(portGroups.get(key) ?? []), slot]);
    for (const relation of model.relations) {
      const from = rects.get(relation.from)!;
      const to = rects.get(relation.to)!;
      const sameLane = horizontal ? from.x === to.x : from.y === to.y;
      const alongY = horizontal ? sameLane : !sameLane;
      if (alongY) {
        const down = to.y >= from.y;
        addSlot(`${relation.from}:${down ? 'bottom' : 'top'}`, { relation, end: false, order: to.x + to.w / 2 });
        addSlot(`${relation.to}:${down ? 'top' : 'bottom'}`, { relation, end: true, order: from.x + from.w / 2 });
      } else {
        const right = to.x >= from.x;
        addSlot(`${relation.from}:${right ? 'right' : 'left'}`, { relation, end: false, order: to.y + to.h / 2 });
        addSlot(`${relation.to}:${right ? 'left' : 'right'}`, { relation, end: true, order: from.y + from.h / 2 });
      }
    }
    const ports = new Map<UmlRelation, { start?: number; end?: number }>();
    for (const [key, slots] of portGroups) {
      if (slots.length < 2) {
        continue;
      }
      const nodeId = key.slice(0, key.lastIndexOf(':'));
      const rect = rects.get(nodeId)!;
      const across = key.endsWith(':top') || key.endsWith(':bottom');
      slots.sort((left, right) => left.order - right.order);
      // Dense sides can round two slots onto the same minor-grid line; fall back to the exact
      // fractional coordinate so ports stay collision-free (and monotone in slot order).
      const taken = new Set<number>();
      slots.forEach((slot, index) => {
        const fraction = (index + 1) / (slots.length + 1);
        const exact = across ? rect.x + rect.w * fraction : rect.y + rect.h * fraction;
        const rounded = Math.round(exact / GRID_FINE) * GRID_FINE;
        const coord = taken.has(rounded) ? exact : rounded;
        taken.add(coord);
        const entry = ports.get(slot.relation) ?? {};
        entry[slot.end ? 'end' : 'start'] = coord;
        ports.set(slot.relation, entry);
      });
    }

    // Straightening: when a relation's nodes overlap on the cross axis, snap both terminals to a
    // shared free coordinate so the connector runs straight — a jog between stacked (or abreast)
    // nodes reads as noise. The spread ports above are the collision set; singles sit on centers.
    const takenBySide = new Map<string, Map<UmlRelation, number>>();
    for (const [key, slots] of portGroups) {
      const nodeId = key.slice(0, key.lastIndexOf(':'));
      const rect = rects.get(nodeId)!;
      const across = key.endsWith(':top') || key.endsWith(':bottom');
      const coords = new Map<UmlRelation, number>();
      for (const slot of slots) {
        const port = ports.get(slot.relation)?.[slot.end ? 'end' : 'start'];
        coords.set(slot.relation, port ?? (across ? rect.x + rect.w / 2 : rect.y + rect.h / 2));
      }
      takenBySide.set(key, coords);
    }
    const fineSnap = (value: number) => Math.round(value / GRID_FINE) * GRID_FINE;
    for (const relation of model.relations) {
      const from = rects.get(relation.from)!;
      const to = rects.get(relation.to)!;
      const sameLane = horizontal ? from.x === to.x : from.y === to.y;
      const alongY = horizontal ? sameLane : !sameLane;
      const lo = alongY ? Math.max(from.x, to.x) + GRID_FINE : Math.max(from.y, to.y) + GRID_FINE;
      const hi = alongY
        ? Math.min(from.x + from.w, to.x + to.w) - GRID_FINE
        : Math.min(from.y + from.h, to.y + to.h) - GRID_FINE;
      if (lo > hi) {
        continue;
      }
      const startKey = alongY
        ? `${relation.from}:${to.y >= from.y ? 'bottom' : 'top'}`
        : `${relation.from}:${to.x >= from.x ? 'right' : 'left'}`;
      const endKey = alongY
        ? `${relation.to}:${to.y >= from.y ? 'top' : 'bottom'}`
        : `${relation.to}:${to.x >= from.x ? 'left' : 'right'}`;
      const entry = ports.get(relation) ?? {};
      const startCoord = entry.start ?? (alongY ? from.x + from.w / 2 : from.y + from.h / 2);
      const endCoord = entry.end ?? (alongY ? to.x + to.w / 2 : to.y + to.h / 2);
      const isFree = (coord: number) =>
        ![startKey, endKey].some((side) =>
          [...(takenBySide.get(side) ?? new Map<UmlRelation, number>())].some(
            ([peer, taken]) => peer !== relation && Math.abs(taken - coord) < GRID_FINE,
          ),
        );
      const base = Math.min(hi, Math.max(lo, fineSnap((startCoord + endCoord) / 2)));
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
      entry.start = chosen;
      entry.end = chosen;
      ports.set(relation, entry);
      takenBySide.get(startKey)?.set(relation, chosen);
      takenBySide.get(endKey)?.set(relation, chosen);
    }

    const assigned = new Map<string, number>();
    const elements: Scene.Element[] = [];
    model.relations.forEach((relation, index) => {
      const gutter = gutterOf(relation);
      const position = assigned.get(gutter) ?? 0;
      assigned.set(gutter, position + 1);
      // Integer slots so every jog stays on the minor grid (shift = offset × GRID_FINE).
      const offset = position - Math.floor((gutters.get(gutter)! - 1) / 2);
      const points = router({
        relation,
        from: rects.get(relation.from)!,
        to: rects.get(relation.to)!,
        horizontal,
        offset,
        ports: ports.get(relation),
      });
      const id = `${relation.from}-${relation.to}-${index}`;
      const style = relationStyle(relation.kind);
      // The final segment renders as an arrow for the head; earlier waypoints as a polyline.
      if (points.length > 2) {
        elements.push({ kind: 'line', id: `${id}-path`, points: points.slice(0, -1), ...style });
      }
      elements.push({
        kind: 'arrow',
        id,
        start: points[points.length - 2],
        end: points[points.length - 1],
        ...style,
      });
      const text = relationText(relation);
      if (text) {
        // Label sits just above the middle segment (the channel run on a routed path).
        const head = points[Math.floor(points.length / 2) - 1];
        const tail = points[Math.floor(points.length / 2)];
        elements.push({
          kind: 'text',
          id: `${id}-label`,
          x: (head.x + tail.x) / 2 + GRID_FINE / 2,
          y: (head.y + tail.y) / 2 - MEMBER_FONT.lineH,
          text,
          weight: 's',
        });
      }
    });
    commands.push({ op: 'upsert-object', object: { id: 'edges', origin, scale, elements } });
  }

  return commands;
};
