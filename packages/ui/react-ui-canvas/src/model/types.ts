//
// Copyright 2026 DXOS.org
//

//
// Scene engine types (docs/DESIGN.md §4). Plain Effect schemas: no ECHO yet, so the same shapes wrap
// into an ECHO type later without change. A diagram is one scene of typed nodes and typed links; every
// node is a `NodeBase` (centre, size, ports, style) plus the properties its type adds, so the engine
// works on the base and a host composes the scene schema from its own node types (decision 1).
//

import * as Schema from 'effect/Schema';

import { AnimatableAnnotation } from '@dxos/animation';
import { Scene as Dsl } from '@dxos/diagram';
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

/** screen = (scene + {x, y}) * zoom */
export const Camera = Schema.Struct({ x: Schema.Number, y: Schema.Number, zoom: Schema.Number });
export type Camera = Schema.Schema.Type<typeof Camera>;

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

/** Where a diagram shape's heading (a group's name) sits, from the frame's top-left corner, and how it is set. */
export const DiagramHeading = Schema.Struct({
  /** The DSL element the heading came from, so the drawing reads it back under its own id. */
  id: Schema.String,
  x: Schema.Number,
  y: Schema.Number,
  w: Schema.optional(Schema.Number),
  color: Schema.optional(Dsl.Color),
  weight: Schema.optional(Dsl.Weight),
});
export type DiagramHeading = Schema.Schema.Type<typeof DiagramHeading>;

/** The DSL elements a diagram node can be. */
export const DiagramShape = Schema.Union([Dsl.Box, Dsl.Circle, Dsl.Text, Dsl.Portal]);
export type DiagramShape = Schema.Schema.Type<typeof DiagramShape>;

/**
 * A shape of a laid-out diagram (`@dxos/diagram`'s scene DSL), drawn by the renderer that writes the diagram's SVG file
 * (`SvgFile.elementMarkup`) so it reads on the canvas as it does there. The element's geometry is the node's frame and
 * its text the node's `label` (the heading's, when it has one), so a move, a resize or a relabel edits the element.
 */
export const DiagramNode = Schema.Struct({
  type: Schema.Literal('diagram'),
  ...nodeBase,
  ...boxFields,
  element: DiagramShape,
  heading: Schema.optional(DiagramHeading),
});
export type DiagramNode = Schema.Schema.Type<typeof DiagramNode>;

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

/** The engine's own node types. A host may add its own (decision 1); those are `NodeBase` to the engine. */
export const BuiltinNode = Schema.Union([
  RectNode,
  EllipseNode,
  CloudNode,
  PolygonNode,
  PolylineNode,
  NoteNode,
  ViewNode,
  InstanceNode,
  PathNode,
  GeneratorNode,
  DiagramNode,
]);
export type BuiltinNode = Schema.Schema.Type<typeof BuiltinNode>;
export type BuiltinNodeType = BuiltinNode['type'];
export const NODE_TYPES: readonly BuiltinNodeType[] = [
  'rect',
  'ellipse',
  'polygon',
  'cloud',
  'polyline',
  'note',
  'view',
  'instance',
  'path',
  'generator',
  'diagram',
];

/** A node of the scene: the engine handles any `NodeBase`; built-in code narrows with the guards below. */
export type Node = NodeBase;
/** A node type name; the engine's own are `BuiltinNodeType`. */
export type NodeType = string;

/** Narrows a node to one built-in type; sound because the registry maps each type name to one schema. */
export const isRectNode = (node: NodeBase): node is RectNode => node.type === 'rect';
export const isEllipseNode = (node: NodeBase): node is EllipseNode => node.type === 'ellipse';
export const isCloudNode = (node: NodeBase): node is CloudNode => node.type === 'cloud';
export const isPolygonNode = (node: NodeBase): node is PolygonNode => node.type === 'polygon';
export const isPolylineNode = (node: NodeBase): node is PolylineNode => node.type === 'polyline';
export const isNoteNode = (node: NodeBase): node is NoteNode => node.type === 'note';
export const isViewNode = (node: NodeBase): node is ViewNode => node.type === 'view';
export const isInstanceNode = (node: NodeBase): node is InstanceNode => node.type === 'instance';
export const isPathNode = (node: NodeBase): node is PathNode => node.type === 'path';
export const isGeneratorNode = (node: NodeBase): node is GeneratorNode => node.type === 'generator';
export const isDiagramNode = (node: NodeBase): node is DiagramNode => node.type === 'diagram';
/** A node built on the `box` prototype, carrying a centred, editable label. */
export const isBoxNode = (node: NodeBase): node is RectNode | ViewNode => isRectNode(node) || isViewNode(node);
/** Whether a view node draws its child View: as set, else while it has no label to show instead. */
export const showsContents = (node: ViewNode): boolean => node.link?.contents ?? node.label === undefined;
export const isBuiltinNode = (node: NodeBase): node is BuiltinNode => NODE_TYPES.some((type) => type === node.type);

/** Node types stored under an earlier name: `frame` is what `view` was called before the View rename. */
const LEGACY_NODE_TYPES: ReadonlyMap<string, BuiltinNodeType> = new Map([['frame', 'view']]);

/** A node stored under an earlier type name reads as its current type; any other node is returned as it is. */
export const withLegacyNodeType = (node: NodeBase): NodeBase => {
  const type = LEGACY_NODE_TYPES.get(node.type);
  return type ? { ...node, type } : node;
};

/** The settings each type once stored beside the shared fields, which it now keeps in `params`. */
const LEGACY_PARAMS: Readonly<Record<string, readonly string[]>> = { cloud: ['bumps'], polygon: ['sides', 'fit'] };

/** A node storing its type's settings beside the shared fields reads with them in `params`; any other is returned as it is. */
export const withLegacyParams = (node: NodeBase): NodeBase => {
  const keys = (LEGACY_PARAMS[node.type] ?? []).filter((key) => key in node);
  if (keys.length === 0) {
    return node;
  }
  const params: unknown = Reflect.get(node, 'params');
  const lifted = Object.fromEntries(keys.map((key) => [key, Reflect.get(node, key)]));
  const next = { ...node };
  keys.forEach((key) => Reflect.deleteProperty(next, key));
  // A value already in `params` was written later, so it wins over the stored one.
  return Object.assign(next, { params: { ...lifted, ...(typeof params === 'object' ? params : {}) } });
};

//
// Links
//

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

/** Where a diagram connector's caption sits (scene coordinates, its top-left), and how it is set. */
export const DiagramCaption = Schema.Struct({
  x: Schema.Number,
  y: Schema.Number,
  w: Schema.optional(Schema.Number),
  color: Schema.optional(Dsl.Color),
  weight: Schema.optional(Dsl.Weight),
});
export type DiagramCaption = Schema.Schema.Type<typeof DiagramCaption>;

/**
 * A connector of a laid-out diagram, drawn by the diagram's SVG renderer: its relation's markers and dash, and the
 * route the layout gave it (scene coordinates, source end first) for as long as its ends are where the route meets them.
 */
export const DiagramConnector = Schema.Struct({
  relation: Schema.optional(Dsl.Relation),
  head: Schema.optional(Dsl.ArrowHead),
  tail: Schema.optional(Dsl.ArrowTail),
  stroke: Schema.optional(Dsl.Stroke),
  color: Schema.optional(Dsl.Color),
  route: Schema.optional(Schema.Array(Point)),
  caption: Schema.optional(DiagramCaption),
});
export type DiagramConnector = Schema.Schema.Type<typeof DiagramConnector>;

const linkBase = {
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
  /** Drawn as a diagram connector rather than in the canvas's own link style. */
  connector: Schema.optional(DiagramConnector),
};

export const LineLink = Schema.Struct({ type: Schema.Literal('line'), ...linkBase });
export type LineLink = Schema.Schema.Type<typeof LineLink>;

/** Cubic Bézier leaving each port along its side's normal. */
export const CurveLink = Schema.Struct({ type: Schema.Literal('curve'), ...linkBase });
export type CurveLink = Schema.Schema.Type<typeof CurveLink>;

/** Smooth curve through the ports and the control `points` in between, in order. */
export const SplineLink = Schema.Struct({
  type: Schema.Literal('spline'),
  ...linkBase,
  points: Schema.Array(Point),
});
export type SplineLink = Schema.Schema.Type<typeof SplineLink>;

/**
 * Routed between its ends rather than drawn: a stub leaves each port along its side's normal and the
 * route joins the two. Nothing is stored, so the path follows the nodes as they move.
 */
export const SmartLink = Schema.Struct({ type: Schema.Literal('smart'), ...linkBase });
export type SmartLink = Schema.Schema.Type<typeof SmartLink>;

export const Link = Schema.Union([LineLink, CurveLink, SplineLink, SmartLink]);
export type Link = Schema.Schema.Type<typeof Link>;
export type LinkType = Link['type'];
export const LINK_TYPES: readonly LinkType[] = ['line', 'curve', 'spline', 'smart'];

export type Element = Node | Link;

/** The markers a link draws. */
export const linkMarkers = (link: Link): LinkEnds => link.ends ?? {};

export const isNode = (element: Element): element is Node => 'center' in element;
export const isLink = (element: Element): element is Link => 'source' in element;

//
// Scene
//

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

//
// Timeline (ANIMATION.md §5.2)
//

/** The target of the camera's tracks; a node track names the node's id. The camera's are `x`, `y` and `zoom`. */
export const CAMERA_TARGET = 'camera';

/** A plain View, or the definition of a composite object that instances draw (ANIMATION.md §4.1). */
export const ViewKind = Schema.Literals(['view', 'composite']);
export type ViewKind = Schema.Schema.Type<typeof ViewKind>;

/**
 * The View schema over a set of node schemas: a host composes it from its registry's types, so the
 * schema stays exact for every type while the engine only ever sees `NodeBase`.
 */
export const createViewSchema = <const Nodes extends readonly Schema.Codec<NodeBase, unknown>[]>(nodes: Nodes) =>
  Schema.Struct({
    id: Schema.String,
    name: Schema.optional(Schema.String),
    nodes: Schema.Record(Schema.String, Schema.Union(nodes)),
    links: Schema.Record(Schema.String, Link),
    layers: Schema.optional(Schema.Record(Schema.String, Layer)),
    kind: Schema.optional(ViewKind),
    /** An Object the Group command made: kept out of the library until it is named or placed again. */
    anonymous: Schema.optional(Schema.Boolean),
  });

/** The View schema over the built-in node types. */
export const View = createViewSchema([
  RectNode,
  EllipseNode,
  CloudNode,
  PolygonNode,
  PolylineNode,
  NoteNode,
  ViewNode,
  InstanceNode,
  PathNode,
  GeneratorNode,
  DiagramNode,
]);

/** The View schema over any node with the shared fields: what the engine itself can validate for a host. */
export const OpenView = createViewSchema([NodeBase]);
export type View = {
  readonly id: ViewId;
  readonly name?: string;
  readonly nodes: Readonly<Record<NodeId, Node>>;
  readonly links: Readonly<Record<LinkId, Link>>;
  readonly layers?: Readonly<Record<LayerId, Layer>>;
  readonly kind?: ViewKind;
  readonly anonymous?: boolean;
};

/** A View as stored before a rename, read in the current shape: its nodes' legacy type names and settings mapped. */
export const withLegacyView = (view: View): View =>
  Object.values(view.nodes).some((node) => LEGACY_NODE_TYPES.has(node.type) || withLegacyParams(node) !== node)
    ? {
        ...view,
        nodes: Object.fromEntries(
          Object.entries(view.nodes).map(([id, node]) => [id, withLegacyParams(withLegacyNodeType(node))]),
        ),
      }
    : view;

/** A node or link of the View by id. */
export const getElement = (scene: View, id: ElementId): Element | undefined => scene.nodes[id] ?? scene.links[id];

/** Property edits: the shared fields typed, a type's own fields by name. */
export type NodeValues = Partial<Omit<NodeBase, 'id' | 'type'>> & { readonly [key: string]: unknown };
/** Per link type, so a spline's `points` are among the values an `update` may set. */
type ValuesOf<T> = T extends unknown ? Partial<Omit<T, 'id' | 'type'>> : never;
export type LinkValues = ValuesOf<Link>;

/**
 * What the surface asks of a projection (§3). The surface never writes coordinates itself: a
 * projection may apply, rewrite or reject each intent and then re-emits the positioned scene.
 */
export type Intent =
  | { kind: 'move'; ids: NodeId[]; delta: Point }
  | { kind: 'resize'; id: NodeId; bounds: Bounds }
  | { kind: 'link'; link: Link }
  | { kind: 'create'; node: Node }
  | { kind: 'delete'; ids: ElementId[] }
  | { kind: 'reorder'; id: ElementId; z: string }
  /** Property edits (label, text, geometry, control points); `id` and `type` never change. */
  | { kind: 'update'; id: ElementId; values: NodeValues | LinkValues }
  /**
   * Arrange the scene (or just `ids`, when the selection is what the user asked to tidy). An intent
   * rather than a view action, so a projection that owns its own positions may rewrite or refuse it.
   */
  | { kind: 'layout'; ids?: ElementId[] }
  /** Adds a layer, or replaces the one of its id (a rename, a visibility toggle, a move in the order). */
  | { kind: 'layer'; layer: Layer }
  /** Removes a layer and every element on it; the last layer of a scene stays. */
  | { kind: 'removeLayer'; id: LayerId }
  /** Several intents applied as one model change (one undo step), e.g. a paste. */
  | { kind: 'batch'; intents: Intent[] };

export type Capabilities = {
  move?: boolean;
  resize?: boolean;
  link?: boolean;
  create?: boolean;
  delete?: boolean;
  update?: boolean;
  layout?: boolean;
};

/** The active tool: a node type draws that node, a link type is what port drags create. */
export type Tool =
  | { kind: 'select' }
  | { kind: 'hand' }
  | { kind: 'node'; type: NodeType }
  | { kind: 'link'; type: LinkType };
