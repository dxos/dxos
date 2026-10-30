//
// Copyright 2026 DXOS.org
//

// The 2D element base shared by every editor and renderer: the frame, ports, style and endpoints a node or link
// carries, and the built-in node types over it (COMMON-CORE.md decision 12).

import * as Schema from 'effect/Schema';

import { AnimatableAnnotation } from '@dxos/animation';
import { Annotation } from '@dxos/echo';
import { HueAnnotationId, NumberLayoutAnnotationId, StepAnnotationId, VECTOR_AXIS_LAYOUT } from '@dxos/ui-types';

export const Point = Schema.Struct({ x: Schema.Number, y: Schema.Number });
export type Point = Schema.Schema.Type<typeof Point>;

export const Size = Schema.Struct({ width: Schema.Number, height: Schema.Number });
export type Size = Schema.Schema.Type<typeof Size>;

/** Minor grid spacing in scene px (the finest line the grid draws at zoom 1). */
export const DEFAULT_GRID = 16;

/** Major lines every N minor lines; the grid draws both and snapping uses the major one. */
export const MAJOR_GRID_RATIO = 4;

/** Snap unit: nodes, layout defaults and scene bounds align to it. */
export const MAJOR_GRID = DEFAULT_GRID * MAJOR_GRID_RATIO;

/** Two fields side by side in a form, rather than one row each. */
const pairLayout = (first: string, second: string) =>
  `<grid cols="2" fixed="true"><field name="${first}"/><field name="${second}"/></grid>`;

/** A node coordinate as a form edits it: the stepper moves by one minor grid cell, as an arrow nudge does. */
const gridNumber = (title: string) =>
  Schema.Number.annotate({ title, [StepAnnotationId]: DEFAULT_GRID, [NumberLayoutAnnotationId]: VECTOR_AXIS_LAYOUT });

/** `Point` and `Size` for a node's own frame, laid out as one row each in the properties form. */
const NodeCenter = Schema.Struct({ x: gridNumber('X'), y: gridNumber('Y') })
  .pipe(Annotation.FormLayoutAnnotation.set({ [Annotation.DEFAULT_LAYOUT_NAME]: pairLayout('x', 'y') }))
  .pipe(AnimatableAnnotation.set('point'));
const NodeSize = Schema.Struct({ width: gridNumber('Width'), height: gridNumber('Height') })
  .pipe(Annotation.FormLayoutAnnotation.set({ [Annotation.DEFAULT_LAYOUT_NAME]: pairLayout('width', 'height') }))
  .pipe(AnimatableAnnotation.set('size'));

export const Bounds = Schema.Struct({
  x: Schema.Number,
  y: Schema.Number,
  width: Schema.Number,
  height: Schema.Number,
});
export type Bounds = Schema.Schema.Type<typeof Bounds>;

export type NodeId = string;
export type LinkId = string;
/** A node or link id; the two namespaces never collide within a scene. */
export type ElementId = string;
export type ViewId = string;
export type PortId = string;

export const Side = Schema.Literals(['n', 'e', 's', 'w']);
export type Side = Schema.Schema.Type<typeof Side>;

/** What a port takes: links leaving it, links arriving at it, or either (the default). */
export const PortDirection = Schema.Literals(['in', 'out', 'any']);
export type PortDirection = Schema.Schema.Type<typeof PortDirection>;

/** An attachment point on a node's frame: a side, a 0..1 offset along it, and what it accepts. */
export const Port = Schema.Struct({
  id: Schema.String,
  side: Side,
  offset: Schema.Number,
  accepts: Schema.optional(PortDirection),
});
export type Port = Schema.Schema.Type<typeof Port>;

//
// Nodes
//

/** The hues the style pickers offer, neutral first, then in hue order; any theme hue still renders on a node. */
export const STYLE_HUES = ['neutral', 'red', 'orange', 'amber', 'green', 'teal', 'sky', 'blue', 'violet'] as const;
export const StyleHue = Schema.Literals(STYLE_HUES);
export type StyleHue = Schema.Schema.Type<typeof StyleHue>;

/** How strongly a hue fills a frame: 0 is an outline (transparent), 1 to 3 are stronger to lighter fills. */
export const NodeTone = Schema.Literals([0, 1, 2, 3]);
export type NodeTone = Schema.Schema.Type<typeof NodeTone>;

/** The typefaces a shape's text may use: the theme's body face, or its fixed-width one. */
export const FONT_FAMILIES = ['default', 'monospace'] as const;
export type FontFamily = (typeof FONT_FAMILIES)[number];

/** Where text sits across a shape, and down it. */
export const HORIZONTAL_ALIGNS = ['left', 'center', 'right'] as const;
export const VERTICAL_ALIGNS = ['top', 'middle', 'bottom'] as const;
export type HorizontalAlign = (typeof HORIZONTAL_ALIGNS)[number];
export type VerticalAlign = (typeof VERTICAL_ALIGNS)[number];

/** How a line is drawn: a link's stroke, or a node's border. */
export const LINE_STYLES = ['solid', 'dashed', 'dotted'] as const;

/**
 * The common base style every element shares, nodes and links alike: its colour and its line. Each kind extends it
 * (`NodeStyle`), and a selection of several kinds edits only what they share. One field object per property, so
 * the kinds declare the same field and the properties panel sees it as shared.
 */
export const lineStyleFields = {
  /** One of the theme's hues: a link's stroke; a node's fill, text and border together. */
  hue: Schema.optional(Schema.String.annotate({ title: 'Hue', [HueAnnotationId]: true })),
  /** Solid, dashed or dotted: a link's stroke, or a node's border. */
  lineStyle: Schema.optional(Schema.Literals(LINE_STYLES).annotate({ title: 'Line style' })),
};

/** Text size in scene units; unset is the element's own (stored values outside the editor's range are kept). */
const fontSizeField = Schema.optional(Schema.Number.annotate({ title: 'Font size' }));

/** A link's style: the common base and its caption's size, unset drawn neutral, solid and small. */
export const LineStyle = Schema.Struct({ ...lineStyleFields, fontSize: fontSizeField });
export type LineStyle = Schema.Schema.Type<typeof LineStyle>;

/** A shape's text size in scene units when its style sets none. */
export const DEFAULT_FONT_SIZE = 24;

/** A link caption's text size in scene units when its style sets none. */
export const LINK_FONT_SIZE = 14;

/**
 * The common base plus a frame and text: what a shape draws. A shape with more to style extends it
 * (`Schema.Struct({ ...styleFields, … })`).
 */
export const styleFields = {
  hue: lineStyleFields.hue,
  /** The hue's fill; unset is 2, the look a hue had before tones. */
  tone: Schema.optional(NodeTone),
  /** How opaque the whole node draws, 0 to 1; unset is 1. */
  opacity: Schema.optional(
    Schema.Number.pipe(Schema.check(Schema.isBetween({ minimum: 0, maximum: 1 })))
      .annotate({ title: 'Opacity', [StepAnnotationId]: 0.1 })
      .pipe(AnimatableAnnotation.set('number')),
  ),
  lineStyle: lineStyleFields.lineStyle,
  rounded: Schema.optional(Schema.Boolean),
  fill: Schema.optional(Schema.Boolean),
  border: Schema.optional(Schema.Boolean),
  /** A guide: drawn dashed and unfilled, an annotation rather than content. */
  guide: Schema.optional(Schema.Boolean),
  /** The face of the shape's text; unset is the theme's body face. */
  fontFamily: Schema.optional(Schema.Literals(FONT_FAMILIES).annotate({ title: 'Font' })),
  /** Unset is `DEFAULT_FONT_SIZE`; the same field as a link's, so a mixed selection edits it once. */
  fontSize: fontSizeField,
  /** Where the text sits across the shape; unset is the type's own (a label centres, a note starts at the left). */
  alignHorizontal: Schema.optional(Schema.Literals(HORIZONTAL_ALIGNS).annotate({ title: 'Horizontal' })),
  /** Where the text sits down the shape; unset is the type's own (a label is middled, a note starts at the top). */
  alignVertical: Schema.optional(Schema.Literals(VERTICAL_ALIGNS).annotate({ title: 'Vertical' })),
};

/** Presentation choices a node carries: the shape style. */
export const NodeStyle = Schema.Struct(styleFields);
export type NodeStyle = Schema.Schema.Type<typeof NodeStyle>;

/** The fields every node type shares; a type's schema is `Schema.Struct({ ...nodeBase, type: Literal, ... })`. */
export const nodeBase = {
  id: Schema.String,
  /** Fractional z-order key (see `order.ts`). */
  z: Schema.String,
  locked: Schema.optional(Schema.Boolean),
  center: NodeCenter,
  /** The frame is `size` centred on `center`, whatever the type draws inside it. */
  size: NodeSize,
  /** Degrees clockwise about `center`; unset is 0. */
  rotation: Schema.optional(
    Schema.Number.pipe(Schema.check(Schema.isBetween({ minimum: -360, maximum: 360 })))
      .annotate({ title: 'Rotation', [StepAnnotationId]: 15 })
      .pipe(AnimatableAnnotation.set('number')),
  ),
  /** Per-node ports; absent means the node type's definition supplies them (decision 12). */
  ports: Schema.optional(Schema.Array(Port)),
  /** Ports spread along each side, overriding the type's layout; ignored when the node carries `ports`. */
  portsPerSide: Schema.optional(Schema.Number.annotate({ title: 'Ports per side' })),
  /** A style class of the drawing (`StyleClass`) the node takes its look from; its own `style` wins over it. */
  /** The scene layer the element is on; unset, or naming no layer of the scene, it is on the bottom one. */
  layer: Schema.optional(Schema.String.annotate({ title: 'Layer' })),
  class: Schema.optional(Schema.String.annotate({ title: 'Class' })),
  style: Schema.optional(NodeStyle),
  /**
   * Inside a composite, the node offers a port on every instance's frame where it meets it, so links from outside the
   * instance attach to it (ANIMATION.md §4.1).
   */
  exposed: Schema.optional(Schema.Boolean.annotate({ title: 'Exposed' })),
};

/** Any node as the engine sees it: the shared fields and a type name; the registry knows the rest. */
export const NodeBase = Schema.Struct({ type: Schema.String, ...nodeBase });
export type NodeBase = Schema.Schema.Type<typeof NodeBase>;

/** The fields of the `box` prototype (a framed shape with a centred label), shared by the types built on it. */
export const boxFields = {
  label: Schema.optional(Schema.String),
};

/**
 * The core base every node falls back to: its frame, ports, style and `label`. A node whose type the registry does
 * not know (its plugin is off) is drawn and edited as this, a box showing its label, so a type that keeps its title
 * in `label` still reads as itself.
 */
export const BaseNode = Schema.Struct({ type: Schema.String, ...nodeBase, ...boxFields });
export type BaseNode = Schema.Schema.Type<typeof BaseNode>;

export const RectNode = Schema.Struct({
  type: Schema.Literal('rect'),
  ...nodeBase,
  ...boxFields,
});
export type RectNode = Schema.Schema.Type<typeof RectNode>;

/** An ellipse inscribed in the frame. */
export const EllipseNode = Schema.Struct({
  type: Schema.Literal('ellipse'),
  ...nodeBase,
  label: Schema.optional(Schema.String),
});
export type EllipseNode = Schema.Schema.Type<typeof EllipseNode>;

/** A cloud's own settings, in its `params`. */
export const CloudParams = Schema.Struct({
  /** Bumps around the outline; unset, `DEFAULT_CLOUD_BUMPS`. */
  bumps: Schema.optional(
    Schema.Number.check(Schema.isInt(), Schema.isBetween({ minimum: 3, maximum: 24 })).annotate({ title: 'Bumps' }),
  ),
}).annotate({ title: 'Cloud' });
export type CloudParams = Schema.Schema.Type<typeof CloudParams>;

/** A cloud filling the frame, its outline a ring of bumps; labelled like a box. */
export const CloudNode = Schema.Struct({
  type: Schema.Literal('cloud'),
  ...nodeBase,
  ...boxFields,
  params: Schema.optional(CloudParams),
});
export type CloudNode = Schema.Schema.Type<typeof CloudNode>;

/**
 * How a polygon sits in its frame: `frame` scales it to fill the frame, centred by its own bounds; `circle` puts its
 * vertices on the circle that fits the frame, centred on it.
 */
export const POLYGON_FITS = ['frame', 'circle'] as const;
export type PolygonFit = (typeof POLYGON_FITS)[number];

/** A polygon's own settings, in its `params`. */
export const PolygonParams = Schema.Struct({
  /** Unset, `DEFAULT_POLYGON_SIDES`. */
  sides: Schema.optional(
    Schema.Number.check(Schema.isInt(), Schema.isBetween({ minimum: 3, maximum: 24 })).annotate({ title: 'Sides' }),
  ),
  /** Unset, `frame`. */
  fit: Schema.optional(Schema.Literals(POLYGON_FITS).annotate({ title: 'Fit' })),
})
  .pipe(Annotation.FormLayoutAnnotation.set({ [Annotation.DEFAULT_LAYOUT_NAME]: pairLayout('sides', 'fit') }))
  .annotate({ title: 'Polygon' });
export type PolygonParams = Schema.Schema.Type<typeof PolygonParams>;

/** A regular polygon, as large as fits the frame and centred in it, a vertex at the top; labelled like a box. */
export const PolygonNode = Schema.Struct({
  type: Schema.Literal('polygon'),
  ...nodeBase,
  ...boxFields,
  params: Schema.optional(PolygonParams),
});
export type PolygonNode = Schema.Schema.Type<typeof PolygonNode>;

/** A polyline's own settings, in its `params`. */
export const PolylineParams = Schema.Struct({
  /** Unset, the line is open: drawn as a stroke alone, with no fill. */
  closed: Schema.optional(Schema.Boolean.annotate({ title: 'Closed' })),
}).annotate({ title: 'Polyline' });
export type PolylineParams = Schema.Schema.Type<typeof PolylineParams>;

/**
 * An irregular line of straight segments through `points`, in the frame's unit space (0..1 of its size, origin
 * top-left) so a resize scales it; closed, it is a filled outline like a polygon. Labelled like a box.
 */
export const PolylineNode = Schema.Struct({
  type: Schema.Literal('polyline'),
  ...nodeBase,
  ...boxFields,
  points: Schema.Array(Point),
  params: Schema.optional(PolylineParams),
});
export type PolylineNode = Schema.Schema.Type<typeof PolylineNode>;

/** Free text on the canvas. Named for what it is, so a host may keep `text` for a type of its own. */
export const NoteNode = Schema.Struct({
  type: Schema.Literal('note'),
  ...nodeBase,
  text: Schema.String,
});
export type NoteNode = Schema.Schema.Type<typeof NoteNode>;

/**
 * What a frame links to and how it shows it. A host extends the struct with its own target (an object reference)
 * ahead of these fields, so the panel's Link section lists the target before how it is shown.
 */
export const viewLinkFields = {
  /** Draw the linked View inside the node rather than the label; unset, it does so while there is no label. */
  contents: Schema.optional(Schema.Boolean.annotate({ title: 'Show contents' })),
};

export const ViewLink = Schema.Struct(viewLinkFields).annotate({ title: 'Link' });
export type ViewLink = Schema.Schema.Type<typeof ViewLink>;

/** A View onto the next depth: renders its child View (`scene`, the stored field name) scaled into its bounds. */
export const ViewNode = Schema.Struct({
  type: Schema.Literal('view'),
  ...nodeBase,
  ...boxFields,
  scene: Schema.String,
  link: Schema.optional(ViewLink),
});
export type ViewNode = Schema.Schema.Type<typeof ViewNode>;

/** How an instance draws its composite in its frame: scaled uniformly to fit inside, to fill it, or at true size. */
export const INSTANCE_FITS = ['fit', 'fill', 'none'] as const;
export type InstanceFit = (typeof INSTANCE_FITS)[number];

/**
 * A composite object placed in a scene (ANIMATION.md §4.1): it draws the composite scene `composite` scaled into its
 * frame. Every instance shares the definition; `overrides` set values of the definition's nodes for this instance
 * alone, shallow per field.
 */
export const InstanceNode = Schema.Struct({
  type: Schema.Literal('instance'),
  ...nodeBase,
  composite: Schema.String,
  overrides: Schema.optional(Schema.Record(Schema.String, Schema.Record(Schema.String, Schema.Unknown))),
  fit: Schema.optional(Schema.Literals(INSTANCE_FITS).annotate({ title: 'Fit' })),
});
export type InstanceNode = Schema.Schema.Type<typeof InstanceNode>;

/**
 * A vector shape: SVG path data in its own coordinates (`viewBox`), scaled to fill the frame and filled with the
 * node's hue. How a logo or a glyph becomes canvas nodes.
 */
export const PathNode = Schema.Struct({
  type: Schema.Literal('path'),
  ...nodeBase,
  d: Schema.String,
  viewBox: Bounds,
  /** An exact CSS colour, for artwork with brand colours; unset, the path takes its hue's text colour. */
  fill: Schema.optional(Schema.String.annotate({ title: 'Fill colour' })),
});
export type PathNode = Schema.Schema.Type<typeof PathNode>;

/**
 * A node whose content an agent-written generator computes from its parameters and the time (ANIMATION.md §6): the
 * generator is a `Generator` object the host resolves by `generator` (a reference string), and `params` are its
 * parameters, which the timeline may key (`params.<name>`).
 */
export const GeneratorNode = Schema.Struct({
  type: Schema.Literal('generator'),
  ...nodeBase,
  generator: Schema.String,
  params: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
  /** Seeds the generator's random numbers; derived from the node's id when unset. */
  seed: Schema.optional(Schema.Number),
});
export type GeneratorNode = Schema.Schema.Type<typeof GeneratorNode>;

/** A link end on a node; no `port` means automatic (the closest appropriate pair, recomputed on every projection). */
export const PortEndpoint = Schema.Struct({
  node: Schema.String,
  port: Schema.optional(Schema.String),
});
export type PortEndpoint = Schema.Schema.Type<typeof PortEndpoint>;

/** A free link end at a scene point (decision 3): an arrow or path that starts or ends on nothing. */
export const PointEndpoint = Schema.Struct({ point: Point });
export type PointEndpoint = Schema.Schema.Type<typeof PointEndpoint>;

export const Endpoint = Schema.Union([PortEndpoint, PointEndpoint]);
export type Endpoint = Schema.Schema.Type<typeof Endpoint>;

export const isPointEndpoint = (end: Endpoint): end is PointEndpoint => 'point' in end;
/** The node an end is attached to; a free end has none. */
export const endpointNode = (end: Endpoint): NodeId | undefined => ('node' in end ? end.node : undefined);

/** What is drawn at a link end. */
/** An end marker: a filled `arrow`, a `circle`, or a hollow `triangle` (inheritance). */
export const Marker = Schema.Literals(['arrow', 'circle', 'triangle']);
export type Marker = Schema.Schema.Type<typeof Marker>;

/** Markers at the source (`start`) and target (`end`) of a link. */
/** A link's end markers; the properties form shows them side by side, as the two ends of the line. */
export const LinkEnds = Schema.Struct({
  start: Schema.optional(Marker),
  end: Schema.optional(Marker),
}).pipe(Annotation.FormLayoutAnnotation.set({ [Annotation.DEFAULT_LAYOUT_NAME]: pairLayout('start', 'end') }));
export type LinkEnds = Schema.Schema.Type<typeof LinkEnds>;

/**
 * A named look of a drawing, kept beside its scenes: the nodes and links naming it derive their `style` from it (a
 * link takes the common base, its colour and line style), so one class restyles both together.
 */
export const StyleClass = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  style: Schema.optional(NodeStyle),
});
export type StyleClass = Schema.Schema.Type<typeof StyleClass>;

/** A drawing's style classes by id. */
export type StyleMap = Readonly<Record<string, StyleClass>>;

/** The fields every link type shares; a type's schema is `Schema.Struct({ type: Literal, ...linkBase })`. */
export const linkBase = {
  id: Schema.String,
  z: Schema.String,
  locked: Schema.optional(Schema.Boolean),
  source: Endpoint,
  target: Endpoint,
  /** End markers; an arrow at `end` reads as the link's direction. */
  ends: Schema.optional(LinkEnds),
  /** A caption drawn at the middle of the link's route. */
  text: Schema.optional(Schema.String.annotate({ title: 'Label' })),
  /** A style class of the drawing the link takes its style from; its own `style` wins over it. */
  /** The scene layer the element is on; unset, or naming no layer of the scene, it is on the bottom one. */
  layer: Schema.optional(Schema.String.annotate({ title: 'Layer' })),
  class: Schema.optional(Schema.String.annotate({ title: 'Class' })),
  style: Schema.optional(LineStyle),
};

/** A layer id, unique within its scene. */
export type LayerId = string;

/**
 * A scene's layer: elements paint by their layer's order (`z`, bottom first), then by their own `z`. A hidden layer
 * is neither drawn nor hit. A scene with no layers has one, implicitly (`DEFAULT_LAYER`).
 */
export const Layer = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  /** Fractional order key (see `order.ts`): the bottom layer has the least. */
  z: Schema.String,
  hidden: Schema.optional(Schema.Boolean),
});
export type Layer = Schema.Schema.Type<typeof Layer>;
