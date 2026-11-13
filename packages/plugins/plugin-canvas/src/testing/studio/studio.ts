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
import { type Node, type NodeBase, endpointNode } from '@dxos/scene';

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

/**
 * A chip of a card's body, or of a standalone chip node. The sidecar writes JSON `null` and `false` where a slide
 * gives no tone and no ghost state, so both are nullish rather than absent.
 */
export const StudioChip = Schema.Struct({
  icon: Schema.optional(Schema.String),
  label: Schema.String,
  note: Schema.optional(Schema.NullOr(Schema.String)),
  tone: Schema.optional(Schema.NullOr(Schema.String)),
  ghost: Schema.optional(Schema.NullOr(Schema.Boolean)),
});
export type StudioChip = Schema.Schema.Type<typeof StudioChip>;

/** A card's chips: a wrapping row, or a grid of `cols` columns whose gap the slide chose. */
export const StudioChips = Schema.Struct({
  items: Schema.Array(StudioChip),
  cols: Schema.optional(Schema.Number),
  flat: Schema.optional(Schema.Boolean),
  columnGap: Schema.optional(Schema.Number),
});
export type StudioChips = Schema.Schema.Type<typeof StudioChips>;

/** A card of the deck: a Phosphor icon, a title, its centre in slide units, and an optional accent. */
export const StudioCard = Schema.Struct({
  icon: Schema.String,
  title: Schema.String,
  cx: Schema.Number,
  cy: Schema.Number,
  w: Schema.optional(Schema.Number),
  h: Schema.optional(Schema.Number),
  /** A CSS custom property of the deck (`var(--t-trip)`), or a tone name (`ink`), resolved through {@link TONES}.
   * Nullish: a sidecar writes JSON `null` for a card the slide gives no tone, which is not `undefined`. */
  tone: Schema.optional(Schema.NullOr(Schema.String)),
  /** The element kind the card wants; absent is the plain `card` of round 1. */
  kind: Schema.optional(Schema.String),
  /** The deck's own card variant (`.d-card.simple` and friends); absent is `full`. */
  variant: Schema.optional(Schema.Literals(['full', 'compact', 'simple'])),
  /** Round 2 (`feed-card`): the feed strip, a sentence of body, and a mono footer under a hairline. */
  feed: Schema.optional(StudioFeed),
  body: Schema.optional(Schema.String),
  footer: Schema.optional(Schema.String),
  /** Round 3 (`card`, `chip`): the chips in a card's body, and a chip node's own mono note and ghost state. */
  chips: Schema.optional(StudioChips),
  note: Schema.optional(Schema.NullOr(Schema.String)),
  ghost: Schema.optional(Schema.NullOr(Schema.Boolean)),
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
  role: Schema.Literals(['heading', 'caption', 'col-heading', 'label', 'link-label', 'note']),
  /** The width the deck lays the text out in; with `align`, how it sits in it. */
  w: Schema.optional(Schema.Number),
  align: Schema.optional(Schema.Literals(['left', 'center', 'right'])),
  /** For a `link-label`: the links it captions. */
  for: Schema.optional(Schema.Array(Schema.String)),
});
export type StudioText = Schema.Schema.Type<typeof StudioText>;

/**
 * A run of elements the deck laid out together: `down` and `across` are `n` elements of ONE size on a constant pitch,
 * `stack` is a column whose rows each take their own height. The sidecar records the run's own box, so the import can
 * lay the run out on the drawing's grid rather than rounding each element's recorded edges on its own — which is what
 * turned ten 60.4-unit service cards into a column of 56s and 64s.
 */
export const StudioRun = Schema.Struct({
  id: Schema.String,
  kind: Schema.Literals(['down', 'across', 'stack']),
  x: Schema.Number,
  y: Schema.Number,
  w: Schema.Number,
  h: Schema.Number,
  /** How many elements the run holds; a `stack` has none, since its rows differ. */
  n: Schema.optional(Schema.Number),
  gap: Schema.optional(Schema.Number),
});
export type StudioRun = Schema.Schema.Type<typeof StudioRun>;

export const StudioFrame = Schema.Struct({
  id: Schema.String,
  x: Schema.Number,
  y: Schema.Number,
  w: Schema.Number,
  h: Schema.Number,
  label: Schema.optional(Schema.String),
});
export type StudioFrame = Schema.Schema.Type<typeof StudioFrame>;

/** A box of a component, relative to its own origin. */
const Box = Schema.Struct({ x: Schema.Number, y: Schema.Number, w: Schema.Number, h: Schema.Number });

/** A named region of a component a link may end on: the app frame's `r-doc`, with the anchor the deck aims at. */
export const StudioPart = Schema.Struct({
  id: Schema.String,
  ...Box.fields,
  anchor: Schema.optional(Point),
});
export type StudioPart = Schema.Schema.Type<typeof StudioPart>;

/**
 * A plugin that opens a space of the substrate: which space it resolved to, and one lit object per element it shows,
 * with the object's type and where it sits. The resolution itself (nearest entry, a ranked walk, a route that avoids
 * links an earlier flow took) stays in the deck; this is its output.
 */
export const StudioFlow = Schema.Struct({
  id: Schema.String,
  space: Schema.Number,
  objects: Schema.Array(
    Schema.Struct({
      i: Schema.Number,
      type: Schema.String,
      at: Schema.Tuple([Schema.Number, Schema.Number]),
    }),
  ),
});
export type StudioFlow = Schema.Schema.Type<typeof StudioFlow>;

/**
 * A part of the slide the deck draws itself, which the canvas draws as a kind, a Generator or plain shapes. Round 2's
 * space graph is a circle (`cx`, `cy`, `r`); round 3's are boxes (`x`, `y`, `w`, `h`), so both forms are optional and
 * {@link componentFrame} reads whichever one a component carries.
 */
export const StudioComponent = Schema.Struct({
  id: Schema.String,
  kind: Schema.String,
  cx: Schema.optional(Schema.Number),
  cy: Schema.optional(Schema.Number),
  r: Schema.optional(Schema.Number),
  x: Schema.optional(Schema.Number),
  y: Schema.optional(Schema.Number),
  w: Schema.optional(Schema.Number),
  h: Schema.optional(Schema.Number),
  /** The box's own text, where the DSL gives the placeholder one (a plank's heading). */
  label: Schema.optional(Schema.String),
  params: Schema.Record(Schema.String, Schema.Any),
  /** The regions a link may end on (the app frame's six). */
  parts: Schema.optional(Schema.Array(StudioPart)),
  /** Where inside a region the deck lines a card up, by region (`a-doc`); the app frame's. */
  anchors: Schema.optional(Schema.Record(Schema.String, Box)),
  /** Graph objects drawn lit, by index, with the tone they take. */
  lit: Schema.optional(Schema.Record(Schema.String, Schema.String)),
  /** The substrate's packed spaces, `[x, y, r]` in slide units and in packing order. */
  spaces: Schema.optional(Schema.Array(Schema.Tuple([Schema.Number, Schema.Number, Schema.Number]))),
  /** How many links the field runs between spaces. */
  bridges: Schema.optional(Schema.Number),
  /** What each plugin flow resolved to; only the lit objects and where they sit are drawn. */
  flows: Schema.optional(Schema.Array(StudioFlow)),
});
export type StudioComponent = Schema.Schema.Type<typeof StudioComponent>;

/** A slide as `export.mjs` writes it: the whole model, of which the `.diagram` file is the expressible part. */
export const StudioModel = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  /** Nullish: a slide with no subtitle writes JSON `null`. */
  subtitle: Schema.optional(Schema.NullOr(Schema.String)),
  /** The slide's own box, so every drawing of the deck imports at one scale whatever it draws. */
  page: Schema.optional(Schema.Struct({ w: Schema.Number, h: Schema.Number })),
  size: Schema.Struct({ w: Schema.Number, h: Schema.Number }),
  nodes: Schema.Record(Schema.String, StudioCard),
  edges: Schema.Array(StudioEdge),
  frames: Schema.Array(StudioFrame),
  texts: Schema.optional(Schema.Array(StudioText)),
  components: Schema.optional(Schema.Array(StudioComponent)),
  layout: Schema.optional(Schema.Array(StudioRun)),
});
export type StudioModel = Schema.Schema.Type<typeof StudioModel>;

/** Reads a sidecar, so a drifted export fails here rather than halfway through a drawing. */
export const parseStudioModel = (text: string): StudioModel => Schema.decodeUnknownSync(StudioModel)(JSON.parse(text));

/** The box a component occupies, from the circle or the rectangle its sidecar records. */
export const componentFrame = (component: StudioComponent): { x: number; y: number; w: number; h: number } => {
  const { cx, cy, r, x, y, w, h } = component;
  if (cx !== undefined && cy !== undefined && r !== undefined) {
    return { x: cx - r, y: cy - r, w: r * 2, h: r * 2 };
  }
  invariant(
    x !== undefined && y !== undefined && w !== undefined && h !== undefined,
    `component "${component.id}" has neither a circle nor a box`,
  );
  return { x, y, w, h };
};

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
const TEXT_SIZES: Record<string, number> = {
  // A column's own heading and the line under it: the deck set these against a 1600-unit page it also put a slide
  // title on; drawn on their own they carry the column, so they are the size a reader reads them at.
  'heading': 32,
  'caption': 20,
  // A column's own heading (`.d-colh`, 1.6cqw), which the deck sets smaller than the slide's title.
  'col-heading': 26,
  'label': 19,
  'link-label': 15,
  'note': 15,
};

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

/**
 * A card's chips as the chip kind takes them. The sidecar writes a `null` tone and a `false` ghost where the slide
 * gives neither, and a kind's optional field is absent rather than empty, so both are dropped here.
 */
const chipsOf = ({ items, cols, flat, columnGap }: StudioChips) => ({
  items: items.map(({ icon, label, note, tone, ghost }) => ({
    label,
    ...(icon ? { icon } : {}),
    ...(note ? { note } : {}),
    ...(tone ? { tone: TONES[tone] ?? tone } : {}),
    ...(ghost ? { ghost } : {}),
  })),
  ...(cols !== undefined ? { cols } : {}),
  ...(flat !== undefined ? { flat } : {}),
  ...(columnGap !== undefined ? { columnGap } : {}),
});

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
const promoteCards = (content: ContentMap, model: StudioModel, remap: Readonly<Record<string, string>>): void => {
  for (const [key, card] of Object.entries(model.nodes)) {
    const record = content[nodeKey(boxOf(key))];
    invariant(isNodeRecord(record), `no node for card "${key}"`);
    const { style: _style, ...node } = record.node;
    const icon = { type: card.icon };
    const tone = card.tone ? { tone: TONES[card.tone] ?? card.tone } : {};
    content[nodeKey(boxOf(key))] = {
      ...record,
      node: {
        ...node,
        type: remap[card.kind ?? 'card'] ?? card.kind ?? 'card',
        label: labelOf(record.node) ?? card.title,
        // The glyph, body and footer are the core card's fields; everything else is the kind's own, under `data`.
        icon,
        data: {
          ...tone,
          ...(card.variant ? { variant: card.variant } : {}),
          ...(card.feed ? { feed: card.feed.n, marks: marksOf(card.feed) } : {}),
          ...(card.feed?.label ? { feedLabel: card.feed.label } : {}),
          ...(card.chips ? { chips: chipsOf(card.chips) } : {}),
          ...(card.note ? { note: card.note } : {}),
          ...(card.ghost ? { ghost: card.ghost } : {}),
        },
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
  // A column's lines as one block, laid out UPWARDS from the last one's own place: the deck set its text against its
  // own type sizes, so a heading drawn larger here would run over the line under it — and pushing that line down
  // instead would run it into the frame the deck left room above.
  const lines = new Map<number, { text: StudioText; height: number }[]>();
  for (const text of model.texts ?? []) {
    const height = TEXT_SIZES[text.role] * 1.9;
    lines.set(text.x, [...(lines.get(text.x) ?? []), { text, height }]);
  }
  const tops = new Map<string, number>();
  for (const column of lines.values()) {
    const last = column[column.length - 1];
    let bottom = last.text.y + last.height;
    for (const { text, height } of [...column].reverse()) {
      tops.set(text.id, bottom - height);
      bottom -= height;
    }
  }

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
    const top = tops.get(text.id) ?? text.y;
    content[nodeKey(id)] = {
      ...record,
      node: {
        ...rest,
        type: 'rect',
        label,
        center: { x: text.x + width / 2, y: top + height / 2 },
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
 * The ports a smart link leaves and arrives on: the middle of the sides that face each other. The canvas spreads
 * `portsPerSide` ports along each side and names the middle one `1`, so a card under another is joined bottom
 * centre to top centre rather than corner to corner.
 */
const facingPorts = (source: Frame, target: Frame, ports: PortMode): { source: string; target: string } => {
  const span = (frame: Frame) => ({
    left: frame.center.x - frame.size.width / 2,
    right: frame.center.x + frame.size.width / 2,
    top: frame.center.y - frame.size.height / 2,
    bottom: frame.center.y + frame.size.height / 2,
  });
  const [from, to] = [span(source), span(target)];
  const below = to.top >= from.bottom;
  const above = to.bottom <= from.top;
  // A slide that fans out downwards (one card over a row of them) joins foot to head whatever the two are apart
  // across; otherwise the sides that face each other are the ones the shapes are furthest apart on, so two cards
  // side by side with a little vertical offset are joined across rather than over the top of one of them.
  if (ports === 'vertical' && (below || above)) {
    return below ? { source: 's1', target: 'n1' } : { source: 'n1', target: 's1' };
  }
  const across = Math.max(to.left - from.right, from.left - to.right);
  const down = Math.max(to.top - from.bottom, from.top - to.bottom);
  if (down > across) {
    return below ? { source: 's1', target: 'n1' } : { source: 'n1', target: 's1' };
  }
  return target.center.x >= source.center.x ? { source: 'e1', target: 'w1' } : { source: 'w1', target: 'e1' };
};

/**
 * Puts the sidecar's routes back on the links. The DSL arrow has two ends and nothing in between, so the deck's
 * routes survive the export only as `# route=` comments, which the parser drops. The scene model does carry them —
 * `connector.route` on a link whose ends stay bound to their nodes — so this is a DSL gap, not a canvas one.
 */
const routeLinks = (
  content: ContentMap,
  model: StudioModel,
  components: ComponentMode,
  links: LinkMode,
  ports: PortMode,
): number => {
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
    // The deck's own waypoints are its own coordinates. A slide this import re-laid out has moved its cards away
    // from them, which is how a wire ends up crossing the slide diagonally; `smart` drops them and lets the canvas
    // route the link between the two shapes it still binds.
    const waypoints = links === 'ortho' ? [] : waypointsOf(route, source, target);
    if (waypoints.length === 0 && links !== 'ortho') {
      continue;
    }
    const key = findLink(content, edge[0], edge[1]);
    const record = key === undefined ? undefined : content[key];
    if (key === undefined || !isLinkRecord(record)) {
      continue;
    }
    // A DSL `arrow` always has a head; the deck draws several of its wires without one (a reader's tap into a
    // space, a plugin's wire into a region), which the sidecar says and the DSL cannot.
    const { end, ...start } = record.link.ends ?? {};
    const ends = route.arrow === 'none' ? start : record.link.ends;
    // Smart: the canvas routes the link itself, so the diagram connector that carried the deck's geometry goes with
    // the route. What stays is the link's own style, which is what the canvas's link renderer reads.
    if (links === 'ortho') {
      const { connector: _connector, ...link } = record.link;
      const ends = facingPorts(source, target, ports);
      content[key] = {
        ...record,
        link: {
          ...link,
          type: 'ortho',
          source: { ...link.source, port: ends.source },
          target: { ...link.target, port: ends.target },
          ...(route.arrow === 'none' ? { ends } : {}),
          ...(route.color ? { style: { ...link.style, hue: LINK_HUES[route.color] ?? 'blue' } } : {}),
        },
      };
      routed++;
      continue;
    }
    content[key] = {
      ...record,
      link: {
        ...record.link,
        ...(route.arrow === 'none' ? { ends } : {}),
        // The link's own style is what the canvas's link renderer reads; `connector` below supplies the geometry.
        ...(route.color ? { style: { ...record.link.style, hue: LINK_HUES[route.color] ?? 'blue' } } : {}),
        connector: {
          ...record.link.connector,
          // A connector draws through the diagram renderer, which reads its stroke and colour here rather than from
          // the link's own `style`, so a dashed accent link would go solid and grey the moment it is routed.
          ...(route.dash || record.link.style?.lineStyle === 'dashed' ? { stroke: 'dashed' } : {}),
          ...(route.color ? { color: LINK_COLORS[route.color] ?? 'blue' } : {}),
          // A link's marker vocabulary is wider than a connector's head, so only the two they share carry over.
          ...(ends?.end === 'arrow' || ends?.end === 'triangle' ? { head: ends.end } : {}),
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
        // The placeholder's own frame, not the sidecar's: it has been snapped to the drawing's grid, and the links
        // were routed to meet it there.
        center: record.node.center,
        size: record.node.size,
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
 * The element the DSL left standing for a component. Round 2's space graph is an `ellipse ring`; round 3's are a
 * `rect box`, which is also how a card parses — so the kind is swapped onto whichever of the two the slide wrote.
 */
const placeholderOf = (content: ContentMap, component: StudioComponent): string | undefined =>
  ['ring', 'box'].map((part) => nodeKey(elementId(component.id, part))).find((key) => isNodeRecord(content[key]));

/** A lattice component's geometry: the seed and the density, which are its Properties panel. */
const latticeFields = ({ params }: StudioComponent) => {
  const { pitch, fill, extra, size, seed } = params;
  return {
    ...(typeof seed === 'number' ? { seed } : { seed: 0 }),
    ...(typeof pitch === 'number' ? { pitch } : {}),
    ...(typeof fill === 'number' ? { fill } : {}),
    ...(typeof extra === 'number' ? { extra } : {}),
    ...(typeof size === 'number' ? { objectSize: size } : {}),
    hue: 'neutral',
  };
};

/**
 * The substrate's packed spaces and lit objects as fractions of the component's own box, so the field scales with
 * the node rather than carrying the slide's coordinates into a drawing that may be resized.
 *
 * The packing and the flow resolution are the deck's, not ported: what the sidecar records is their output, and it
 * is the input here. Each space's own lattice graph is generated as the space graph's is, from the seed and the
 * space's index, so the field is the same geometry at nine scales rather than nine stored graphs.
 */
const substrateFields = (component: StudioComponent) => {
  const frame = componentFrame(component);
  const spaces = (component.spaces ?? []).map(([x, y, r]) => ({
    x: (x - frame.x) / frame.w,
    y: (y - frame.y) / frame.h,
    r: r / frame.w,
  }));
  const lit = (component.flows ?? []).flatMap(({ objects }) =>
    objects.map(({ type, at: [x, y] }) => ({
      x: (x - frame.x) / frame.w,
      y: (y - frame.y) / frame.h,
      tone: type,
    })),
  );
  return {
    ...latticeFields(component),
    ...(spaces.length > 0 ? { spaces } : {}),
    ...(lit.length > 0 ? { lit } : {}),
    ...(typeof component.bridges === 'number' ? { bridges: component.bridges } : {}),
  };
};

/** The app frame draws its own regions, so all it takes from the sidecar is which of them are outlined, and in what. */
const appFrameFields = ({ params }: StudioComponent) => {
  const colors = params.colors;
  return {
    ...(params.highlight ? { highlight: true } : {}),
    ...(isRecord(colors)
      ? {
          colors: Object.fromEntries(
            Object.entries(colors).flatMap(([region, tone]) =>
              typeof tone === 'string' ? [[region, TONES[tone] ?? tone]] : [],
            ),
          ),
        }
      : {}),
  };
};

/** The plank mounts one wireframe component of the kit, under a header of its title and the package it comes from. */
const plankFields = ({ label, params }: StudioComponent) => ({
  label: typeof params.title === 'string' ? params.title : (label ?? ''),
  ...(typeof params.comp === 'string' ? { comp: params.comp } : {}),
  ...(typeof params.package === 'string' ? { package: params.package } : {}),
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** A component's own fields on the node of its kind, by kind; one the table does not name takes the lattice's. */
const COMPONENT_FIELDS: Record<string, (component: StudioComponent) => Record<string, unknown>> = {
  'space-graph': latticeFields,
  'substrate': substrateFields,
  'app-frame': appFrameFields,
  'plank': plankFields,
};

/**
 * Replaces a component's placeholder with an element of its own kind, whose fields are its configuration: the
 * Properties panel edits the seed, the density and the readers, and the view reads its readers out of the scene by
 * id. The alternative is {@link placeGenerators}, which puts the same geometry in a `Generator` instead.
 */
const placeComponentKinds = (content: ContentMap, model: StudioModel, kinds: ReadonlySet<string>): number => {
  let placed = 0;
  for (const component of model.components ?? []) {
    const key = placeholderOf(content, component);
    const record = key === undefined ? undefined : content[key];
    if (key === undefined || !kinds.has(component.kind) || !isNodeRecord(record)) {
      continue;
    }
    content[key] = {
      ...record,
      node: {
        type: component.kind,
        id: record.node.id,
        z: record.node.z,
        center: record.node.center,
        size: record.node.size,
        // A kind's own fields go under `data` (decision 21); the frame above is the element's own.
        data: (COMPONENT_FIELDS[component.kind] ?? latticeFields)(component),
      },
    };
    placed++;
  }
  return placed;
};

/**
 * The seven-point arrow of `fatArrow()` (studio `lib/components.mjs`), in the frame's unit space. The slide's own
 * 72 x 44 viewBox: pointing up, mirrored vertically where it points down.
 */
const FAT_ARROW: readonly { x: number; y: number }[] = [
  { x: 36 / 72, y: 4 / 44 },
  { x: 68 / 72, y: 30 / 44 },
  { x: 50 / 72, y: 30 / 44 },
  { x: 50 / 72, y: 40 / 44 },
  { x: 22 / 72, y: 40 / 44 },
  { x: 22 / 72, y: 30 / 44 },
  { x: 4 / 72, y: 30 / 44 },
];

/**
 * The components the canvas draws as plain shapes rather than a kind of their own: the two fat arrows above and
 * below the EDGE service list, which say the list runs on past the slide. A closed `polyline` is a filled polygon,
 * so the arrow needs nothing the canvas does not already have — which is why it is not a kind.
 */
const placeShapes = (content: ContentMap, model: StudioModel): number => {
  let placed = 0;
  for (const component of model.components ?? []) {
    const key = component.kind === 'fat-arrow' ? placeholderOf(content, component) : undefined;
    const record = key === undefined ? undefined : content[key];
    if (key === undefined || !isNodeRecord(record)) {
      continue;
    }
    const up = component.params.up !== false;
    content[key] = {
      ...record,
      node: {
        type: 'polyline',
        id: record.node.id,
        z: record.node.z,
        center: record.node.center,
        size: record.node.size,
        points: up ? FAT_ARROW : FAT_ARROW.map(({ x, y }) => ({ x, y: 1 - y })),
        params: { closed: true },
        // Muted and half transparent, so it reads as a hint rather than a connector.
        style: { hue: 'neutral', fill: true, border: false, opacity: 0.45 },
      },
    };
    placed++;
  }
  return placed;
};

/**
 * Hides the region rects of a component that draws its own picture. The app frame's six regions are what its wires
 * end on (`frame/r-doc` is an ordinary link target), so they stay in the scene as geometry; the kind draws the panes
 * themselves, and a visible rect over them would be the same box twice.
 */
const hideParts = (content: ContentMap, model: StudioModel, kinds: ReadonlySet<string>): void => {
  for (const component of model.components ?? []) {
    if (!kinds.has(component.kind)) {
      continue;
    }
    for (const part of component.parts ?? []) {
      const key = nodeKey(elementId(component.id, part.id));
      const record = content[key];
      if (isNodeRecord(record)) {
        content[key] = { ...record, node: { ...record.node, style: { fill: false, border: false } } };
      }
    }
  }
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

/**
 * Lays each of the sidecar's layout runs out on the grid: every element of the run takes one size, and they sit on one
 * pitch, both rounded once for the whole run. {@link snapToGrid} rounds an element's edges independently, so two
 * elements the deck drew the same size land on different sizes whenever their fractional offsets differ — which is
 * what a column of equal cards must not do. A `stack` is left alone: its rows take their own heights by definition.
 *
 * Membership is geometric, since a run names no members: an element belongs when its centre is inside the run's box.
 */
const layoutRuns = (content: ContentMap, model: StudioModel, grid: number): number => {
  let laid = 0;
  for (const run of model.layout ?? []) {
    const count = run.n ?? 0;
    if (run.kind === 'stack' || count < 2) {
      continue;
    }
    const down = run.kind === 'down';
    const members: { key: string; node: Node }[] = [];
    for (const [key, record] of Object.entries(content)) {
      if (!isNodeRecord(record)) {
        continue;
      }
      const { x, y } = record.node.center;
      if (x > run.x && x < run.x + run.w && y > run.y && y < run.y + run.h) {
        members.push({ key, node: record.node });
      }
    }
    if (members.length !== count) {
      continue;
    }
    members.sort((left, right) =>
      down ? left.node.center.y - right.node.center.y : left.node.center.x - right.node.center.x,
    );
    // The run's own box divided by what it holds: one element's extent, then the step that spreads them across it.
    const span = down ? run.h : run.w;
    const extent = Math.max(grid, onGrid((span - (run.gap ?? 0) * (count - 1)) / count, grid));
    const pitch = Math.max(extent, onGrid((span - extent) / (count - 1), grid));
    const start = onGrid(down ? run.y : run.x, grid);
    const across = onGrid(down ? run.x : run.y, grid);
    const breadth = Math.max(grid, onGrid(down ? run.w : run.h, grid));
    const [width, height] = down ? [breadth, extent] : [extent, breadth];
    members.forEach(({ key, node }, index) => {
      const along = start + index * pitch + extent / 2;
      const center = down ? { x: across + width / 2, y: along } : { x: along, y: across + height / 2 };
      const record = content[key];
      if (!isNodeRecord(record)) {
        return;
      }
      content[key] = { ...record, node: { ...node, center, size: { width, height } } };
      laid++;
    });
  }
  return laid;
};

/** How near two cards' centres must be to count as one column or one row. */
const LINE_TOLERANCE = 24;

/** How far from its line's middle size a card may be and still take it: a header is not a member of a column. */
const LINE_SPREAD = 1.5;

/** The slide's cards, which are the only shapes these passes move. */
const cardsOf = (content: ContentMap, model: StudioModel): { key: string; node: Node }[] => {
  const cards: { key: string; node: Node }[] = [];
  for (const id of Object.keys(model.nodes)) {
    const key = nodeKey(boxOf(id));
    const record = content[key];
    if (isNodeRecord(record)) {
      cards.push({ key, node: record.node });
    }
  }
  return cards;
};

/** Cards grouped by a centre they share, in order along that axis. */
const linesOf = (cards: { key: string; node: Node }[], axis: 'x' | 'y') => {
  const lines: { center: number; members: typeof cards }[] = [];
  for (const card of [...cards].sort((left, right) => left.node.center[axis] - right.node.center[axis])) {
    const last = lines.at(-1);
    if (last && Math.abs(card.node.center[axis] - last.center) <= LINE_TOLERANCE) {
      last.members.push(card);
    } else {
      lines.push({ center: card.node.center[axis], members: [card] });
    }
  }
  return lines;
};

/** A line's members less the odd one out, by the size that line shares. */
const alongLine = (members: { key: string; node: Node }[], extent: (node: Node) => number) => {
  const sizes = members.map(({ node }) => extent(node)).sort((left, right) => left - right);
  const middle = sizes[Math.floor(sizes.length / 2)];
  return members.filter(({ node }) => extent(node) <= middle * LINE_SPREAD && extent(node) * LINE_SPREAD >= middle);
};

/**
 * Whether a column of cards is a stack — a list laid out one under the other — rather than a graph that happens to
 * share a centre. A stack's cards sit in order with gaps no larger than a card; the Ontology slide's entities are
 * spread down the middle of the slide with the links between them, and re-spacing them on one gap would drop the
 * last one off the bottom.
 */
const isStack = (ordered: { node: Node }[]): boolean => {
  const gaps = ordered.slice(1).map(({ node }, index) => {
    const previous = ordered[index].node;
    return node.center.y - node.size.height / 2 - (previous.center.y + previous.size.height / 2);
  });
  const tallest = Math.max(...ordered.map(({ node }) => node.size.height));
  // A gap may be negative: a card the slide sized itself has grown into the one below it, and re-spacing the stack is
  // exactly what fixes that. What makes it a stack is that the cards sit one under the other rather than spread out.
  return gaps.length > 0 && gaps.every((gap) => gap <= tallest);
};

/**
 * Gives every card of a column one width, and lays a column that is a stack out on one gap of its own. Where the
 * columns themselves sit is {@link evenColumns}: two passes placing them would each undo the other's work. The deck sized each box to its own content and left whatever gap that produced, so a slide's grid came
 * out ragged — on the ECHO layers slide the bottom row of cards was 8 units taller than the two above it and sat 8
 * units lower than its own pitch. A line takes its SMALLEST card: it never grows into its neighbour, so the slide
 * gains the gutter it lacked.
 *
 * A card far from its line's middle size is left alone ({@link LINE_SPREAD}): the Plugins slide's header spans five
 * columns from the middle one's centre, and is not a member of it.
 *
 * Only the cards move: a frame, a component or a label keeps the box it was given.
 */
const uniformGrid = (
  content: ContentMap,
  model: StudioModel,
  grid: number,
  sized: ReadonlySet<string> = new Set(),
): number => {
  let changed = 0;
  const write = (
    key: string,
    node: Node,
    center: { x: number; y: number },
    size: { width: number; height: number },
  ) => {
    const record = content[key];
    if (!isNodeRecord(record)) {
      return;
    }
    if (
      node.center.x === center.x &&
      node.center.y === center.y &&
      node.size.width === size.width &&
      node.size.height === size.height
    ) {
      return;
    }
    content[key] = { ...record, node: { ...node, center, size } };
    changed++;
  };

  // The columns a slide stands on: those of more than one card, at one width and one gap, so the space between any
  // two of them is the same. A column far from the middle width is its own thing (ECHO layers' runtime column beside
  // its three wide ones) and is laid out where it is.
  const columns = linesOf(cardsOf(content, model), 'x')
    .map(({ center, members }) => ({
      center,
      members: alongLine(members, (node) => onGrid(node.size.width, grid)).sort(
        (first, second) => first.node.center.y - second.node.center.y,
      ),
    }))
    .filter(({ members }) => members.length > 1);
  // One gap down every stack of the slide, from the middle of the gaps the deck left in all of them: two columns of
  // the same thing read as two columns, and the deck's own 16 and 8 did not.
  const allGaps = columns
    .filter(({ members }) => isStack(members))
    .flatMap(({ members }) =>
      members.slice(1).map(({ node }, index) => {
        const previous = members[index].node;
        return node.center.y - node.size.height / 2 - (previous.center.y + previous.size.height / 2);
      }),
    )
    .sort((first, second) => first - second);
  // The positive ones: a stack whose cards have grown into each other says nothing about the gap the slide wants.
  const spacing = allGaps.filter((gap) => gap > 0);
  const stackGap =
    spacing.length > 0 ? Math.max(grid, onGrid(spacing[Math.floor(spacing.length / 2)], grid)) : 2 * grid;

  for (const { center, members: column } of columns) {
    const width = Math.max(grid, Math.min(...column.map(({ node }) => onGrid(node.size.width, grid))));
    const left = onGrid(center - width / 2, grid);
    // A card the slide sized itself keeps the width it asked for; the column still spaces it.
    const widthOf = (key: string, node: Node) => (sized.has(key) ? node.size.width : width);
    const leftOf = (key: string, node: Node) => (sized.has(key) ? onGrid(center - node.size.width / 2, grid) : left);
    const ordered = [...column].sort((first, second) => first.node.center.y - second.node.center.y);
    // One gap down the column, from the gaps the deck left: the cards keep their own heights and their first top, and
    // what was 16, 16 and 24 between them becomes 16, 16 and 16.
    const gap = stackGap;
    const stacked = isStack(ordered);
    let top = onGrid(ordered[0].node.center.y - ordered[0].node.size.height / 2, grid);
    for (const { key, node } of ordered) {
      const y = stacked ? top + node.size.height / 2 : node.center.y;
      const own = widthOf(key, node);
      write(key, node, { x: leftOf(key, node) + own / 2, y }, { ...node.size, width: own });
      top += node.size.height + gap;
    }
  }
  return changed;
};

/** Draws the named cards at the size the slide asks for, on the grid and about their own centres. */
const resizeCards = (
  content: ContentMap,
  sizes: Readonly<Record<string, { width?: number; height?: number }>>,
  grid: number,
): number => {
  let resized = 0;
  for (const [id, size] of Object.entries(sizes)) {
    const key = nodeKey(boxOf(id));
    const record = content[key];
    if (!isNodeRecord(record)) {
      continue;
    }
    const { node } = record;
    const next = {
      width: Math.max(grid, onGrid(size.width ?? node.size.width, grid)),
      height: Math.max(grid, onGrid(size.height ?? node.size.height, grid)),
    };
    content[key] = { ...record, node: { ...node, size: next } };
    resized++;
  }
  return resized;
};

/**
 * Draws every card of the slide at one size: the middle width and height of the cards it holds, on the grid. A slide
 * whose cards are all the same thing — the Ontology slide's types — reads as a set, and the deck's own boxes were
 * sized to their labels, so `Organization` came out wider than `Task`.
 */
const uniformCards = (content: ContentMap, model: StudioModel, uniform: boolean, grid: number): number => {
  if (!uniform) {
    return 0;
  }
  const cards = cardsOf(content, model);
  if (cards.length === 0) {
    return 0;
  }
  const middle = (extent: (node: Node) => number) => {
    const sizes = cards.map(({ node }) => onGrid(extent(node), grid)).sort((left, right) => left - right);
    return Math.max(grid, sizes[Math.floor(sizes.length / 2)]);
  };
  const size = { width: middle((node) => node.size.width), height: middle((node) => node.size.height) };
  let sized = 0;
  for (const { key, node } of cards) {
    if (node.size.width === size.width && node.size.height === size.height) {
      continue;
    }
    const record = content[key];
    if (!isNodeRecord(record)) {
      continue;
    }
    content[key] = { ...record, node: { ...node, size } };
    sized++;
  }
  return sized;
};

/** Removes the frames the slide names, with the label each carries: a border the drawing reads better without. */
const dropFrames = (content: ContentMap, frames: readonly string[]): number => {
  let dropped = 0;
  for (const id of frames) {
    for (const part of ['frame', 'title']) {
      const key = nodeKey(elementId(id, part));
      if (content[key]) {
        delete content[key];
        dropped++;
      }
    }
  }
  return dropped;
};

/** The space a frame keeps around what it holds, in scene units: the deck's own inset. */
const FRAME_PADDING = 24;

/**
 * Grows each frame to hold what is inside it. The deck sized a frame to the cards it drew; those cards have since
 * taken one size and one gap, so a frame drawn to the old ones has its last card hanging out of it. A frame keeps
 * its own origin and takes the room its contents need, with one padding all round.
 */
const fitFrames = (content: ContentMap, model: StudioModel, grid: number): number => {
  let fitted = 0;
  for (const frame of model.frames) {
    const key = nodeKey(elementId(frame.id, 'frame'));
    const record = content[key];
    if (!isNodeRecord(record)) {
      continue;
    }
    const { center, size } = record.node;
    const box = {
      left: center.x - size.width / 2,
      right: center.x + size.width / 2,
      top: center.y - size.height / 2,
      bottom: center.y + size.height / 2,
    };
    // What the frame holds: a card whose centre is inside it. A card that merely crosses it belongs to another.
    const held = cardsOf(content, model).filter(
      ({ node }) =>
        node.center.x > box.left && node.center.x < box.right && node.center.y > box.top && node.center.y < box.bottom,
    );
    if (held.length === 0) {
      continue;
    }
    const left = onGrid(Math.min(...held.map(({ node }) => node.center.x - node.size.width / 2)) - FRAME_PADDING, grid);
    const right = onGrid(
      Math.max(...held.map(({ node }) => node.center.x + node.size.width / 2)) + FRAME_PADDING,
      grid,
    );
    const top = onGrid(Math.min(...held.map(({ node }) => node.center.y - node.size.height / 2)) - FRAME_PADDING, grid);
    const bottom = onGrid(
      Math.max(...held.map(({ node }) => node.center.y + node.size.height / 2)) + FRAME_PADDING,
      grid,
    );
    const next = { width: right - left, height: bottom - top };
    if (next.width === size.width && next.height === size.height && left + next.width / 2 === center.x) {
      continue;
    }
    content[key] = {
      ...record,
      node: { ...record.node, center: { x: left + next.width / 2, y: top + next.height / 2 }, size: next },
    };
    fitted++;
  }
  return fitted;
};

/**
 * Lays the named cards out as columns of the slide's own: each list is a column, stacked top to bottom on the slide's
 * gap and centred on what the cards already covered. The deck drew these as a graph it placed by hand; said as
 * columns it reads in one pass, and {@link evenColumns} then spaces them with whatever else the slide stands on.
 */
const placeColumns = (
  content: ContentMap,
  model: StudioModel,
  columns: readonly (readonly string[])[],
  gap: number,
  grid: number,
): number => {
  if (columns.length === 0) {
    return 0;
  }
  const named = columns.flat();
  const cards = new Map(cardsOf(content, model).map((card) => [card.key, card]));
  const taken = named.flatMap((id) => {
    const card = cards.get(nodeKey(boxOf(id)));
    return card ? [card] : [];
  });
  if (taken.length !== named.length) {
    return 0;
  }
  // The box they covered is where they go back.
  const edges = taken.flatMap(({ node }) => [
    { x: node.center.x - node.size.width / 2, y: node.center.y - node.size.height / 2 },
    { x: node.center.x + node.size.width / 2, y: node.center.y + node.size.height / 2 },
  ]);
  const box = {
    left: Math.min(...edges.map(({ x }) => x)),
    right: Math.max(...edges.map(({ x }) => x)),
    middle: (Math.min(...edges.map(({ y }) => y)) + Math.max(...edges.map(({ y }) => y))) / 2,
  };
  const widest = Math.max(...taken.map(({ node }) => node.size.width));
  const pitch = onGrid(widest + gap, grid);
  // Centred on the box they covered, so the set does not drift off to one side of the slide.
  const first = onGrid(box.left + (box.right - box.left - (pitch * (columns.length - 1) + widest)) / 2, grid);
  let moved = 0;
  columns.forEach((column, index) => {
    const stack = column.flatMap((id) => {
      const card = cards.get(nodeKey(boxOf(id)));
      return card ? [card] : [];
    });
    const height = stack.reduce((total, { node }) => total + node.size.height, 0) + gap * (stack.length - 1);
    let top = onGrid(box.middle - height / 2, grid);
    for (const { key, node } of stack) {
      const record = content[key];
      if (!isNodeRecord(record)) {
        continue;
      }
      const left = first + index * pitch + (widest - node.size.width) / 2;
      content[key] = {
        ...record,
        node: {
          ...node,
          center: { x: onGrid(left, grid) + node.size.width / 2, y: top + node.size.height / 2 },
        },
      };
      top += node.size.height + gap;
      moved++;
    }
  });
  return moved;
};

/**
 * Puts one gap between every column of the slide. Where {@link uniformGrid} evens the columns a slide stands on, this
 * takes every column — a component and a frame among them — and spaces the lot left to right, from the leftmost
 * column's own edge. Given a gap it uses that, which is how a slide is widened; without one it takes the middle of
 * the gaps the deck left.
 */
const evenColumns = (content: ContentMap, gap: number | undefined, grid: number): number => {
  if (gap === undefined) {
    return 0;
  }
  const all = Object.entries(content).flatMap(([key, record]) =>
    isNodeRecord(record) ? [{ key, node: record.node }] : [],
  );
  // A label is not a column: a link's caption is a box as wide as its text, laid across the gap it captions, and
  // taking it for a column of its own is what pushed the Composer window onto its cards. It rides with the column
  // its centre falls in.
  const isLabel = ({ node }: (typeof all)[number]) => node.style?.fill === false && node.style?.border === false;
  const boxes = all.filter((box) => !isLabel(box));
  const labels = all.filter(isLabel);
  // Columns by centre, within half a card: a frame drawn around a column joins it, where clustering by overlap would
  // weld a column to the frame of the one beside it.
  const widths = boxes.map(({ node }) => node.size.width).sort((first, second) => first - second);
  const tolerance = Math.max(grid, (widths[Math.floor(widths.length / 2)] ?? 0) / 2);
  const columns: { center: number; left: number; right: number; members: typeof boxes }[] = [];
  for (const box of [...boxes].sort((first, second) => first.node.center.x - second.node.center.x)) {
    const [left, right] = [box.node.center.x - box.node.size.width / 2, box.node.center.x + box.node.size.width / 2];
    const last = columns.at(-1);
    // Near in centre AND near in width: the Plugins header shares the middle column's centre and is three times its
    // width, and taking it into that column would hide the one shape the spacing has to set aside.
    const first = last?.members[0].node.size.width ?? 0;
    const alike =
      last !== undefined && box.node.size.width <= first * LINE_SPREAD && box.node.size.width * LINE_SPREAD >= first;
    if (last && alike && box.node.center.x - last.center <= tolerance) {
      last.left = Math.min(last.left, left);
      last.right = Math.max(last.right, right);
      last.members.push(box);
    } else {
      columns.push({ center: box.node.center.x, left, right, members: [box] });
    }
  }
  // A shape that spans the columns rather than standing in one of them — the Plugins header over its five modules —
  // is set aside, spaced with nothing, and re-centred on the slide once the columns have moved. It is the one whose
  // box reaches across another column's: columns are grouped by centre, so a wide shape overlaps the ones it covers.
  // More than one: a column under a header overlaps the header alone, while the header reaches across them all.
  const overlapping = (column: (typeof columns)[number]) =>
    columns.filter((other) => other !== column && other.left < column.right && column.left < other.right).length > 1;
  const standing = columns.filter((column) => !overlapping(column));
  const spanning = columns.filter((column) => overlapping(column));
  // Each label with the column it sits in, so a caption moves with what it captions.
  for (const label of labels) {
    const column = columns.find(({ left, right }) => label.node.center.x >= left && label.node.center.x <= right);
    column?.members.push(label);
  }
  let moved = 0;
  const shift = (members: typeof boxes, by: number) => {
    if (by === 0) {
      return;
    }
    for (const { key, node } of members) {
      const record = content[key];
      if (!isNodeRecord(record)) {
        continue;
      }
      content[key] = { ...record, node: { ...node, center: { ...node.center, x: node.center.x + by } } };
      moved++;
    }
  };
  let edge = onGrid(standing[0]?.left ?? 0, grid);
  for (const column of [...standing].sort((first, second) => first.left - second.left)) {
    // The destination is rounded, not the move: rounding the move leaves a column that started off the grid off it,
    // and the gap beside it short by what it was out.
    shift(column.members, onGrid(edge, grid) - column.left);
    edge = onGrid(edge, grid) + column.right - column.left + onGrid(gap, grid);
  }
  // The columns as they now stand, which is what a spanning shape is centred on.
  const middle = (onGrid(standing[0]?.left ?? 0, grid) + (edge - onGrid(gap, grid))) / 2;
  for (const column of spanning) {
    shift(column.members, onGrid(middle - (column.left + column.right) / 2, grid));
  }
  return moved;
};

/**
 * Makes the slide symmetrical: each pair of columns, taken from the outside in, is moved to the mean of the two
 * distances from the slide's centre, and a column left in the middle is centred on it. The deck placed a side column
 * where its content happened to end, so the Composer slide's plugins sat 70 units from one edge and 100 from the
 * other, with the window between them off centre.
 */
const balanceColumns = (content: ContentMap, balance: boolean, grid: number): number => {
  if (!balance) {
    return 0;
  }
  const boxes = Object.entries(content).flatMap(([key, record]) =>
    isNodeRecord(record) ? [{ key, node: record.node }] : [],
  );
  if (boxes.length === 0) {
    return 0;
  }
  const edges = boxes.flatMap(({ node }) => [node.center.x - node.size.width / 2, node.center.x + node.size.width / 2]);
  const middle = (Math.min(...edges) + Math.max(...edges)) / 2;
  // Columns by centre, as {@link linesOf} groups them, but over every shape: a component is a column too.
  const columns: { center: number; members: typeof boxes }[] = [];
  for (const box of [...boxes].sort((left, right) => left.node.center.x - right.node.center.x)) {
    const last = columns.at(-1);
    if (last && Math.abs(box.node.center.x - last.center) <= LINE_TOLERANCE) {
      last.members.push(box);
    } else {
      columns.push({ center: box.node.center.x, members: [box] });
    }
  }
  let moved = 0;
  for (let index = 0; index < Math.ceil(columns.length / 2); index++) {
    const near = columns[index];
    const far = columns[columns.length - 1 - index];
    const span = near === far ? 0 : (Math.abs(near.center - middle) + Math.abs(far.center - middle)) / 2;
    for (const [column, side] of [
      [near, -1],
      [far, 1],
    ] as const) {
      const center = onGrid(middle + side * span, grid);
      if (column.center === center) {
        continue;
      }
      for (const { key, node } of column.members) {
        const record = content[key];
        if (!isNodeRecord(record)) {
          continue;
        }
        // A box centred on the grid has to be an even number of cells wide, or its own edges land half a cell off and
        // the two gaps beside it differ by one.
        const width = near === far ? Math.ceil(node.size.width / (2 * grid)) * 2 * grid : node.size.width;
        const left = center - width / 2;
        content[key] = {
          ...record,
          node: { ...node, center: { ...node.center, x: left + width / 2 }, size: { ...node.size, width } },
        };
        moved++;
      }
    }
  }
  return moved;
};

/**
 * Pulls the slide's columns apart about its own centre. The deck laid every slide out on one 1600-unit page, so a
 * three-column slide had whatever room that left between its columns; a drawing is not a page — it may be any size,
 * and the view frames whatever it covers — so a slide that reads tight is given more air here.
 *
 * Distances from the centre scale, sizes do not: a card keeps its width and a column keeps its own spacing, while the
 * space BETWEEN the columns grows.
 */
const spreadColumns = (content: ContentMap, model: StudioModel, spread: number, grid: number): number => {
  const xs = Object.values(content).flatMap((record) =>
    isNodeRecord(record)
      ? [record.node.center.x - record.node.size.width / 2, record.node.center.x + record.node.size.width / 2]
      : [],
  );
  if (spread === 1 || xs.length === 0) {
    return 0;
  }
  const middle = (Math.min(...xs) + Math.max(...xs)) / 2;
  let moved = 0;
  for (const [key, record] of Object.entries(content)) {
    if (!isNodeRecord(record)) {
      continue;
    }
    const { node } = record;
    // Centres, not edges: scaling an edge drags a wide shape sideways by half of what it keeps, which would walk the
    // middle column off the centre the balance just put it on.
    const left = onGrid(middle + (node.center.x - middle) * spread - node.size.width / 2, grid);
    if (left === onGrid(node.center.x - node.size.width / 2, grid)) {
      continue;
    }
    content[key] = { ...record, node: { ...node, center: { ...node.center, x: left + node.size.width / 2 } } };
    moved++;
  }
  return moved;
};

/**
 * Drops the slide's free-floating text: its notes, headings, column and link labels, and the labels the frames carry.
 * A slide whose story is told by its boxes reads better without them, and the deck's own labels are placed by eye —
 * a frame's is set beside its frame, which on the Architecture slide put a 412-unit title 376 units off the page.
 */
const dropLabels = (content: ContentMap, model: StudioModel): number => {
  let dropped = 0;
  const keys = [
    ...(model.texts ?? []).map((text) => nodeKey(elementId(text.id, 'label'))),
    ...model.frames.map((frame) => nodeKey(elementId(frame.id, 'title'))),
  ];
  for (const key of keys) {
    if (content[key]) {
      delete content[key];
      dropped++;
    }
  }
  return dropped;
};

/** How a component is drawn: an element of its own kind, or a `Generator` the canvas runs. */
export type ComponentMode = 'kind' | 'generator';

/**
 * How a link is drawn: along the route the deck recorded, or routed by the canvas between the shapes it binds —
 * `ortho`, so the segments are right angles rather than the curves `smart` draws.
 */
export type LinkMode = 'deck' | 'ortho';

/** Which sides a routed link leaves and arrives on: the ones facing each other, or always foot to head. */
export type PortMode = 'facing' | 'vertical';

/**
 * The component kinds the studio stories register (`testing/studio/*.tsx`). A host that has registered fewer passes
 * its own set to {@link seedStudioSlide}; a kind the host does not have is left as the DSL's placeholder, which is
 * how the drawing reads where the kind is not there. `fat-arrow` is not here: it draws as plain shapes.
 */
export const STUDIO_COMPONENT_KINDS: ReadonlySet<string> = new Set(['space-graph', 'substrate', 'app-frame', 'plank']);

/**
 * The box a view frames to draw a slide: one size for the whole deck, so the nine open at ONE scale, centred on what
 * this slide covers, so none of them sits off to a side of the box a presentation gives it. The size comes from the
 * deck ({@link studioDeckSize}) rather than the deck's own page, because a slide laid out here may be wider than the
 * page the deck fitted it to.
 */
/** The margin a drawing keeps around what it draws, which is also the gap a slide leaves between its columns. */
export const STUDIO_MARGIN = 96;

/**
 * One frame size for the whole deck: the widest and tallest slide, with a margin around it. Every slide frames this
 * same box, so the nine open at one scale, and none of them is clipped by a page the deck happened to fit it to.
 */
export const studioDeckSize = (
  bounds: readonly { width: number; height: number }[],
  margin = STUDIO_MARGIN,
): { width: number; height: number } => ({
  width: Math.max(0, ...bounds.map(({ width }) => width)) + 2 * margin,
  height: Math.max(0, ...bounds.map(({ height }) => height)) + 2 * margin,
});

export const studioPageFrame = (
  bounds: { x: number; y: number; width: number; height: number },
  size: { width: number; height: number },
) => ({
  x: bounds.x + bounds.width / 2 - size.width / 2,
  y: bounds.y + bounds.height / 2 - size.height / 2,
  ...size,
});

/** The box every shape of the drawing fits in. */
const contentBounds = (content: ContentMap) => {
  const boxes = Object.values(content).flatMap((record) => (isNodeRecord(record) ? [record.node] : []));
  if (boxes.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  const lefts = boxes.map((node) => node.center.x - node.size.width / 2);
  const rights = boxes.map((node) => node.center.x + node.size.width / 2);
  const tops = boxes.map((node) => node.center.y - node.size.height / 2);
  const bottoms = boxes.map((node) => node.center.y + node.size.height / 2);
  const [x, y] = [Math.min(...lefts), Math.min(...tops)];
  return { x, y, width: Math.max(...rights) - x, height: Math.max(...bottoms) - y };
};

/** What the loader had to take from the sidecar, which is the spike's finding in numbers. */
export type StudioReport = {
  problems: number;
  cards: number;
  /** Shapes the grid snap moved. */
  snapped: number;
  /** Elements a layout run sized and spaced as one. */
  laid: number;
  routed: number;
  components: number;
  /** What the slide covers once every pass has run, which is what a view has to frame. */
  bounds: { x: number; y: number; width: number; height: number };
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
      labels = true,
      remap = {},
      spread = 1,
      balance = false,
      gap,
      columns = [],
      links = 'deck',
      ports = 'facing',
      frames = [],
      uniform = false,
      sizes = {},
      kinds = STUDIO_COMPONENT_KINDS,
      generators = {},
      report,
    }: {
      components?: ComponentMode;
      /** The pitch the slide's geometry is rounded to, which is the drawing's own grid. */
      grid?: number;
      /** The slide's free-floating text is drawn; off, the drawing is its boxes alone ({@link dropLabels}). */
      labels?: boolean;
      /** Element kinds the slide draws as another kind, by the kind the sidecar names. */
      remap?: Readonly<Record<string, string>>;
      /** How far the slide's columns are pulled apart about its centre; 1 leaves the deck's own spacing. */
      spread?: number;
      /** The slide's columns are made symmetrical about its centre ({@link balanceColumns}). */
      balance?: boolean;
      /** One gap between every column of the slide, in scene units ({@link evenColumns}). */
      gap?: number;
      /** How the slide's links are drawn; a slide this import moves takes `ortho`, since the deck's routes are stale. */
      links?: LinkMode;
      /** Which sides a routed link uses; a slide that fans out downwards takes `vertical`. */
      ports?: PortMode;
      /** Frames the slide does not draw, by id ({@link dropFrames}). */
      frames?: readonly string[];
      /** The slide's own columns, each a list of card ids ({@link placeColumns}). */
      columns?: readonly (readonly string[])[];
      /** Every card of the slide is drawn at one size ({@link uniformCards}). */
      uniform?: boolean;
      /** A card the slide draws at a size of its own, by its id: what the deck drew is not always what reads. */
      sizes?: Readonly<Record<string, { width?: number; height?: number }>>;
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
    promoteCards(content, model, remap);
    styleText(content, model);
    styleFrames(content, model);
    // Before anything is measured: what the slide does not draw is not a column either, and a slide-wide footnote
    // left in would make every column one.
    dropFrames(content, frames);
    if (!labels) {
      dropLabels(content, model);
    }
    // Before the geometry too: a component's regions are kept as the links' targets but drawn by the kind, and a
    // region left looking like a shape would stand in the way of the columns ({@link evenColumns}).
    if (components === 'kind') {
      hideParts(content, model, kinds);
    }
    const snapped = snapToGrid(content, grid);
    // After the snap and before the routes: a route is taken from the outlines it meets, so the run has to be laid
    // out while they are still what the links will be measured against.
    // Every move the import makes happens here, before the routes: a connector is taken from the outlines it meets,
    // so a card resized or moved afterwards would leave its line bent around where the card used to be.
    const laid =
      layoutRuns(content, model, grid) +
      uniformCards(content, model, uniform, grid) +
      // Before the grid, so the column it is in is spaced around the size it ends up: a card resized afterwards grows
      // into the one below it.
      resizeCards(content, sizes, grid) +
      uniformGrid(content, model, grid, new Set(Object.keys(sizes).map((id) => nodeKey(boxOf(id))))) +
      balanceColumns(content, balance, grid) +
      placeColumns(content, model, columns, gap ?? 2 * grid, grid) +
      evenColumns(content, gap, grid) +
      fitFrames(content, model, grid) +
      spreadColumns(content, model, spread, grid);
    const routed = routeLinks(content, model, components, links, ports);
    const placed =
      components === 'generator'
        ? placeGenerators(content, model, generators)
        : placeComponentKinds(content, model, kinds);

    const shapes = placeShapes(content, model);
    report?.({
      bounds: contentBounds(content),
      problems: problems.length,
      cards: Object.keys(model.nodes).length,
      snapped,
      laid,
      routed,
      components: placed + shapes,
    });
  };
