//
// Copyright 2026 DXOS.org
//

//
// The studio deck's graph slides (`studio/assets/deck/canvas`) on a canvas: the `.diagram` file is the scene, parsed
// by `@dxos/diagram` and applied through the illustrator bridge, and the `.json` sidecar carries everything the DSL
// has no word for — a card's icon and tone, a connector's waypoints, a text's role. Keeping the two apart is the
// point of the spike: what the loader has to reach into the sidecar for is exactly what the DSL lacks.
//

import * as Schema from 'effect/Schema';

import { type ContentMap, Dsl, type Scene, applyCommands } from '@dxos/diagram';
import { invariant } from '@dxos/invariant';
import { type NodeBase, endpointNode } from '@dxos/scene';

import { isLinkRecord, isNodeRecord, nodeKey } from '../../model/content.ts';
import { SceneHandler, elementId } from '../../model/handler.ts';

const Point = Schema.Struct({ x: Schema.Number, y: Schema.Number });

/** A row of `n` small blocks, some of them marked in a tone; the deck's `feedStrip()`. */
export const StudioFeed = Schema.Struct({
  n: Schema.Number,
  /** Block indexes (as strings, since JSON object keys are) to colour, by tone name. */
  marks: Schema.optional(Schema.Record(Schema.String, Schema.String)),
  /** A mono caption to the left of the strip (`feed`, `task`). */
  label: Schema.optional(Schema.String),
});
export type StudioFeed = Schema.Schema.Type<typeof StudioFeed>;

/** A card of the deck: a Phosphor icon, a title, its centre in slide units, and an optional accent. */
export const StudioCard = Schema.Struct({
  icon: Schema.String,
  title: Schema.String,
  cx: Schema.Number,
  cy: Schema.Number,
  w: Schema.optional(Schema.Number),
  h: Schema.optional(Schema.Number),
  /** A CSS custom property of the deck (`var(--t-trip)`), or a tone name (`ink`), resolved through {@link TONES}. */
  tone: Schema.optional(Schema.String),
  /** The element kind the card wants; absent is the plain `card` of round 1. */
  kind: Schema.optional(Schema.String),
  /** Round 2 (`feed-card`): the feed strip, a sentence of body, and a mono footer under a hairline. */
  feed: Schema.optional(StudioFeed),
  body: Schema.optional(Schema.String),
  footer: Schema.optional(Schema.String),
});
export type StudioCard = Schema.Schema.Type<typeof StudioCard>;

/** How a link is routed, where the deck does not draw it straight. */
export const StudioRoute = Schema.Struct({
  /** Waypoints the route passes through, in slide units. */
  via: Schema.optional(Schema.Array(Point)),
  /** An orthogonal route: horizontal then vertical, or the other way about. */
  elbow: Schema.optional(Schema.Literals(['hv', 'vh'])),
  /** A single-bend route, the bend this far off the midpoint. */
  bend: Schema.optional(Schema.Number),
  dash: Schema.optional(Schema.Boolean),
  /** Where the caption sits, when the route moves it off the midpoint. */
  labelAt: Schema.optional(Point),
  /** A named route the deck draws rather than a polyline: `curve-h` is its horizontal S-curve. */
  route: Schema.optional(Schema.String),
  /** A tone name for the stroke (`accent`). */
  color: Schema.optional(Schema.String),
  /** `none` where the link has no arrowhead (a reader's tap into a space). */
  arrow: Schema.optional(Schema.String),
  halo: Schema.optional(Schema.Boolean),
  width: Schema.optional(Schema.Number),
  /** A link that ends *inside* a component: the graph objects it reaches, and where it aims. */
  tap: Schema.optional(Schema.Struct({ nodes: Schema.Array(Schema.Number), toward: Point })),
});
export type StudioRoute = Schema.Schema.Type<typeof StudioRoute>;

/** `[from, to]`, `[from, to, label]` or `[from, to, label, route]`, as `export.mjs` writes an edge. */
export const StudioEdge = Schema.Union([
  Schema.Tuple([Schema.String, Schema.String, Schema.String, StudioRoute]),
  Schema.Tuple([Schema.String, Schema.String, Schema.String]),
  Schema.Tuple([Schema.String, Schema.String]),
]);
export type StudioEdge = Schema.Schema.Type<typeof StudioEdge>;

export const StudioText = Schema.Struct({
  id: Schema.String,
  x: Schema.Number,
  y: Schema.Number,
  text: Schema.String,
  role: Schema.Literals(['heading', 'caption', 'label', 'link-label', 'note']),
  /** The width the deck lays the text out in; with `align`, how it sits in it. */
  w: Schema.optional(Schema.Number),
  align: Schema.optional(Schema.Literals(['left', 'center', 'right'])),
  /** For a `link-label`: the links it captions. */
  for: Schema.optional(Schema.Array(Schema.String)),
});
export type StudioText = Schema.Schema.Type<typeof StudioText>;

export const StudioFrame = Schema.Struct({
  id: Schema.String,
  x: Schema.Number,
  y: Schema.Number,
  w: Schema.Number,
  h: Schema.Number,
  label: Schema.optional(Schema.String),
});
export type StudioFrame = Schema.Schema.Type<typeof StudioFrame>;

/** A generated part of the slide: a circle of ECHO objects, placed by its frame and driven by `params`. */
export const StudioComponent = Schema.Struct({
  id: Schema.String,
  kind: Schema.String,
  cx: Schema.Number,
  cy: Schema.Number,
  r: Schema.Number,
  params: Schema.Record(Schema.String, Schema.Any),
  /** Graph objects drawn lit, by index, with the tone they take. */
  lit: Schema.optional(Schema.Record(Schema.String, Schema.String)),
});
export type StudioComponent = Schema.Schema.Type<typeof StudioComponent>;

/** A slide as `export.mjs` writes it: the whole model, of which the `.diagram` file is the expressible part. */
export const StudioModel = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  subtitle: Schema.String,
  size: Schema.Struct({ w: Schema.Number, h: Schema.Number }),
  nodes: Schema.Record(Schema.String, StudioCard),
  edges: Schema.Array(StudioEdge),
  frames: Schema.Array(StudioFrame),
  texts: Schema.optional(Schema.Array(StudioText)),
  components: Schema.optional(Schema.Array(StudioComponent)),
});
export type StudioModel = Schema.Schema.Type<typeof StudioModel>;

/** Reads a sidecar, so a drifted export fails here rather than halfway through a drawing. */
export const parseStudioModel = (text: string): StudioModel => Schema.decodeUnknownSync(StudioModel)(JSON.parse(text));

/**
 * The deck's tone names, by the custom property its sidecar writes (`assets/deck/lib/deck.css`). A card's `tone` is
 * a name rather than a colour, so the field is a select and the value follows the mode.
 */
export const TONES: Record<string, string> = {
  'var(--t-event)': 'event',
  'var(--t-message)': 'message',
  'var(--t-file)': 'file',
  'var(--t-trip)': 'trip',
  'var(--t-sheet)': 'sheet',
};

/**
 * The DSL colour a sidecar tone names. `light-blue` rather than `blue`, which is a `Shape.Color` the SVG renderer's
 * `COLOR_CLASS` has no entry for: the strong colours (`blue`, `green`, `red`, `violet`) silently draw neutral.
 */
const LINK_COLORS: Record<string, 'light-blue' | 'grey'> = { accent: 'light-blue', ink: 'grey' };

/** The theme hue a sidecar tone names, for the canvas's own link renderer (which reads the link's `style`). */
const LINK_HUES: Record<string, string> = { accent: 'blue', ink: 'neutral' };

/** Text sizes in scene units by the role the sidecar gives a text; the DSL's only lever is `weight=s`. */
const TEXT_SIZES: Record<string, number> = { 'heading': 20, 'caption': 15, 'label': 19, 'link-label': 15, 'note': 15 };

/**
 * The slide's title block, which the drawing does not hold. The deck draws the title and subtitle on the slide
 * because the slide is one HTML page; in a deck of canvas drawings they belong to the presenter's own heading, and
 * a drawing that repeated them would be a second title inside the first. The sidecar keeps the text (`model.title`,
 * `model.subtitle`) for the heading to use.
 */
const TITLE_OBJECT = 'title';

/**
 * The indexes of a strip's filled blocks. The sidecar keys them by index with the tone each one takes, which is the
 * same tone on every slide; the element carries the indexes and takes the card's tone.
 */
const marksOf = (feed: StudioFeed): number[] =>
  Object.keys(feed.marks ?? {})
    .map(Number)
    .filter(Number.isInteger)
    .sort((left, right) => left - right);

/** The element id of a card's box, which is how the bridge keys its node (`<object>/box`). */
const boxOf = (key: string) => elementId(key, 'box');

/** A node's label, which only the box prototypes carry. */
const labelOf = (node: NodeBase): string | undefined =>
  'label' in node && typeof node.label === 'string' ? node.label : undefined;

/** A note's body, which is where the bridge puts a plain DSL `text`. */
const textOf = (node: NodeBase): string | undefined =>
  'text' in node && typeof node.text === 'string' ? node.text : undefined;

/**
 * Replaces the plain boxes the DSL produced with the card kind the sidecar names, taking everything the DSL could
 * not say with it: the icon and tone of a `card`, and the feed strip, body and footer of a `feed-card` as well.
 */
const promoteCards = (content: ContentMap, model: StudioModel): void => {
  for (const [key, card] of Object.entries(model.nodes)) {
    const record = content[nodeKey(boxOf(key))];
    invariant(isNodeRecord(record), `no node for card "${key}"`);
    const { style: _style, ...node } = record.node;
    content[nodeKey(boxOf(key))] = {
      ...record,
      node: {
        ...node,
        type: card.kind ?? 'card',
        label: labelOf(record.node) ?? card.title,
        icon: { type: card.icon },
        ...(card.tone ? { tone: TONES[card.tone] ?? card.tone } : {}),
        ...(card.feed ? { feed: card.feed.n, marks: marksOf(card.feed) } : {}),
        ...(card.feed?.label ? { feedLabel: card.feed.label } : {}),
        ...(card.body ? { body: card.body } : {}),
        ...(card.footer ? { footer: card.footer } : {}),
      },
    };
  }
};

/** The text width a label of this size needs, which the canvas does not measure for an unframed box. */
const textWidth = (label: string, fontSize: number) => label.length * fontSize * 0.62 + 16;

/**
 * Sizes the slide's text. The bridge turns a DSL `text` into a note (or, at `weight=s`, a small left-aligned label),
 * because the scene language has no notion of a heading: every size here comes from the sidecar's `role`.
 */
const styleText = (content: ContentMap, model: StudioModel): void => {
  for (const text of model.texts ?? []) {
    const id = elementId(text.id, 'label');
    const record = content[nodeKey(id)];
    if (!isNodeRecord(record)) {
      continue;
    }
    const fontSize = TEXT_SIZES[text.role];
    const { node } = record;
    // A note keeps its body in `text`; a label keeps it in `label`, which is what an unframed box draws.
    const label = labelOf(node) ?? textOf(node);
    const { text: _text, ...rest } = node;
    // The sidecar's `w` is the box the deck lays the text out in; without one the box is as wide as the text.
    const width = text.w ?? (label ? textWidth(label, fontSize) : node.size.width);
    const align = text.align ?? 'left';
    const height = fontSize * 1.9;
    content[nodeKey(id)] = {
      ...record,
      node: {
        ...rest,
        type: 'rect',
        label,
        center: { x: text.x + width / 2, y: text.y + height / 2 },
        size: { width, height },
        style: { fill: false, border: false, alignHorizontal: align, alignVertical: 'middle', fontSize },
      },
    };
  }
};

/**
 * Unfills a frame and moves its label out of it. A DSL frame can carry a label and the bridge brings it through, but
 * a box's label is drawn centred inside it, over whatever the frame contains; the deck sets its layer names beside
 * the frame instead, which is a placement the scene language has no way to state.
 */
/** How much empty room a frame has above the first card inside it. */
const clearance = (model: StudioModel, frame: StudioFrame): number => {
  const tops = Object.values(model.nodes)
    .filter((card) => {
      const [w, h] = [card.w ?? 0, card.h ?? 0];
      return (
        card.cx - w / 2 >= frame.x &&
        card.cx + w / 2 <= frame.x + frame.w &&
        card.cy - h / 2 >= frame.y &&
        card.cy + h / 2 <= frame.y + frame.h
      );
    })
    .map((card) => card.cy - (card.h ?? 0) / 2);
  return tops.length === 0 ? frame.h : Math.min(...tops) - frame.y;
};

const styleFrames = (content: ContentMap, model: StudioModel): void => {
  const fontSize = TEXT_SIZES.heading;
  for (const frame of model.frames) {
    const key = nodeKey(elementId(frame.id, 'frame'));
    const record = content[key];
    if (!isNodeRecord(record)) {
      continue;
    }
    // The deck's frame is an unfilled region. `color=grey` alone gives the canvas a filled neutral box, which on the
    // Agents slide paints over the generated space inside it; `fill=none` in the DSL would say this, and should.
    const { label: _label, ...node } = record.node;
    content[key] = { ...record, node: { ...node, style: { ...node.style, fill: false } } };
    if (!frame.label) {
      continue;
    }
    const width = textWidth(frame.label, fontSize);
    const height = fontSize * 1.9;
    // Where the label goes is the thing neither the DSL nor the sidecar says. The deck puts it inside the frame
    // when the frame has a margin at its top, and beside it when the content starts at the frame's own edge.
    const inside = clearance(model, frame) >= height + 8;
    const center = inside
      ? { x: frame.x + 24 + width / 2, y: frame.y + 10 + height / 2 }
      : { x: frame.x - 24 - width / 2, y: frame.y + frame.h / 2 };
    content[nodeKey(elementId(frame.id, 'title'))] = {
      kind: 'node',
      scene: record.scene,
      node: {
        type: 'rect',
        id: elementId(frame.id, 'title'),
        z: record.node.z,
        center,
        size: { width, height },
        label: frame.label,
        style: {
          fill: false,
          border: false,
          alignHorizontal: inside ? 'left' : 'right',
          alignVertical: 'middle',
          fontSize,
        },
      },
    };
  }
};

/**
 * The content key of the link between two cards. An arrow's node id is its enclosing object's and its own
 * (`links/task-spec`), so the edge is found by the ends it binds rather than by a key spelled out here.
 */
export const findLink = (content: ContentMap, from: string, to: string): string | undefined =>
  Object.keys(content).find((key) => {
    const record = content[key];
    return (
      isLinkRecord(record) &&
      endpointNode(record.link.source) === boxOf(from) &&
      endpointNode(record.link.target) === boxOf(to)
    );
  });

/** The link out of a card's box, whatever element it lands on: a tap ends on a component's `ring`, not a `box`. */
const findLinkFrom = (content: ContentMap, from: string): string | undefined =>
  Object.keys(content).find((key) => {
    const record = content[key];
    return isLinkRecord(record) && endpointNode(record.link.source) === boxOf(from);
  });

/** A point as the loader passes it about; `Point` is already the sidecar's schema above. */
type Vec = { x: number; y: number };

type Frame = { center: Vec; size: { width: number; height: number } };

/** The frame of a card's node, once the bridge has placed it. */
const frameOf = (content: ContentMap, key: string): Frame | undefined => {
  const record = content[nodeKey(boxOf(key))];
  return isNodeRecord(record) ? { center: record.node.center, size: record.node.size } : undefined;
};

/**
 * Where an orthogonal route meets a card: the point on the frame's outline toward the neighbouring waypoint.
 * `diagramRoute` only takes a stored route whose two ends sit on the nodes' outlines (`ROUTE_SLACK`); a route of
 * bare waypoints is discarded and the connector re-routed, so the ends have to be computed rather than guessed.
 */
const attach = (frame: Frame, toward: Vec): Vec => {
  const { center, size } = frame;
  const [halfWidth, halfHeight] = [size.width / 2, size.height / 2];
  return Math.abs(toward.y - center.y) <= halfHeight
    ? { x: center.x + (toward.x >= center.x ? halfWidth : -halfWidth), y: center.y }
    : { x: center.x, y: center.y + (toward.y >= center.y ? halfHeight : -halfHeight) };
};

/** How many segments a curve is sampled into; a connector's route is a polyline, so the curve has to be flattened. */
const CURVE_STEPS = 24;

/**
 * The deck's horizontal S-curve, sampled. `path.curve` in `lib/components.mjs` is a cubic whose handles leave each
 * end horizontally; `connector.route` is a polyline, so the curve is flattened here — a scene connector has no curve
 * of its own, and a `spline` link's control points are not the same shape.
 */
const curveBetween = (from: Vec, to: Vec): Vec[] => {
  const dx = Math.max(40, Math.abs(to.x - from.x) * 0.5) * Math.sign(to.x - from.x || 1);
  const controls = [from, { x: from.x + dx, y: from.y }, { x: to.x - dx, y: to.y }, to];
  return Array.from({ length: CURVE_STEPS + 1 }, (_, step) => {
    const t = step / CURVE_STEPS;
    const u = 1 - t;
    return {
      x:
        u ** 3 * controls[0].x + 3 * u * u * t * controls[1].x + 3 * u * t * t * controls[2].x + t ** 3 * controls[3].x,
      y:
        u ** 3 * controls[0].y + 3 * u * u * t * controls[1].y + 3 * u * t * t * controls[2].y + t ** 3 * controls[3].y,
    };
  });
};

/** The side midpoints an S-curve leaves from and arrives at: the deck draws these links edge to edge, horizontally. */
const sides = (source: Frame, target: Frame): [Vec, Vec] => {
  const forward = target.center.x >= source.center.x;
  return [
    { x: source.center.x + (forward ? 1 : -1) * (source.size.width / 2), y: source.center.y },
    { x: target.center.x - (forward ? 1 : -1) * (target.size.width / 2), y: target.center.y },
  ];
};

/** The waypoints of a route, including the elbow the sidecar states as a direction rather than a point. */
const waypointsOf = (route: StudioRoute, source: Frame, target: Frame): Vec[] => {
  if (route.via?.length) {
    return [...route.via];
  }
  if (route.route === 'curve-h') {
    const [from, to] = sides(source, target);
    // The ends are the attachment points, so only what lies between them is a waypoint.
    return curveBetween(from, to).slice(1, -1);
  }
  switch (route.elbow) {
    case 'hv':
      return [{ x: target.center.x, y: source.center.y }];
    case 'vh':
      return [{ x: source.center.x, y: target.center.y }];
    default:
      return [];
  }
};

/**
 * Puts the sidecar's routes back on the links. The DSL arrow has two ends and nothing in between, so the deck's
 * routes survive the export only as `# route=` comments, which the parser drops. The scene model does carry them —
 * `connector.route` on a link whose ends stay bound to their nodes — so this is a DSL gap, not a canvas one.
 */
const routeLinks = (content: ContentMap, model: StudioModel, components: ComponentMode): number => {
  let routed = 0;
  for (const edge of model.edges) {
    const route = edge.length === 4 ? edge[3] : undefined;
    const [source, target] = [frameOf(content, edge[0]), frameOf(content, edge[1])];
    if (!route || !source || !target) {
      continue;
    }
    // A tap ends *inside* a component, which no canvas link can do (a `Port` sits on a side of a frame, so there is
    // no port at an interior point). The link is kept and routed to the circle; the component kind draws the leg
    // from there to the object it reaches. A `Generator` cannot be linked to at all, so `components: 'generator'`
    // drops the link and the generator draws the whole run.
    if (route.tap) {
      if (components === 'generator') {
        const tap = findLinkFrom(content, edge[0]);
        if (tap !== undefined) {
          delete content[tap];
        }
        continue;
      }
    }
    const waypoints = waypointsOf(route, source, target);
    if (waypoints.length === 0) {
      continue;
    }
    const key = findLink(content, edge[0], edge[1]);
    const record = key === undefined ? undefined : content[key];
    if (key === undefined || !isLinkRecord(record)) {
      continue;
    }
    content[key] = {
      ...record,
      link: {
        ...record.link,
        // The link's own style is what the canvas's link renderer reads; `connector` below supplies the geometry.
        ...(route.color ? { style: { ...record.link.style, hue: LINK_HUES[route.color] ?? 'blue' } } : {}),
        connector: {
          ...record.link.connector,
          // A connector draws through the diagram renderer, which reads its stroke and colour here rather than from
          // the link's own `style`, so a dashed accent link would go solid and grey the moment it is routed.
          ...(route.dash || record.link.style?.lineStyle === 'dashed' ? { stroke: 'dashed' } : {}),
          ...(route.color ? { color: LINK_COLORS[route.color] ?? 'blue' } : {}),
          // A link's marker vocabulary is wider than a connector's head, so only the two they share carry over.
          ...(record.link.ends?.end === 'arrow' || record.link.ends?.end === 'triangle'
            ? { head: record.link.ends.end }
            : {}),
          route: [attach(source, waypoints[0]), ...waypoints, attach(target, waypoints[waypoints.length - 1])],
          ...(route.labelAt ? { caption: { x: route.labelAt.x, y: route.labelAt.y } } : {}),
        },
      },
    };
    routed++;
  }
  return routed;
};

/**
 * Replaces a component's placeholder with a generator node bound to its readers. The DSL says a component is an
 * `ellipse ring` with `component=<kind>` in a comment, which the parser drops; the canvas has a node type for it
 * (`generator`), so the shape stands in for one until the loader swaps it.
 *
 * `generators` maps a component kind to the reference of a `Generator` object in the space. With none, the ring is
 * left as it parsed, which is how the drawing reads where the generator is not there.
 */
/** The cards that tap a component, in the order the sidecar gives them: each one is aimed by its index. */
const readersOf = (model: StudioModel, component: string): string[] =>
  model.edges.flatMap((edge) => (edge.length === 4 && edge[1] === component && edge[3].tap ? [boxOf(edge[0])] : []));

const placeGenerators = (content: ContentMap, model: StudioModel, generators: Generators): number => {
  let placed = 0;
  for (const component of model.components ?? []) {
    const generator = generators[component.kind];
    const key = nodeKey(elementId(component.id, 'ring'));
    const record = content[key];
    if (!generator || !isNodeRecord(record)) {
      continue;
    }
    const readers = readersOf(model, component.id);
    content[key] = {
      ...record,
      node: {
        type: 'generator',
        id: record.node.id,
        z: record.node.z,
        center: { x: component.cx, y: component.cy },
        size: { width: component.r * 2, height: component.r * 2 },
        generator: generator.reference,
        params: { ...component.params, ...generator.params, readers },
      },
    };
    placed++;
  }
  return placed;
};

/** A `Generator` object in the space, by the component kind it draws. */
export type Generators = Record<string, { reference: string; params?: Record<string, unknown> }>;

/**
 * Replaces a component's placeholder with an element of its own kind, whose fields are its configuration: the
 * Properties panel edits the seed, the density and the readers, and the view reads its readers out of the scene by
 * id. The alternative is {@link placeGenerators}, which puts the same geometry in a `Generator` instead.
 */
const placeComponentKinds = (content: ContentMap, model: StudioModel, kinds: ReadonlySet<string>): number => {
  let placed = 0;
  for (const component of model.components ?? []) {
    const key = nodeKey(elementId(component.id, 'ring'));
    const record = content[key];
    if (!kinds.has(component.kind) || !isNodeRecord(record)) {
      continue;
    }
    const { pitch, fill, extra, size, seed } = component.params;
    content[key] = {
      ...record,
      node: {
        type: component.kind,
        id: record.node.id,
        z: record.node.z,
        center: { x: component.cx, y: component.cy },
        size: { width: component.r * 2, height: component.r * 2 },
        ...(typeof seed === 'number' ? { seed } : { seed: 0 }),
        ...(typeof pitch === 'number' ? { pitch } : {}),
        ...(typeof fill === 'number' ? { fill } : {}),
        ...(typeof extra === 'number' ? { extra } : {}),
        ...(typeof size === 'number' ? { objectSize: size } : {}),
        hue: 'neutral',
      },
    };
    placed++;
  }
  return placed;
};

/**
 * The canvas settings a deck slide wants: the Neu style set on the Neu ground, which is the look `deck.css` calls
 * the "Studio soft theme". No `theme` id, so the canvas follows the app's mode; a story pins one with `theme`
 * (`neu-light` / `neu-dark`) when it wants a drawing in a mode of its own.
 */
/**
 * The pitch the studio drawings sit on. The deck was laid out by eye — the coordinates of a slide share no common
 * factor, so no scale puts it on a grid and the drawing has to take the pitch its own numbers are nearest. Measured
 * over the four slides' edges, 8 moves the average edge 1.6–2.4px and none more than 4, and an 8px cell is drawn
 * (so snapped to) at any zoom above 0.75, which a slide is read at. A slide that a snap breaks takes its own pitch
 * rather than being hand-placed: that is what the layout's `grid` is for.
 */
export const STUDIO_GRID = 8;

export const STUDIO_CANVAS = {
  styleSet: 'neu',
  background: 'neu',
  grid: STUDIO_GRID,
  // The Neu ground draws no grid of its own ("the shapes' relief is the only texture"), which leaves a drawing with
  // nothing to place against; `backgroundGrid` overrides the background's own.
  backgroundGrid: 'dots',
} as const;

/** A value on the drawing's grid. */
const onGrid = (value: number, grid: number): number => Math.round(value / grid) * grid;

/**
 * Puts every shape on the drawing's grid: the edges are rounded, not the centre and the size, so two shapes that
 * were flush stay flush and a frame that enclosed its cards still encloses them. A text's box is measured from its
 * own content rather than authored (`styleText` derives the height from the font size), so only its top-left moves.
 *
 * Runs before the links are routed, since a route is taken from the outlines it meets and `diagramRoute` drops one
 * whose ends have drifted past `ROUTE_SLACK`.
 */
const snapToGrid = (content: ContentMap, grid: number): number => {
  let moved = 0;
  for (const [key, record] of Object.entries(content)) {
    if (!isNodeRecord(record)) {
      continue;
    }
    const { center, size, style } = record.node;
    const derived = style?.fill === false && style?.border === false;
    const [left, top] = [onGrid(center.x - size.width / 2, grid), onGrid(center.y - size.height / 2, grid)];
    // A shape of no width or height would vanish; the smallest it rounds to is one cell.
    const [width, height] = derived
      ? [size.width, size.height]
      : [
          Math.max(grid, onGrid(center.x + size.width / 2, grid) - left),
          Math.max(grid, onGrid(center.y + size.height / 2, grid) - top),
        ];
    const next = { x: left + width / 2, y: top + height / 2 };
    if (next.x === center.x && next.y === center.y && width === size.width && height === size.height) {
      continue;
    }
    content[key] = { ...record, node: { ...record.node, center: next, size: { width, height } } };
    moved++;
  }
  return moved;
};

/** How a component is drawn: an element of its own kind, or a `Generator` the canvas runs. */
export type ComponentMode = 'kind' | 'generator';

/** What the loader had to take from the sidecar, which is the spike's finding in numbers. */
export type StudioReport = {
  problems: number;
  cards: number;
  /** Shapes the grid snap moved. */
  snapped: number;
  routed: number;
  components: number;
};

/** Whether a command names the slide's title block, which the presenter's heading carries ({@link TITLE_OBJECT}). */
const isTitle = (command: Scene.Command): boolean =>
  'object' in command ? command.object.id === TITLE_OBJECT : 'objectId' in command && command.objectId === TITLE_OBJECT;

/**
 * Seeds a canvas from a slide: parses the `.diagram`, drops the title block, applies the rest through the
 * illustrator bridge, then repairs from the sidecar what the DSL could not carry. Returns what it had to repair.
 */
export const seedStudioSlide =
  (
    source: string,
    model: StudioModel,
    {
      components = 'kind',
      grid = STUDIO_GRID,
      kinds = new Set(['space-graph']),
      generators = {},
      report,
    }: {
      components?: ComponentMode;
      /** The pitch the slide's geometry is rounded to, which is the drawing's own grid. */
      grid?: number;
      /** The component kinds the host has registered; one it has not is left as the DSL's ring. */
      kinds?: ReadonlySet<string>;
      generators?: Generators;
      report?: (report: StudioReport) => void;
    } = {},
  ) =>
  (content: ContentMap): void => {
    const { commands, problems } = Dsl.parse(source);
    invariant(problems.length === 0, `${model.id}.diagram: ${problems.map(({ message }) => message).join('; ')}`);
    applyCommands(
      content,
      commands.filter((command) => !isTitle(command)),
      SceneHandler,
    );
    promoteCards(content, model);
    styleText(content, model);
    styleFrames(content, model);
    const snapped = snapToGrid(content, grid);
    const routed = routeLinks(content, model, components);
    const placed =
      components === 'generator'
        ? placeGenerators(content, model, generators)
        : placeComponentKinds(content, model, kinds);
    report?.({
      problems: problems.length,
      cards: Object.keys(model.nodes).length,
      snapped,
      routed,
      components: placed,
    });
  };
