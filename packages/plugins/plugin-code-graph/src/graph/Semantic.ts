//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Dsl, type Scene, SemanticEngine } from '@dxos/diagram';
import { Shape } from '@dxos/scene';

import type * as Model from './Model.ts';

export type Point = { x: number; y: number };
export type Size = { width: number; height: number };

/** One box and its cell pitch, shared with the canvas so semantic positions land on canvas boxes 1:1. */
export const BOX: Size = { width: 208, height: 64 };
export const PITCH: Size = { width: 272, height: 144 };

/** Predicates that read as "uses"; drawn as dashed dependency arrows. */
const DEPENDENCY = new Set(['imports', 'importsType', 'importsModule', 'usesPackage', 'declaresDep', 'reexports']);
/** Predicates that read as "contains"; drawn with a filled diamond at the whole. */
const CONTAINMENT = new Set(['declares', 'inPackage', 'hasMember']);

export type Diagram = {
  source: string;
  /** DSL id → node IRI; the DSL takes bare words, IRIs do not lex as one. */
  ids: Map<string, string>;
  /** DSL id → package, for each frame. */
  groups: Map<string, string>;
};

export type LayoutOptions = {
  flow?: 'down' | 'right';
  /** Frame each package's boxes together; without it the engine places boxes with no regard to their package. */
  grouped?: boolean;
  /** Names for the frames by package directory; a frame without one shows the directory's last segment. */
  labels?: Record<string, string>;
};

/**
 * How far a frame is drawn inside the cells it spans: the engine butts neighbouring groups' frames together, and the
 * inset leaves a gutter between them while still clearing the boxes, which sit half a gutter in from the cell edge.
 */
const FRAME_INSET = 12;

/** Group colours, light ones first so box text stays readable on the tint; dark ones only once those run out. */
const GROUP_COLORS: readonly Shape.Color[] = [
  'light-blue',
  'light-green',
  'yellow',
  'light-violet',
  'orange',
  'light-red',
  'blue',
  'green',
  'violet',
  'red',
];

/** A package's colour, from its directory, so it keeps its colour as the graph and the layout change. */
export const groupColor = (group: string): Shape.Color => {
  let hash = 0;
  for (const char of group) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return GROUP_COLORS[hash % GROUP_COLORS.length];
};

/** A frame's title: the package's name when known, else its directory's last segment. */
export const frameLabel = (group: string, labels: Record<string, string> = {}): string =>
  labels[group] ?? group.split('/').pop() ?? group;

/** Writes the graph as illustrator DSL: one box per node, a frame per package when grouped, one edge per arrow. */
export const toDsl = (graph: Model.Patch, { flow = 'down', grouped = false, labels }: LayoutOptions = {}): Diagram => {
  const ids = new Map<string, string>();
  const dslId = new Map<string, string>();
  graph.nodes.forEach((node, index) => {
    ids.set(`n${index}`, node.id);
    dslId.set(node.id, `n${index}`);
  });

  const lines = [`diagram flow=${flow} box=${BOX.width}x${BOX.height} grid=${PITCH.width}x${PITCH.height}`];
  const nodeLine = (node: Model.Patch['nodes'][number], indent = '') =>
    `${indent}node ${dslId.get(node.id)} ${Dsl.formatString(node.label)} ref=${Dsl.formatString(node.id)}`;

  const members = new Map<string, Model.Patch['nodes']>();
  for (const node of graph.nodes) {
    if (grouped && node.group) {
      members.set(node.group, [...(members.get(node.group) ?? []), node]);
    }
  }
  const groups = new Map<string, string>();
  const framed = members.size > 0;
  if (framed) {
    [...members.entries()].forEach(([name, members], index) => {
      groups.set(`g${index}`, name);
      lines.push(`group g${index} ${Dsl.formatString(frameLabel(name, labels))} color=${groupColor(name)} {`);
      members.forEach((node) => lines.push(nodeLine(node, '  ')));
      lines.push('}');
    });
  }
  for (const node of graph.nodes) {
    if (!framed || !node.group) {
      lines.push(nodeLine(node));
    }
  }

  for (const edge of graph.edges) {
    const from = dslId.get(edge.from);
    const to = dslId.get(edge.to);
    if (from && to && from !== to) {
      const word =
        edge.kind && DEPENDENCY.has(edge.kind)
          ? 'depends-on'
          : edge.kind && CONTAINMENT.has(edge.kind)
            ? 'composes'
            : '->';
      lines.push(`edge ${from} ${word} ${to}`);
    }
  }
  return { source: lines.join('\n'), ids, groups };
};

/**
 * A package's frame as the illustrator drew it: its tinted box and its title, in the element's own units, placed by
 * `center` and `size` in the same units and origin as the positions. The canvas draws it with its diagram renderer.
 */
export type Frame = {
  /** The package directory, e.g. `packages/core/echo/echo`. */
  group: string;
  /** The package's name, e.g. `@dxos/echo`. */
  label: string;
  center: Point;
  size: Size;
  /** The frame's box. */
  element: Shape.Box;
  /** The title's offset from the box's corner, and its look. */
  heading?: { id: string; x: number; y: number; w?: number; color?: Shape.Color; weight?: Shape.Weight };
};

export type Layout = {
  /** Box centres by node IRI, in canvas units. */
  positions: Record<string, Point>;
  /** One per package when grouped. */
  frames: Frame[];
  /** The whole drawing (frames and routed arrows included), for `SceneSvg`. */
  objects: Scene.WorldObject[];
  /** Relations the engine had to relax, and problems with the source. */
  problems: string[];
};

/**
 * Lays the graph out with plugin-illustrator's semantic engine: one grid-search restart, which takes seconds rather
 * than the minutes the full search (with ELK seeds) can take, so it suits an interactive canvas.
 */
export const layout = (graph: Model.Patch, options?: LayoutOptions): Layout => {
  if (graph.nodes.length === 0) {
    return { positions: {}, frames: [], objects: [], problems: [] };
  }
  const { source, ids, groups } = toDsl(graph, options);
  const reading = Dsl.read(source);
  const solution = reading.diagram && SemanticEngine.solve(reading.diagram, { restarts: 1 });
  const { commands, problems } = Dsl.withLayout(reading, solution);
  const objects = commands.flatMap((command) => (command.op === 'upsert-object' ? [command.object] : []));
  const positions: Record<string, Point> = {};
  const frames: Frame[] = [];
  for (const object of objects) {
    const scale = object.scale ?? 1;
    const origin = object.origin ?? { x: 0, y: 0 };
    const iri = ids.get(object.id);
    const group = groups.get(object.id);
    if (iri) {
      const box = object.elements.find((element) => 'w' in element && 'h' in element);
      if (box && 'w' in box) {
        positions[iri] = { x: origin.x + (box.x + box.w / 2) * scale, y: origin.y + (box.y + box.h / 2) * scale };
      }
    } else if (group) {
      const cell = object.elements.find((element): element is Shape.Box => element.kind === 'rect');
      const box = cell && {
        ...cell,
        x: cell.x + FRAME_INSET,
        y: cell.y + FRAME_INSET,
        w: cell.w - 2 * FRAME_INSET,
        h: cell.h - 2 * FRAME_INSET,
      };
      const title = object.elements.find((element): element is Shape.Text => element.kind === 'text');
      if (box) {
        frames.push({
          group,
          label: title?.text ?? frameLabel(group, options?.labels),
          center: { x: origin.x + (box.x + box.w / 2) * scale, y: origin.y + (box.y + box.h / 2) * scale },
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
  }
  const offset = centreOffset(positions);
  const shift = ({ x, y }: Point): Point => ({ x: x - offset.x, y: y - offset.y });
  return {
    positions: Object.fromEntries(Object.entries(positions).map(([id, point]) => [id, shift(point)])),
    frames: frames.map((frame) => ({ ...frame, center: shift(frame.center) })),
    objects,
    problems: problems.map(({ message }) => message),
  };
};

/** How far to move the points so their bounds straddle the origin, where the canvas opens, as its own arrangements do. */
const centreOffset = (positions: Record<string, Point>): Point => {
  const points = Object.values(positions);
  if (points.length === 0) {
    return { x: 0, y: 0 };
  }
  const xs = points.map(({ x }) => x);
  const ys = points.map(({ y }) => y);
  return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
};
