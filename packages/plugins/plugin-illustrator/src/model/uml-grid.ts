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
import type * as Scene from './scene';
import { type UmlModel, type UmlRelation, parse, relationRanks, relationStyle, relationText } from './uml';

/**
 * Snap unit for cells, gaps, and positions. tldraw renders grid lines every 1/4/16/64 × the
 * document gridSize (10) depending on zoom, so 40 — the step visible at working zoom — puts
 * node edges on rendered lines; finer 10-unit alignment only shows past ~0.7 zoom.
 */
export const GRID = 40;

/** The document grid unit, used for sub-cell nudges (channel separation, label offsets). */
const GRID_FINE = 10;

const TITLE_FONT = Layout.FONT_METRICS.m;
const MEMBER_FONT = Layout.FONT_METRICS.s;
const MIN_W = 160;
const MAX_W = 400;
const PAD_X = 24;
const TITLE_PAD = 10;
const SECTION_PAD = 14;
const GAP_MAIN = 80;
const GAP_CROSS = 80;

const snap = (value: number) => Math.ceil(value / GRID) * GRID;

/** Node rect in scene units. */
export type Rect = { x: number; y: number; w: number; h: number };

export type RoutedRelation = {
  relation: UmlRelation;
  from: Rect;
  to: Rect;
  /** True when the diagram flows LR/RL, so ranks stack along x. */
  horizontal: boolean;
  /** Sequence number among relations sharing a routing channel, for parallel-edge separation. */
  offset: number;
};

/**
 * Produces the connector waypoints for one relation, in scene units. The returned polyline is
 * rendered verbatim (last segment carries the arrowhead), so a router fully controls the path.
 */
export type Router = (edge: RoutedRelation) => Scene.Point[];

/** Z route along y: leave the facing horizontal edge, run a channel at mid, enter the peer's. */
const routeAlongY = (from: Rect, to: Rect, shift: number): Scene.Point[] => {
  const down = to.y >= from.y;
  const start = { x: from.x + from.w / 2, y: down ? from.y + from.h : from.y };
  const end = { x: to.x + to.w / 2, y: down ? to.y : to.y + to.h };
  const mid = snap((start.y + end.y) / 2) + shift;
  return start.x === end.x ? [start, end] : [start, { x: start.x, y: mid }, { x: end.x, y: mid }, end];
};

/** Z route along x; mirror of `routeAlongY`. */
const routeAlongX = (from: Rect, to: Rect, shift: number): Scene.Point[] => {
  const right = to.x >= from.x;
  const start = { x: right ? from.x + from.w : from.x, y: from.y + from.h / 2 };
  const end = { x: right ? to.x : to.x + to.w, y: to.y + to.h / 2 };
  const mid = snap((start.x + end.x) / 2) + shift;
  return start.y === end.y ? [start, end] : [start, { x: mid, y: start.y }, { x: mid, y: end.y }, end];
};

/**
 * Default router: an orthogonal Z along the flow axis — rank-crossing edges route through the
 * inter-rank gutter (channel shifted per parallel edge); same-rank edges route out the side.
 */
export const zRouter: Router = ({ from, to, offset, horizontal }) => {
  const sameLane = horizontal ? from.x === to.x : from.y === to.y;
  const alongY = horizontal ? sameLane : !sameLane;
  return (alongY ? routeAlongY : routeAlongX)(from, to, offset * GRID_FINE);
};

type Cell = { w: number; h: number; titleH: number };

/** One cell fits the largest class: widest line (wrapped at maxWidth) and tallest member list. */
const measureCell = (model: UmlModel, maxWidth: number): Cell => {
  const memberLines = (entry: UmlModel['classes'][number]) => [...entry.attributes, ...entry.methods];
  const titleW =
    Math.max(0, ...model.classes.map((entry) => Math.max(entry.label.length, (entry.stereotype?.length ?? 0) + 2))) *
    TITLE_FONT.charW;
  const memberW =
    Math.max(0, ...model.classes.flatMap((entry) => memberLines(entry).map((line) => line.length))) * MEMBER_FONT.charW;
  const w = snap(Math.min(maxWidth, Math.max(MIN_W, Math.ceil(Math.max(titleW, memberW)) + PAD_X)));
  const wrapped = (length: number, font: Layout.FontMetrics) =>
    Math.max(1, Math.ceil((length * font.charW) / (w - PAD_X)));
  const titleLines = Math.max(
    1,
    ...model.classes.map((entry) => wrapped(entry.label.length, TITLE_FONT) + (entry.stereotype ? 1 : 0)),
  );
  const bodyLines = Math.max(
    1,
    ...model.classes.map((entry) =>
      memberLines(entry).reduce((sum, line) => sum + wrapped(line.length, MEMBER_FONT), 0),
    ),
  );
  const titleH = snap(titleLines * TITLE_FONT.lineH + TITLE_PAD);
  const bodyH = snap(bodyLines * MEMBER_FONT.lineH + SECTION_PAD);
  return { w, h: titleH + bodyH, titleH };
};

export type CompileOptions = {
  /** Canvas position of the diagram's top-left, in canvas px. */
  origin?: Scene.Point;
  /** Canvas px per scene unit. */
  scale?: number;
  /** Gap between ranks along the flow direction, in scene units (default 80, snapped to GRID). */
  gapMain?: number;
  /** Gap between classes within a rank, in scene units (default 80, snapped to GRID). */
  gapCross?: number;
  /** Maximum cell width, in scene units (default 400); longer lines wrap. */
  maxWidth?: number;
  /** Connector routing (default `zRouter`). */
  route?: Router;
};

/**
 * Compile a mermaid class diagram into scene commands with equal-size grid-aligned nodes: per
 * class a `title` bar plus a `body` compartment filling the cell, and an `edges` object holding
 * orthogonal connector paths (polyline waypoints, an arrowhead segment, and a floating label).
 */
export const compile = (source: string, options: CompileOptions = {}): Scene.Command[] => {
  const model = parse(source);
  const { origin = { x: 0, y: 0 }, scale = 1, maxWidth = MAX_W, route = zRouter } = options;
  const gapMain = snap(options.gapMain ?? GAP_MAIN);
  const gapCross = snap(options.gapCross ?? GAP_CROSS);
  const horizontal = model.direction === 'LR' || model.direction === 'RL';
  const cell = measureCell(model, maxWidth);
  const ranks = relationRanks(model);

  const lanes = new Map<number, string[]>();
  for (const entry of model.classes) {
    const value = ranks.get(entry.id) ?? 0;
    lanes.set(value, [...(lanes.get(value) ?? []), entry.id]);
  }

  // Uniform cells make lanes a plain grid; centering offsets snap so nodes stay on it.
  const cross = horizontal ? cell.h : cell.w;
  const main = horizontal ? cell.w : cell.h;
  const widest = Math.max(...[...lanes.values()].map((lane) => lane.length), 1);
  const span = (count: number) => count * cross + (count - 1) * gapCross;
  const rects = new Map<string, Rect>();
  for (const [lane, members] of lanes) {
    const offset = snap((span(widest) - span(members.length)) / 2);
    members.forEach((id, index) => {
      const crossOffset = offset + index * (cross + gapCross);
      const mainOffset = lane * (main + gapMain);
      rects.set(id, {
        x: horizontal ? mainOffset : crossOffset,
        y: horizontal ? crossOffset : mainOffset,
        w: cell.w,
        h: cell.h,
      });
    });
  }

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
        elements: [
          { kind: 'rect', id: 'title', x: 0, y: 0, w: cell.w, h: cell.titleH, text: title, fill: 'solid' },
          {
            kind: 'rect',
            id: 'body',
            x: 0,
            y: cell.titleH,
            w: cell.w,
            h: cell.h - cell.titleH,
            ...(members ? { text: members } : {}),
            weight: 's',
          },
        ],
      },
    });
  }

  if (model.relations.length > 0) {
    // Count parallel edges per lane pair so the router can separate their channels.
    const channels = new Map<string, number>();
    const elements: Scene.Element[] = [];
    model.relations.forEach((relation, index) => {
      const key = `${ranks.get(relation.from) ?? 0}:${ranks.get(relation.to) ?? 0}`;
      const offset = channels.get(key) ?? 0;
      channels.set(key, offset + 1);
      const points = route({
        relation,
        from: rects.get(relation.from)!,
        to: rects.get(relation.to)!,
        horizontal,
        offset,
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
