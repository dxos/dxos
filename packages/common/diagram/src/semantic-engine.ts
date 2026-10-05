//
// Copyright 2026 DXOS.org
//

//
// Lays out a semantic diagram: the DSL's `node`/`edge`/`group` statements with whatever hints the
// author gave, from exact coordinates down to nothing. Placement is a scored grid search
// (`semantic-place.ts`), routing a channel router (`semantic-route.ts`); the few best placements
// are routed for real and the layout objective, with the appeal library, picks one. When nothing
// was hinted, `compile` also runs the mermaid engine on the same graph and offers its placements,
// and its own layout, as candidates — so an unhinted diagram is never worse than the engine's.
//

import * as Appeal from './appeal.ts';
import * as Diagnostics from './diagnostics.ts';
import * as Layout from './layout.ts';
import * as MermaidEngine from './mermaid-engine.ts';
import * as Objective from './objective.ts';
import * as Scene from './scene.ts';
import * as Place from './semantic-place.ts';
import * as Route from './semantic-route.ts';
import * as Semantic from './semantic.ts';
import { GRID, type Rect } from './uml-grid.ts';

const FONT = Layout.FONT_METRICS.m;
const LABEL_FONT = Layout.FONT_METRICS.s;
const MIN_W = GRID * 3;
const MAX_W = GRID * 6;
const MIN_H = GRID * 3;
const PAD_X = GRID;
const PAD_Y = GRID / 2;
/** Frame inset around a group's members; the top band also holds the title. */
const FRAME_PAD = GRID;
const FRAME_LABEL_H = GRID;
/** Extra gutter where two frames face each other across a row gutter, so packages read as separate. */
const FRAME_STACK_GAP = GRID * 2;

const GROUP_COLORS: readonly Scene.Color[] = [
  'light-blue',
  'light-green',
  'yellow',
  'light-violet',
  'orange',
  'light-red',
];

const snapUp = (value: number) => Math.ceil(value / GRID) * GRID;

/** One box size for every node, from the longest label wrapped at the widest box. */
export const measureBox = (labels: readonly string[]): Semantic.Size => {
  const longest = Math.max(0, ...labels.map((label) => label.length));
  const w = snapUp(Math.min(MAX_W, Math.max(MIN_W, longest * FONT.charW + PAD_X * 2)));
  const perLine = Math.max(1, Math.floor((w - PAD_X) / FONT.charW));
  const lines = Math.max(1, ...labels.map((label) => Math.ceil(label.length / perLine)));
  const h = snapUp(Math.max(MIN_H, (lines - 1) * FONT.lineH + FONT.lineH / 1.35 + PAD_Y * 2));
  return { w, h };
};

/** Cell pitch for a box: a box-wide gutter across, and room for two frame borders, a title and a gap down. */
export const pitchFor = (box: Semantic.Size): Semantic.Size => ({
  w: snapUp(Math.max(box.w * 2, box.w + FRAME_PAD * 2 + GRID)),
  h: snapUp(Math.max(box.h * 2, box.h + FRAME_PAD * 2 + FRAME_LABEL_H + GRID)),
});

export type SolveOptions = {
  /** Objective that picks among routed candidates (default: the layout objective plus appeal). */
  objective?: Objective.Objective;
  /** Placements to refine besides the search's own. */
  seeds?: readonly Map<string, Place.Cell>[];
  /** Complete layouts to compare against, such as the mermaid engine's. */
  alternatives?: readonly Scene.Command[][];
  /** Independent placement searches (default 6). */
  restarts?: number;
};

export type Solution = {
  commands: Scene.Command[];
  issues: Semantic.Issue[];
  report: Diagnostics.Report;
};

type Geometry = {
  box: Semantic.Size;
  pitch: Semantic.Size;
  rects: Map<string, Rect>;
  frames: Map<string, Rect>;
  context: Route.Context;
  /** Scene x (y) of a fractional cell coordinate: `n` is a cell centre, `n.5` the channel after it. */
  cellX: (col: number) => number;
  cellY: (row: number) => number;
  bounds: Rect;
};

const relationsOf = (diagram: Semantic.Diagram) => ({
  relations: diagram.nodes.flatMap((node) =>
    node.relations.map((relation) => ({
      from: node.id,
      kind: relation.kind,
      target: relation.target,
      soft: relation.soft,
    })),
  ),
  groupRelations: diagram.groups.flatMap((group) =>
    group.relations.map((relation) => ({
      from: group.id,
      kind: relation.kind,
      target: relation.target,
      soft: relation.soft,
    })),
  ),
});

/** Outweighs the bends a trunk costs each subtype in the placer, which routes edges one by one. */
const SIBLING_WEIGHT = 40;

/** Soft relations that line up the subtypes of one abstraction across the flow, so they can share a trunk. */
const siblingRelations = (diagram: Semantic.Diagram): Place.PlaceRelation[] => {
  const kind = diagram.flow === 'down' || diagram.flow === 'up' ? 'same-row' : 'same-col';
  const families = new Map<string, string[]>();
  for (const edge of diagram.edges) {
    const key = Semantic.inheritanceKey(edge);
    if (key === undefined) {
      continue;
    }
    const family = families.get(key) ?? [];
    if (!family.includes(edge.from.node)) {
      families.set(key, [...family, edge.from.node]);
    }
  }
  return [...families.values()].flatMap(([first, ...rest]) =>
    rest.map((from) => ({ from, kind, target: first, soft: true, weight: SIBLING_WEIGHT })),
  );
};

/** Grid coordinates to scene rects, frames and routing channels. */
const geometry = (
  diagram: Semantic.Diagram,
  cells: Map<string, Place.Cell>,
  box: Semantic.Size,
  pitch: Semantic.Size,
): Geometry => {
  const all = [...cells.values()];
  const minCol = Math.min(0, ...all.map((cell) => cell.col));
  const maxCol = Math.max(0, ...all.map((cell) => cell.col));
  const minRow = Math.min(0, ...all.map((cell) => cell.row));
  const maxRow = Math.max(0, ...all.map((cell) => cell.row));
  const span = (group: string) => {
    const members = diagram.nodes.filter((node) => node.group === group).flatMap((node) => cells.get(node.id) ?? []);
    return members.length === 0
      ? undefined
      : {
          minCol: Math.min(...members.map((cell) => cell.col)),
          maxCol: Math.max(...members.map((cell) => cell.col)),
          minRow: Math.min(...members.map((cell) => cell.row)),
          maxRow: Math.max(...members.map((cell) => cell.row)),
        };
  };
  const spans = new Map(
    diagram.groups.flatMap((group) => {
      const value = span(group.id);
      return value ? [[group.id, value] as const] : [];
    }),
  );

  // Extra space after column `col` (row `row`): a group's own gap, or the clearance of stacked frames.
  const extraAfterCol = (col: number) =>
    Math.max(
      0,
      ...diagram.groups.flatMap((group) => {
        const own = spans.get(group.id);
        return own && group.gap !== undefined
          ? group.relations.flatMap((relation) => {
              const target = spans.get(relation.target);
              return target &&
                ((relation.kind === 'right-of' && own.minCol === col + 1) ||
                  (relation.kind === 'left-of' && target.minCol === col + 1))
                ? [group.gap ?? 0]
                : [];
            })
          : [];
      }),
    );
  const extraAfterRow = (row: number) => {
    const stacked = [...spans].some(([id, upper]) =>
      [...spans].some(
        ([other, lower]) =>
          other !== id &&
          upper.maxRow === row &&
          lower.minRow === row + 1 &&
          upper.minCol <= lower.maxCol &&
          lower.minCol <= upper.maxCol,
      ),
    );
    const gaps = diagram.groups.flatMap((group) => {
      const own = spans.get(group.id);
      return own && group.gap !== undefined
        ? group.relations.flatMap((relation) => {
            const target = spans.get(relation.target);
            return target &&
              ((relation.kind === 'below' && own.minRow === row + 1) ||
                (relation.kind === 'above' && target.minRow === row + 1))
              ? [group.gap ?? 0]
              : [];
          })
        : [];
    });
    return Math.max(stacked ? FRAME_STACK_GAP : 0, ...gaps);
  };
  const colX = new Map<number, number>();
  for (let col = minCol, x = minCol * pitch.w; col <= maxCol; col++) {
    colX.set(col, x);
    x += pitch.w + extraAfterCol(col);
  }
  const rowY = new Map<number, number>();
  for (let row = minRow, y = minRow * pitch.h; row <= maxRow; row++) {
    rowY.set(row, y);
    y += pitch.h + extraAfterRow(row);
  }
  const at = (lookup: Map<number, number>, min: number, max: number, step: number, value: number) =>
    value < min
      ? (lookup.get(min) ?? 0) - (min - value) * step
      : value > max
        ? (lookup.get(max) ?? 0) + (value - max) * step
        : (lookup.get(value) ?? 0);
  const fractional =
    (lookup: Map<number, number>, min: number, max: number, step: number, size: number) => (value: number) => {
      const low = Math.floor(value);
      const ratio = value - low;
      const lowCentre = at(lookup, min, max, step, low) + size / 2;
      const highCentre = at(lookup, min, max, step, low + 1) + size / 2;
      return lowCentre + (highCentre - lowCentre) * ratio;
    };
  const cellX = fractional(colX, minCol, maxCol, pitch.w, box.w);
  const cellY = fractional(rowY, minRow, maxRow, pitch.h, box.h);

  const rects = new Map<string, Rect>();
  for (const node of diagram.nodes) {
    const cell = cells.get(node.id);
    if (!cell) {
      continue;
    }
    rects.set(
      node.id,
      node.pin?.kind === 'point'
        ? { x: node.pin.x, y: node.pin.y, w: box.w, h: box.h }
        : { x: cellX(cell.col) - box.w / 2, y: cellY(cell.row) - box.h / 2, w: box.w, h: box.h },
    );
  }
  const frames = new Map<string, Rect>();
  for (const group of diagram.groups) {
    const members = diagram.nodes.filter((node) => node.group === group.id).flatMap((node) => rects.get(node.id) ?? []);
    if (members.length === 0) {
      continue;
    }
    const x = Math.min(...members.map((rect) => rect.x)) - FRAME_PAD;
    const y = Math.min(...members.map((rect) => rect.y)) - FRAME_PAD - FRAME_LABEL_H;
    const right = Math.max(...members.map((rect) => rect.x + rect.w)) + FRAME_PAD;
    const bottom = Math.max(...members.map((rect) => rect.y + rect.h)) + FRAME_PAD;
    frames.set(group.id, { x, y, w: right - x, h: bottom - y });
  }

  const channels = (low: number, high: number, centre: (value: number) => number) =>
    Array.from({ length: high - low + 2 }, (_, index) => Math.round(centre(low - 0.5 + index)));
  const titles = diagram.groups.flatMap((group) => {
    const frame = frames.get(group.id);
    return frame && group.label.trim()
      ? [
          {
            x: frame.x + FRAME_PAD / 2,
            y: frame.y + (FRAME_LABEL_H - LABEL_FONT.lineH) / 2,
            w: group.label.length * LABEL_FONT.charW,
            h: LABEL_FONT.lineH,
          },
        ]
      : [];
  });
  const extent = [...rects.values(), ...frames.values()];
  const bounds = {
    x: Math.min(...extent.map((rect) => rect.x)),
    y: Math.min(...extent.map((rect) => rect.y)),
    w: Math.max(...extent.map((rect) => rect.x + rect.w)) - Math.min(...extent.map((rect) => rect.x)),
    h: Math.max(...extent.map((rect) => rect.y + rect.h)) - Math.min(...extent.map((rect) => rect.y)),
  };
  return {
    box,
    pitch,
    rects,
    frames,
    cellX,
    cellY,
    bounds,
    context: {
      obstacles: [...rects.values()],
      avoid: titles,
      channels: { xs: channels(minCol, maxCol, cellX), ys: channels(minRow, maxRow, cellY) },
    },
  };
};

const OPPOSITE: Record<Semantic.Side, Semantic.Side> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };

/** The side of the hub every spoke lies wholly beyond, if there is one. */
const facingSide = (hub: Rect | undefined, spokes: readonly (Rect | undefined)[]): Semantic.Side | undefined => {
  if (!hub) {
    return undefined;
  }
  const placed = spokes.flatMap((rect) => (rect ? [rect] : []));
  const beyond: Record<Semantic.Side, (rect: Rect) => boolean> = {
    bottom: (rect) => rect.y >= hub.y + hub.h,
    top: (rect) => rect.y + rect.h <= hub.y,
    right: (rect) => rect.x >= hub.x + hub.w,
    left: (rect) => rect.x + rect.w <= hub.x,
  };
  return placed.length < 2 ? undefined : Semantic.SIDES.find((side) => placed.every(beyond[side]));
};

/** Routes every edge and bus over a placement and emits the scene. */
const draw = (diagram: Semantic.Diagram, geometry: Geometry): { commands: Scene.Command[]; forced: string[] } => {
  const { rects, frames, context } = geometry;
  const grouped = Semantic.buses(diagram);
  const facing = new Map(
    grouped.buses.flatMap((bus) => {
      const side = bus.implicit
        ? facingSide(
            rects.get(bus.hub.node),
            bus.edges.map((edge) => rects.get(edge.from.node)),
          )
        : undefined;
      return side ? [[bus, side] as const] : [];
    }),
  );
  // An implicit trunk only reads as one when every subtype sits on the same side of the abstraction.
  const buses = grouped.buses.filter((bus) => !bus.implicit || facing.has(bus));
  const single = [
    ...grouped.single,
    ...grouped.buses.filter((bus) => !buses.includes(bus)).flatMap((bus) => bus.edges),
  ];
  const endOf = (end: Semantic.End, sides?: readonly Semantic.Side[]): Route.End | undefined => {
    const rect = rects.get(end.node);
    return rect ? { rect, node: end.node, sides: sides ?? end.sides ?? Semantic.SIDES } : undefined;
  };
  const waypoint = (point: Semantic.Waypoint): Route.Waypoint => ({
    ...(point.x === undefined ? {} : { x: point.unit === 'cell' ? geometry.cellX(point.x) : point.x }),
    ...(point.y === undefined ? {} : { y: point.unit === 'cell' ? geometry.cellY(point.y) : point.y }),
  });
  const pieces = single.flatMap((edge): Route.Piece[] => {
    const start = endOf(edge.from);
    const end = endOf(edge.to);
    return start && end
      ? [
          {
            id: edge.id,
            start,
            end,
            via: edge.via.map(waypoint),
            points: [],
            significance: Semantic.significance(edge.relation, edge.stroke),
          },
        ]
      : [];
  });
  const requests = buses.flatMap((bus): Route.BusRequest[] => {
    const side = facing.get(bus);
    const hub = endOf(bus.hub, side && [side]);
    const spokes = bus.edges.flatMap((edge) => {
      const end = endOf(bus.direction === 'out' ? edge.to : edge.from, side && [OPPOSITE[side]]);
      return end ? [{ id: edge.id, end }] : [];
    });
    const significance = Math.max(...bus.edges.map((edge) => Semantic.significance(edge.relation, edge.stroke)));
    return hub && spokes.length > 0 ? [{ id: bus.id, hub, spokes, direction: bus.direction, significance }] : [];
  });

  const first = Route.routeAll(pieces, requests, context);
  const spread = Route.reroute(Route.spreadPorts(first), first, context);
  const routed = Route.separate(spread, context);

  // Scene: frames first so they paint under everything, then boxes, then one object of connectors.
  const commands: Scene.Command[] = [];
  const origin = diagram.origin;
  const place = (rect: Rect): Scene.Point => ({ x: origin.x + rect.x, y: origin.y + rect.y });
  diagram.groups.forEach((group, index) => {
    const frame = frames.get(group.id);
    if (!frame) {
      return;
    }
    commands.push({
      op: 'upsert-object',
      object: {
        id: group.id,
        origin: place(frame),
        scale: 1,
        elements: [
          {
            kind: 'rect',
            id: 'frame',
            x: 0,
            y: 0,
            w: frame.w,
            h: frame.h,
            stroke: 'dashed',
            fill: 'tint',
            color: group.color ?? GROUP_COLORS[index % GROUP_COLORS.length],
          },
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
  });
  for (const node of diagram.nodes) {
    const rect = rects.get(node.id);
    if (!rect) {
      continue;
    }
    commands.push({
      op: 'upsert-object',
      object: {
        id: node.id,
        origin: place(rect),
        scale: 1,
        ...(node.ref ? { ref: node.ref } : {}),
        elements: [
          {
            kind: node.shape ?? 'rect',
            id: 'box',
            x: 0,
            y: 0,
            w: rect.w,
            h: rect.h,
            text: node.label,
            ...(node.color ? { color: node.color } : {}),
            ...(node.fill ? { fill: node.fill } : {}),
            ...(node.stroke ? { stroke: node.stroke } : {}),
          },
        ],
      },
    });
  }
  if (routed.length === 0) {
    return { commands, forced: [] };
  }

  const edges = new Map(diagram.edges.map((edge) => [edge.id, edge]));
  const elements: Scene.Element[] = [];
  const labels: Route.LabelRequest[] = [];
  const relative = (point: Scene.Point): Scene.Point => ({ x: point.x, y: point.y });
  for (const piece of routed) {
    const [busId, part] = piece.bus !== undefined ? piece.id.split('#') : [undefined, piece.id];
    const edge = edges.get(part);
    const bus = buses.find((entry) => entry.id === busId);
    const points = piece.points.map(relative);
    if (points.length < 2) {
      continue;
    }
    const style = edge ?? bus?.edges[0];
    const markers = Scene.markersOf(style ?? {});
    const stroke = style?.stroke ? { stroke: style.stroke } : markers.dashed ? { stroke: 'dashed' as const } : {};
    const color = style?.color ? { color: style.color } : {};
    // A bus draws its arrowheads where the bus ends: on each spoke going out, on the trunk coming in.
    const headed = bus ? (bus.direction === 'out' ? part !== 'trunk' : part === 'trunk') : true;
    const id = bus && part === 'trunk' ? `${bus.id}-trunk` : part;
    if (!headed) {
      elements.push({ kind: 'line', id, points, ...stroke, ...color });
    } else {
      if (points.length > 2) {
        elements.push({ kind: 'line', id: `${id}-path`, points: points.slice(0, -1), ...stroke, ...color });
      }
      const tail = style?.tail;
      elements.push({
        kind: 'arrow',
        id,
        start: points[points.length - 2],
        end: points[points.length - 1],
        ...(style?.relation ? { relation: style.relation } : {}),
        ...(style?.head ? { head: style.head } : {}),
        ...(tail ? { tail } : {}),
        ...stroke,
        ...color,
      });
    }
    const text = bus ? (part === 'trunk' ? bus.label : edge?.label) : edge?.label;
    if (text) {
      // A spoke's label may also sit on the trunk it shares, read as the trunk's fork toward it.
      const trunk =
        bus && part !== 'trunk' ? routed.find((other) => other.id === `${bus.id}#trunk`)?.points : undefined;
      labels.push({
        id,
        text,
        points: trunk ? (bus?.direction === 'out' ? [...trunk, ...points] : [...points, ...trunk]) : points,
      });
    }
  }
  const paths = routed.map((piece) => piece.points);
  elements.push(...Route.placeLabels(labels, paths, [...rects.values()], context.avoid, geometry.bounds));
  commands.push({
    op: 'upsert-object',
    object: { id: Semantic.CONNECTORS, origin: { ...origin }, scale: 1, elements },
  });
  const forced = routed
    .filter((piece) => piece.forced)
    .map((piece) => (piece.bus !== undefined ? piece.id.split('#')[1] : piece.id));
  return { commands, forced };
};

const objectsOf = (commands: readonly Scene.Command[]): Scene.WorldObject[] =>
  commands.flatMap((command) => (command.op === 'upsert-object' ? [command.object] : []));

/** Pins that conflict with one another or with a hard relation between pinned nodes; reported and dropped. */
const checkPins = (
  diagram: Semantic.Diagram,
  pitch: Semantic.Size,
  issues: Semantic.Issue[],
): Map<string, Place.Cell> => {
  const pins = new Map<string, Place.Cell>();
  const taken = new Map<string, string>();
  for (const node of diagram.nodes) {
    if (!node.pin) {
      continue;
    }
    const cell =
      node.pin.kind === 'cell'
        ? { col: node.pin.col, row: node.pin.row }
        : { col: Math.round(node.pin.x / pitch.w), row: Math.round(node.pin.y / pitch.h) };
    const key = `${cell.col}:${cell.row}`;
    const holder = taken.get(key);
    if (holder !== undefined) {
      issues.push({
        severity: 'warning',
        message: `"${node.id}" is pinned to the cell "${holder}" already holds; its pin is ignored.`,
        ...node.pin.range,
      });
      continue;
    }
    taken.set(key, node.id);
    pins.set(node.id, cell);
  }
  return pins;
};

const DESCRIBE: Record<Semantic.RelationKind, string> = {
  'right-of': 'right of',
  'left-of': 'left of',
  'above': 'above',
  'below': 'below',
  'same-row': 'in the same row as',
  'same-col': 'in the same column as',
};

/** A hard relation between two pinned nodes is decided by the pins; when they disagree the relation goes. */
const checkRelations = (
  diagram: Semantic.Diagram,
  pins: Map<string, Place.Cell>,
  issues: Semantic.Issue[],
): Semantic.Diagram => ({
  ...diagram,
  nodes: diagram.nodes.map((node) => ({
    ...node,
    relations: node.relations.filter((relation) => {
      const from = pins.get(node.id);
      const target = pins.get(relation.target);
      if (relation.soft || !from || !target) {
        return true;
      }
      const ok =
        Place.unmet(
          {
            nodes: [
              { id: node.id, pin: from },
              { id: relation.target, pin: target },
            ],
            groups: [],
            relations: [{ from: node.id, kind: relation.kind, target: relation.target, soft: false }],
            groupRelations: [],
            edges: [],
            flow: diagram.flow,
          },
          new Map([
            [node.id, from],
            [relation.target, target],
          ]),
        ).relations.length === 0;
      if (!ok) {
        issues.push({
          severity: 'warning',
          message: `"${node.id}" cannot be ${DESCRIBE[relation.kind]} "${relation.target}": both are pinned elsewhere. The relation is ignored.`,
          ...relation.range,
        });
      }
      return ok;
    }),
  })),
});

const sizesOf = (diagram: Semantic.Diagram) => {
  const box = diagram.box ?? measureBox(diagram.nodes.map((node) => node.label));
  return { box, pitch: diagram.grid ?? pitchFor(box) };
};

type Prepared = {
  diagram: Semantic.Diagram;
  input: Place.PlaceInput;
  box: Semantic.Size;
  pitch: Semantic.Size;
  issues: Semantic.Issue[];
};

const prepare = (source: Semantic.Diagram): Prepared => {
  const issues: Semantic.Issue[] = [];
  const { box, pitch } = sizesOf(source);
  const pins = checkPins(source, pitch, issues);
  const diagram = checkRelations(source, pins, issues);
  const { relations, groupRelations } = relationsOf(diagram);
  const input: Place.PlaceInput = {
    nodes: diagram.nodes.map((node) => ({ id: node.id, group: node.group, pin: pins.get(node.id) })),
    groups: diagram.groups.map((group) => group.id),
    // Appended after the stated relations, whose positions `unmetIssues` maps back to their source.
    relations: [...relations, ...siblingRelations(diagram)],
    groupRelations,
    edges: diagram.edges.map((edge) => ({
      from: edge.from.node,
      to: edge.to.node,
      upward: Semantic.pointsUp(edge.relation),
      sides: { start: edge.from.sides, end: edge.to.sides },
    })),
    flow: diagram.flow,
    box: { x: box.w / pitch.w / 2, y: box.h / pitch.h / 2 },
  };
  return { diagram, input, box, pitch, issues };
};

/** Relations the chosen layout breaks, as warnings on the relation's own source. */
const unmetIssues = (prepared: Prepared, cells: Map<string, Place.Cell>): Semantic.Issue[] => {
  const unmet = Place.unmet(prepared.input, cells);
  const nodeRelations = prepared.diagram.nodes.flatMap((node) =>
    node.relations.map((relation) => ({ owner: node.id, relation })),
  );
  const groupRelations = prepared.diagram.groups.flatMap((group) =>
    group.relations.map((relation) => ({ owner: group.id, relation })),
  );
  return [
    ...unmet.relations.map((position) => nodeRelations[position]),
    ...unmet.groupRelations.map((position) => groupRelations[position]),
  ].flatMap((entry) =>
    entry
      ? [
          {
            severity: 'warning' as const,
            message: `Could not place "${entry.owner}" ${DESCRIBE[entry.relation.kind]} "${entry.relation.target}" together with the other constraints; it was relaxed.`,
            ...entry.relation.range,
          },
        ]
      : [],
  );
};

const DEFAULT_OBJECTIVE = Appeal.objective(Objective.DEFAULT);

type Candidate = {
  commands: Scene.Command[];
  cells?: Map<string, Place.Cell>;
  /** Edges the router could not draw as asked. */
  forced: readonly string[];
  layout: Objective.Layout;
};

const candidateOf = (
  commands: Scene.Command[],
  cells?: Map<string, Place.Cell>,
  forced: readonly string[] = [],
): Candidate => {
  const objects = objectsOf(commands);
  return { commands, cells, forced, layout: { objects, report: Diagnostics.analyze(objects) } };
};

/** Lays out a semantic diagram synchronously with the grid search alone. */
export const solve = (source: Semantic.Diagram, options: SolveOptions = {}): Solution => {
  const prepared = prepare(source);
  const { diagram, input, box, pitch, issues } = prepared;
  if (diagram.nodes.length === 0) {
    return { commands: [], issues, report: Diagnostics.analyze([]) };
  }
  const placed = Place.place(input, { restarts: options.restarts ?? 6, seeds: options.seeds ?? [], keep: 3 });
  const candidates = [
    ...placed.map(({ cells }) => {
      const drawn = draw(diagram, geometry(diagram, cells, box, pitch));
      return candidateOf(drawn.commands, cells, drawn.forced);
    }),
    ...(options.alternatives ?? []).map((commands) => candidateOf(commands)),
  ];
  const { chosen } = Objective.select(options.objective ?? DEFAULT_OBJECTIVE, candidates);
  const cells = chosen.candidate.cells;
  return {
    commands: chosen.candidate.commands,
    issues: [
      ...issues,
      ...(cells ? unmetIssues(prepared, cells) : []),
      ...chosen.candidate.forced.flatMap((id) => {
        const edge = diagram.edges.find((entry) => entry.id === id);
        return edge
          ? [
              {
                severity: 'warning' as const,
                message: `No route fits the sides and waypoints given for ${edge.from.node} -> ${edge.to.node}; it was routed freely.`,
                ...edge.range,
              },
            ]
          : [];
      }),
    ],
    report: chosen.candidate.layout.report,
  };
};

/** Cells of each node in an emitted layout, by rank of its distinct x and y. */
const cellsOf = (commands: readonly Scene.Command[], ids: ReadonlySet<string>): Map<string, Place.Cell> => {
  const origins = objectsOf(commands).flatMap((object) =>
    ids.has(object.id) && object.origin ? [{ id: object.id, origin: object.origin }] : [],
  );
  const xs = [...new Set(origins.map(({ origin }) => origin.x))].sort((left, right) => left - right);
  const ys = [...new Set(origins.map(({ origin }) => origin.y))].sort((left, right) => left - right);
  return new Map(origins.map(({ id, origin }) => [id, { col: xs.indexOf(origin.x), row: ys.indexOf(origin.y) }]));
};

/** The mermaid engine's output restyled with the diagram's node and edge styles, which mermaid cannot carry. */
const restyle = (diagram: Semantic.Diagram, commands: readonly Scene.Command[]): Scene.Command[] => {
  const nodes = new Map(diagram.nodes.map((node) => [node.id, node]));
  const edges = new Map(diagram.edges.map((edge) => [edge.id, edge]));
  return commands.map((command): Scene.Command => {
    if (command.op !== 'upsert-object') {
      return command;
    }
    const node = nodes.get(command.object.id);
    const elements = command.object.elements.map((element): Scene.Element => {
      if (node && element.kind === 'rect' && element.id === 'box') {
        return {
          ...element,
          kind: node.shape ?? 'rect',
          ...(node.color ? { color: node.color } : {}),
          ...(node.fill ? { fill: node.fill } : {}),
          ...(node.stroke ? { stroke: node.stroke } : {}),
        };
      }
      const edge = command.object.id === Semantic.CONNECTORS ? edges.get(element.id.replace(/-path$/, '')) : undefined;
      if (edge && element.kind === 'arrow') {
        return {
          ...element,
          ...(edge.relation ? { relation: edge.relation } : {}),
          ...(edge.head ? { head: edge.head } : {}),
          ...(edge.stroke ? { stroke: edge.stroke } : {}),
          ...(edge.color ? { color: edge.color } : {}),
        };
      }
      if (edge && element.kind === 'line') {
        return {
          ...element,
          ...(edge.stroke ? { stroke: edge.stroke } : {}),
          ...(edge.color ? { color: edge.color } : {}),
        };
      }
      return element;
    });
    return { ...command, object: { ...command.object, elements } };
  });
};

/**
 * Lays out a semantic diagram, also trying the mermaid engine's search when nothing was hinted:
 * its placements seed the grid search and its own layout competes as a candidate. Async because
 * ELK is; an engine failure only removes those candidates.
 */
export const compile = async (source: Semantic.Diagram, options: SolveOptions = {}): Promise<Solution> => {
  const mermaid = source.hinted || source.nodes.length < 2 ? undefined : Semantic.toMermaid(source);
  if (!mermaid) {
    return solve(source, options);
  }
  const result = await MermaidEngine.layout(mermaid, { origin: source.origin }).catch(() => undefined);
  if (!result) {
    return solve(source, options);
  }
  const ids = new Set(source.nodes.map((node) => node.id));
  const seeds = result.ranked.slice(0, 4).map((entry) => cellsOf(entry.candidate.commands, ids));
  return solve(source, {
    ...options,
    seeds: [...(options.seeds ?? []), ...seeds],
    alternatives: [...(options.alternatives ?? []), restyle(source, result.commands)],
  });
};
