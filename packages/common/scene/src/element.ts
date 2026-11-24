//
// Copyright 2026 DXOS.org
//

// The 2D element base shared by every editor and renderer: the frame, ports, style and endpoints a node or link
// carries, and the built-in node types over it (COMMON-CORE.md decision 12).

import * as Schema from 'effect/Schema';

import { AnimatableAnnotation } from '@dxos/animation';
import { Annotation } from '@dxos/echo';
import {
  HueAnnotationId,
  NumberLayoutAnnotationId,
  StepAnnotationId,
  VECTOR_AXIS_LAYOUT,
  VectorAnnotationId,
} from '@dxos/ui-types';

import { Color } from './color.ts';
import * as Shape from './shape.ts';
import { Font } from './theme.ts';
import { Align, Bounds, Corners, Fill, Point, Side, Stroke, VerticalAlign, Weight } from './vocabulary.ts';

export * from './vocabulary.ts';

/** Minor grid spacing in scene px (the finest line the grid draws at zoom 1). */
export const DEFAULT_GRID = 12;

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

/** `Point` and `Size` for a node's own frame; a form stacks one number input per axis. */
const NodeCenter = Schema.Struct({ x: gridNumber('X'), y: gridNumber('Y') })
  .annotate({ [VectorAnnotationId]: true })
  .pipe(AnimatableAnnotation.set('point'));
const NodeSize = Schema.Struct({ width: gridNumber('Width'), height: gridNumber('Height') })
  .annotate({ [VectorAnnotationId]: true })
  .pipe(AnimatableAnnotation.set('size'));

export type NodeId = string;
export type LinkId = string;
/** A node or link id; the two namespaces never collide within a scene. */
export type ElementId = string;
export type ViewId = string;
export type PortId = string;

/** What a port takes: links leaving it, links arriving at it, or either (the default). */
export const PortDirection = Schema.Literals(['in', 'out', 'any']);
export type PortDirection = Schema.Schema.Type<typeof PortDirection>;

/**
 * An attachment point on a node, as a fraction of its frame: `0,0` is the frame's top-left corner and `1,1` its
 * bottom-right, so the port keeps its place however the node is resized. The same point a draw.io stencil's
 * `<constraint x y>` states.
 */
export const Port = Schema.Struct({
  id: Schema.String,
  x: Schema.Number,
  y: Schema.Number,
  /** The side a link leaves the port from; unset, the side of the frame the port is nearest. */
  side: Schema.optional(Side),
  accepts: Schema.optional(PortDirection),
});
export type Port = Schema.Schema.Type<typeof Port>;

/** A port on a side of the frame, `offset` (0..1) along it from its left or top end. */
export const sidePort = (id: PortId, side: Side, offset: number, accepts?: PortDirection): Port => ({
  id,
  x: side === 'left' ? 0 : side === 'right' ? 1 : offset,
  y: side === 'top' ? 0 : side === 'bottom' ? 1 : offset,
  side,
  ...(accepts !== undefined ? { accepts } : {}),
});

/** The side a link leaves a port from: the one it states, else the side of the frame it is nearest (top first). */
export const portSide = (port: Pick<Port, 'x' | 'y' | 'side'>): Side => {
  if (port.side !== undefined) {
    return port.side;
  }
  const distances: readonly [Side, number][] = [
    ['top', port.y],
    ['right', 1 - port.x],
    ['bottom', 1 - port.y],
    ['left', port.x],
  ];
  return distances.reduce((nearest, candidate) => (candidate[1] < nearest[1] ? candidate : nearest))[0];
};

/** How far along its side a port sits, 0..1 from the side's left or top end. */
export const portOffset = (port: Pick<Port, 'x' | 'y' | 'side'>): number => {
  const side = portSide(port);
  return side === 'top' || side === 'bottom' ? port.x : port.y;
};

//
// Nodes
//

/** The hues the style pickers offer, neutral first, then in hue order; any theme hue still renders on a node. */
export const STYLE_HUES = ['neutral', 'red', 'orange', 'amber', 'green', 'teal', 'sky', 'blue', 'violet'] as const;
export const StyleHue = Schema.Literals(STYLE_HUES);
export type StyleHue = Schema.Schema.Type<typeof StyleHue>;

/** How strongly a colour fills a frame: 0 is an outline (transparent), 1 to 3 are stronger to lighter fills. */
export const NodeTone = Schema.Literals([0, 1, 2, 3]);
export type NodeTone = Schema.Schema.Type<typeof NodeTone>;

/** The levels a text colour is drawn at, light to dark. */
export const TEXT_TONES = [1, 2, 3] as const;
export const TextTone = Schema.Literals(TEXT_TONES);
export type TextTone = Schema.Schema.Type<typeof TextTone>;

/**
 * The common base style every element shares, nodes and links alike: its colour and its line. Each kind extends it
 * (`Style2D`), and a selection of several kinds edits only what they share. One field object per property, so
 * the kinds declare the same field and the properties panel sees it as shared.
 */
export const lineStyleFields = {
  /** A link's stroke; a node's fill, text and border together. */
  color: Schema.optional(Color.annotate({ title: 'Color', [HueAnnotationId]: true })),
  /** A link's line, or a node's border. */
  stroke: Schema.optional(Stroke.annotate({ title: 'Stroke' })),
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
  color: lineStyleFields.color,
  /** How opaque the whole node draws, 0 to 1; unset is 1. */
  opacity: Schema.optional(
    Schema.Number.pipe(Schema.check(Schema.isBetween({ minimum: 0, maximum: 1 })))
      .annotate({ title: 'Opacity', [StepAnnotationId]: 0.1 })
      .pipe(AnimatableAnnotation.set('number')),
  ),
  stroke: lineStyleFields.stroke,
  /** Unset, a closed shape is filled with its colour. */
  fill: Schema.optional(Fill.annotate({ title: 'Fill' })),
  corners: Schema.optional(Corners.annotate({ title: 'Corners' })),
  weight: Schema.optional(Weight.annotate({ title: 'Weight' })),
  /** A guide: drawn dashed and unfilled, an annotation rather than content. */
  guide: Schema.optional(Schema.Boolean),
  /** The theme slot the shape's text is set in; unset is the theme's body face. */
  font: Schema.optional(Font),
  /** Unset is `DEFAULT_FONT_SIZE`; the same field as a link's, so a mixed selection edits it once. */
  fontSize: fontSizeField,
  /** The text alone; unset, the text takes the colour the shape's colour and fill give it. */
  textColor: Schema.optional(Color.annotate({ title: 'Text' })),
  /** Where the text sits across the shape; unset is the kind's own (a label centres, a note starts at the left). */
  align: Schema.optional(Align.annotate({ title: 'Horizontal' })),
  /** Where the text sits down the shape; unset is the kind's own (a label is middled, a note starts at the top). */
  valign: Schema.optional(VerticalAlign.annotate({ title: 'Vertical' })),
};

/** A 2D look: what a node draws with, and what a model's named style states. */
export const Style2D = Schema.Struct(styleFields);
export type Style2D = Schema.Schema.Type<typeof Style2D>;

/** A node's style is the 2D look. */
export const NodeStyle = Style2D;
export type NodeStyle = Style2D;

/**
 * How a part of a composite follows its frame on one axis when an instance is resized (ANIMATION.md §4.1): `min`
 * pins it to the left or top edge, `max` to the right or bottom, `stretch` makes both of its edges follow, `center`
 * keeps its offset from the middle, and `scale` keeps its proportion of the axis.
 */
export const PartConstraint = Schema.Literals(['min', 'max', 'stretch', 'center', 'scale']);
export type PartConstraint = Schema.Schema.Type<typeof PartConstraint>;

/**
 * A part's constraint on each axis. An axis left unset is `scale`, which is the uniform fit every composite had
 * before constraints existed, so an Object written by an older editor keeps drawing as it did.
 */
export const PartLayout = Schema.Struct({
  x: Schema.optional(PartConstraint.annotate({ title: 'Horizontal' })),
  y: Schema.optional(PartConstraint.annotate({ title: 'Vertical' })),
}).pipe(Annotation.FormLayoutAnnotation.set({ [Annotation.DEFAULT_LAYOUT_NAME]: pairLayout('x', 'y') }));
export type PartLayout = Schema.Schema.Type<typeof PartLayout>;

/** The constraint field a node and a link both carry; read only while the element is a part of a composite. */
export const constrainFields = {
  constrain: Schema.optional(PartLayout.annotate({ title: 'Constrain' })),
};

/** How an instance draws its composite in its frame: scaled uniformly to fit inside, to fill it, or at true size. */
export const INSTANCE_FITS = ['fit', 'fill', 'none'] as const;
export const InstanceFit = Schema.Literals(INSTANCE_FITS);
export type InstanceFit = Schema.Schema.Type<typeof InstanceFit>;

/** The fields every node kind shares; a kind's schema is `Schema.Struct({ ...nodeBase, kind: Literal, ... })`. */
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
  /** Per-node ports; absent means the node kind's definition supplies them (decision 12). */
  ports: Schema.optional(Schema.Array(Port)),
  /** Ports spread along each side, overriding the kind's layout; ignored when the node carries `ports`. */
  portsPerSide: Schema.optional(Schema.Number.annotate({ title: 'Ports per side' })),
  /** The scene layer the element is on; unset, or naming no layer of the scene, it is on the bottom one. */
  layer: Schema.optional(Schema.String.annotate({ title: 'Layer' })),
  /** A named style of the drawing (`StyleClass`) the node takes its look from; its own `overrides` win over it. */
  style: Schema.optional(Schema.String.annotate({ title: 'Style' })),
  /** The node's own look, field by field over its named style. */
  overrides: Schema.optional(Style2D),
  /**
   * Inside a composite, the node offers a port on every instance's frame where it meets it, so links from outside the
   * instance attach to it (ANIMATION.md §4.1).
   */
  exposed: Schema.optional(Schema.Boolean.annotate({ title: 'Exposed' })),
  /**
   * Inside a composite, the field of the Instance this part shows (`bind: 'attributes'`): the part draws the
   * Instance's own value and typing in it writes that value back, so a tool keeps its typed data on the Instance
   * while the composite says how it is laid out.
   */
  bind: Schema.optional(Schema.String.annotate({ title: 'Bind' })),
  /**
   * Inside a composite, the part may be turned off on one Instance: the Properties panel shows a switch for it, so a
   * tool offers a card without a footer without needing a second definition.
   */
  optional: Schema.optional(Schema.Boolean.annotate({ title: 'Optional' })),
  /** The part is not drawn. An Instance turns an optional part off by overriding this, which is its own alone. */
  hidden: Schema.optional(Schema.Boolean.annotate({ title: 'Hidden' })),
  /**
   * Inside a composite, the parts whose room this one takes when they are hidden (`grow: 'footer'`, several separated
   * by spaces): a card with its footer off grows its body into the space rather than leaving a gap.
   */
  grow: Schema.optional(Schema.String.annotate({ title: 'Grow' })),
  /**
   * Inside a composite, the part this one belongs to: it is not drawn whenever that one is hidden, so a card's
   * hairline goes with the footer it underlines rather than floating over nothing.
   */
  follows: Schema.optional(Schema.String.annotate({ title: 'Follows' })),
  /**
   * The composite Object this node draws, where it places one: the generic `instance` always, and a kind of its own
   * that declares a template. Naming one is what makes a node a {@link PlacedComposite}.
   */
  composite: Schema.optional(Schema.String),
  /**
   * Values of the composite's parts set for this node alone, by part id and shallow per field (`overrides` merges per
   * key): what makes one card's own text, and the parts it switches off, its own while every card draws the same
   * Object. Read only where the node names a `composite`.
   */
  partOverrides: Schema.optional(Schema.Record(Schema.String, Schema.Record(Schema.String, Schema.Unknown))),
  /**
   * The hull this node is inside, by id, in the scene the 2D editor draws. It is not how a hull is stored: a hull is
   * a group, an Instance (`hull`) whose parts are the nodes inside it, and the editor reads that group opened out so
   * its nodes stand in the scene beside everything else, each naming the hull it came from.
   */
  parent: Schema.optional(Schema.String.annotate({ title: 'Parent' })),
  /**
   * The size the node keeps in the cell a grid gives it; an axis left out fills the cell. The node's own `size` is
   * that grid's result, so the size it asks for has to be kept apart from it.
   */
  extent: Schema.optional(
    Schema.Struct({ width: Schema.optional(Schema.Number), height: Schema.optional(Schema.Number) }),
  ),
  ...constrainFields,
};

/** Any node as the engine sees it: the shared fields and a kind name; the registry knows the rest. */
export const NodeBase = Schema.Struct({ kind: Schema.String, ...nodeBase });
export type NodeBase = Schema.Schema.Type<typeof NodeBase>;

/** The fields of the `box` prototype (a framed shape with a centred label), shared by the kinds built on it. */
export const boxFields = {
  label: Schema.optional(Schema.String),
};

/**
 * The core base every node falls back to: its frame, ports, style and `label`. A node whose type the registry does
 * not know (its plugin is off) is drawn and edited as this, a box showing its label, so a type that keeps its title
 * in `label` still reads as itself.
 */
/**
 * Space between a shape's frame and the text it draws, in scene px, as a font size is. Unset, a text box pads
 * itself by a minor grid cell either side, which is what puts its lines on the grid, and above and below by half a
 * cell for a label, a hull's name included (12 and 6 at the default grid), or a whole one for a text node. Zero puts
 * the text on the frame's edge, as a part of a composite card must be to sit where the card's own regions sit.
 */
export const Padding = Schema.Struct({
  x: Schema.optional(Schema.Number.annotate({ title: 'X' })),
  y: Schema.optional(Schema.Number.annotate({ title: 'Y' })),
}).pipe(Annotation.FormLayoutAnnotation.set({ [Annotation.DEFAULT_LAYOUT_NAME]: pairLayout('x', 'y') }));
export type Padding = Schema.Schema.Type<typeof Padding>;

/** The fields of a shape whose text is inset from its frame: every shape that draws a label, and the text node. */
export const paddingFields = {
  padding: Schema.optional(Padding.annotate({ title: 'Padding' })),
};

/** A node's padding, when its kind carries the field and the node sets it. */
export const nodePadding = (node: NodeBase): Padding | undefined => {
  const padding: unknown = Reflect.get(node, 'padding');
  if (typeof padding !== 'object' || padding === null) {
    return undefined;
  }
  const at = (field: string) => {
    const value = Reflect.get(padding, field);
    return typeof value === 'number' ? value : undefined;
  };
  const [x, y] = [at('x'), at('y')];
  return x === undefined && y === undefined
    ? undefined
    : { ...(x !== undefined ? { x } : {}), ...(y !== undefined ? { y } : {}) };
};

export const BaseNode = Schema.Struct({ kind: Schema.String, ...nodeBase, ...boxFields });
export type BaseNode = Schema.Schema.Type<typeof BaseNode>;

export const RectNode = Schema.Struct({
  kind: Schema.Literal('rect'),
  ...nodeBase,
  ...boxFields,
  ...paddingFields,
});
export type RectNode = Schema.Schema.Type<typeof RectNode>;

/** An ellipse inscribed in the frame. */
export const EllipseNode = Schema.Struct({
  kind: Schema.Literal('ellipse'),
  ...nodeBase,
  label: Schema.optional(Schema.String),
  ...paddingFields,
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
  kind: Schema.Literal('cloud'),
  ...nodeBase,
  ...boxFields,
  ...paddingFields,
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
  kind: Schema.Literal('polygon'),
  ...nodeBase,
  ...boxFields,
  ...paddingFields,
  params: Schema.optional(PolygonParams),
});
export type PolygonNode = Schema.Schema.Type<typeof PolygonNode>;

/**
 * A shape a recipe draws (an arrow, a callout, a star): `recipe` names it, and the recipe makes the outline from the
 * frame and `params`, each parameter measured against what the recipe says (a side of the frame, or scene px), so a
 * part keeps its proportions however the frame is resized. A recipe unknown to a build is drawn as its frame.
 * Labelled like a box.
 */
export const ShapeNode = Schema.Struct({
  kind: Schema.Literal('shape'),
  ...nodeBase,
  ...boxFields,
  ...paddingFields,
  recipe: Schema.String,
  /** The recipe's parameters by id; one unset takes the recipe's default. */
  params: Schema.optional(Schema.Record(Schema.String, Schema.Number)),
});
export type ShapeNode = Schema.Schema.Type<typeof ShapeNode>;

/** A polyline's own settings, in its `params`. */
export const PolylineParams = Schema.Struct({
  /** Unset, the line is open: drawn as a stroke alone, with no fill. */
  closed: Schema.optional(Schema.Boolean.annotate({ title: 'Closed' })),
  /** The line runs as one curve through its points rather than as straight segments: a line drawn freehand. */
  smooth: Schema.optional(Schema.Boolean.annotate({ title: 'Smooth' })),
}).annotate({ title: 'Polyline' });
export type PolylineParams = Schema.Schema.Type<typeof PolylineParams>;

/**
 * A segment of a polyline that runs as a curve rather than straight: `segment` is the index of the point it leaves
 * (a closed line's last runs back to the first). With `control` alone it is a parabola, the control being where its
 * two end tangents meet; with `second` too it is a cubic, which leaves its first point toward `control` and arrives
 * at its last from `second`, so it can bow one way and then the other. Both are in the frame's unit space as the
 * points are, though they may lie outside the frame.
 */
export const PolylineBend = Schema.Struct({
  segment: Schema.Number,
  control: Point,
  second: Schema.optional(Point),
});
export type PolylineBend = Schema.Schema.Type<typeof PolylineBend>;

/**
 * An irregular line of segments through `points`, in the frame's unit space (0..1 of its size, origin top-left) so a
 * resize scales it; closed, it is a filled outline like a polygon. Each segment is straight unless `bends` names it.
 * Labelled like a box.
 */
export const PolylineNode = Schema.Struct({
  kind: Schema.Literal('polyline'),
  ...nodeBase,
  ...boxFields,
  ...paddingFields,
  points: Schema.Array(Point),
  bends: Schema.optional(Schema.Array(PolylineBend)),
  params: Schema.optional(PolylineParams),
});
export type PolylineNode = Schema.Schema.Type<typeof PolylineNode>;

/**
 * How a hull's border runs: `perimeter` follows the outline of the nodes inside it, `box` is the rectangle that
 * bounds them.
 */
export const HULL_SHAPES = ['perimeter', 'box'] as const;
export type HullShape = (typeof HULL_SHAPES)[number];

/** The border a hull that names none takes, and so the one a new hull is made with. */
export const DEFAULT_HULL_SHAPE: HullShape = 'box';

/**
 * A border drawn round the nodes that name it as their `parent`: a hull's group as the 2D editor draws it, opened out
 * (see `parent`). Its frame and `points` (the border, in the frame's unit space as a polyline's are) follow those
 * nodes, so neither is set by hand; with nothing inside it has no group to be stored as, and keeps the frame it was
 * given.
 */
export const HullNode = Schema.Struct({
  kind: Schema.Literal('hull'),
  ...nodeBase,
  ...boxFields,
  ...paddingFields,
  /** Unset, `DEFAULT_HULL_SHAPE`. */
  shape: Schema.optional(Schema.Literals(HULL_SHAPES).annotate({ title: 'Hull' })),
  /**
   * How far inside its line the border is drawn, in cells of the drawing's grid: on a lattice the line is the centre
   * of the gutter round its nodes, which the inset leaves clear; off one it is the margin the border stands off them.
   */
  inset: Schema.optional(
    Schema.Number.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0)).annotate({
      title: 'Inset',
      [StepAnnotationId]: 1,
    }),
  ),
  points: Schema.optional(Schema.Array(Point)),
  /** The composite its nodes are stored in; unset until the hull is first written. */
  group: Schema.optional(Schema.String),
});
export type HullNode = Schema.Schema.Type<typeof HullNode>;

/** Free text on the canvas. Named for what it is, so a host may keep `text` for a type of its own. */
export const NoteNode = Schema.Struct({
  kind: Schema.Literal('note'),
  ...nodeBase,
  ...paddingFields,
  label: Schema.String,
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
  kind: Schema.Literal('view'),
  ...nodeBase,
  ...boxFields,
  scene: Schema.String,
  link: Schema.optional(ViewLink),
  /** The child region the frame shows, fixed: a placed composite's parts at its scale (decision 18). */
  frame: Schema.optional(Bounds),
});
export type ViewNode = Schema.Schema.Type<typeof ViewNode>;

/**
 * A composite object placed in a scene (ANIMATION.md §4.1): it draws the composite scene `composite` scaled into its
 * frame. Every instance shares the definition; `partOverrides` set values of the definition's nodes for this
 * instance alone, shallow per field.
 */
export const InstanceNode = Schema.Struct({
  kind: Schema.Literal('instance'),
  ...nodeBase,
  // The generic Object always names one; every other type that draws a composite may.
  composite: Schema.String,
  /**
   * How the composite fills the frame, and which region of it the frame shows. Only the generic Object scales its
   * parts as a picture, so these stay here rather than on the base — a type with its own template places its parts
   * by their constraints. `fit` is also a polygon's own legacy field, which is the other reason not to share it.
   */
  fit: Schema.optional(InstanceFit.annotate({ title: 'Fit' })),
  /** The composite region the frame shows, fixed: its parts at the instance's scale (decision 18). */
  frame: Schema.optional(Bounds),
  /**
   * The border the Instance draws round its parts, which makes it a hull: a group whose parts the 2D editor shows and
   * edits in the scene itself rather than behind the Instance, and whose border a link's route keeps to one side of.
   */
  hull: Schema.optional(Schema.Literals(HULL_SHAPES).annotate({ title: 'Hull' })),
  /** A hull's `inset`, kept with the group it is stored as. */
  hullInset: Schema.optional(Schema.Number),
});
export type InstanceNode = Schema.Schema.Type<typeof InstanceNode>;

/**
 * A vector shape: SVG path data in its own coordinates (`viewBox`), scaled to fill the frame and filled with the
 * node's colour: a theme colour's text colour, or a literal exactly as written, for artwork with brand colours. How a
 * logo or a glyph becomes canvas nodes.
 */
export const PathNode = Schema.Struct({
  kind: Schema.Literal('path'),
  ...nodeBase,
  d: Schema.String,
  viewBox: Bounds,
});
export type PathNode = Schema.Schema.Type<typeof PathNode>;

/**
 * A node whose content an agent-written generator computes from its parameters and the time (ANIMATION.md §6): the
 * generator is a `Generator` object the host resolves by `generator` (a reference string), and `params` are its
 * parameters, which the timeline may key (`params.<name>`).
 */
export const GeneratorNode = Schema.Struct({
  kind: Schema.Literal('generator'),
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
export const endpointNode = (end: Endpoint | ElementEndpoint): NodeId | undefined =>
  'node' in end ? end.node : undefined;

/**
 * An endpoint as a scene element stores it: one struct rather than a union (ECHO stores only discriminated unions), a
 * node and port or a free point.
 */
export const ElementEndpoint = Schema.Struct({
  node: Schema.optional(Schema.String),
  port: Schema.optional(Schema.String),
  point: Schema.optional(Point),
});
export type ElementEndpoint = Schema.Schema.Type<typeof ElementEndpoint>;

/** The endpoint bound to `map`'s id for its node instead; a point endpoint is unchanged. */
export const rebindEndpoint = <E extends Endpoint | ElementEndpoint>(end: E, map: (node: NodeId) => NodeId): E =>
  'node' in end && end.node !== undefined ? { ...end, node: map(end.node) } : end;

/**
 * What is drawn at a link end: an open `arrow`, a `circle`, a hollow `triangle` (inheritance), a `crowsfoot` (many),
 * or, at the whole's end, a hollow `diamond` (aggregation) or a filled one (composition).
 */
export const MARKERS = ['arrow', 'circle', 'diamond', 'diamond-filled', 'crowsfoot', 'triangle'] as const;
export const Marker = Schema.Literals(MARKERS);
export type Marker = Schema.Schema.Type<typeof Marker>;

/** A link's end markers: `tail` at its source and `head` at its target. */
export type LinkEnds = { readonly tail?: Marker; readonly head?: Marker };

/**
 * A named look of a drawing, kept beside its scenes: the nodes and links naming it as their `style` derive their look
 * from it (a link takes the common base, its colour and stroke), so one style restyles both together.
 */
export const StyleClass = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  style: Schema.optional(Style2D),
});
export type StyleClass = Schema.Schema.Type<typeof StyleClass>;

/** A drawing's style classes by id. */
export type StyleMap = Readonly<Record<string, StyleClass>>;

/** Where a diagram connector's caption sits (scene coordinates, its top-left), and how it is set. */
export const DiagramCaption = Schema.Struct({
  x: Schema.Number,
  y: Schema.Number,
  w: Schema.optional(Schema.Number),
  color: Schema.optional(Color),
  weight: Schema.optional(Weight),
});
export type DiagramCaption = Schema.Schema.Type<typeof DiagramCaption>;

/**
 * A connector of a laid-out diagram, drawn by the diagram's SVG renderer: its relation's markers and dash, and the
 * route the layout gave it (scene coordinates, source end first) for as long as its ends are where the route meets them.
 */
export const DiagramConnector = Schema.Struct({
  relation: Schema.optional(Shape.Relation),
  head: Schema.optional(Shape.ArrowHead),
  tail: Schema.optional(Shape.ArrowTail),
  stroke: Schema.optional(Stroke),
  color: Schema.optional(Color),
  route: Schema.optional(Schema.Array(Point)),
  caption: Schema.optional(DiagramCaption),
});
export type DiagramConnector = Schema.Schema.Type<typeof DiagramConnector>;

/**
 * How a link runs between its ends, in the words a diagram's arrow uses: `smart` leaves each port along its side's
 * normal and joins the two, `ortho` turns at right angles, `line` runs straight, `curve` bends, and `spline` runs
 * through the link's own `points`.
 */
export const LINK_PATHS = ['line', 'ortho', 'curve', 'spline', 'smart'] as const;
export const LinkPath = Schema.Literals(LINK_PATHS);
export type LinkPath = Schema.Schema.Type<typeof LinkPath>;

/** The path a link that names none takes. */
export const DEFAULT_LINK_PATH: LinkPath = 'smart';

/** The kind every link is; how it runs is its `path`. */
export const LINK_KIND = 'link';

/** The fields every link has. */
export const linkBase = {
  kind: Schema.Literal(LINK_KIND),
  id: Schema.String,
  z: Schema.String,
  locked: Schema.optional(Schema.Boolean),
  source: Endpoint,
  target: Endpoint,
  /** How the link runs between its ends; unset is `DEFAULT_LINK_PATH`. */
  path: Schema.optional(LinkPath.annotate({ title: 'Path' })),
  /** The control points a `spline` runs through, in order, between its ends. */
  points: Schema.optional(Schema.Array(Point)),
  /** The marker at the link's source. */
  tail: Schema.optional(Marker.annotate({ title: 'Tail' })),
  /** The marker at the link's target; an arrow here reads as the link's direction. */
  head: Schema.optional(Marker.annotate({ title: 'Head' })),
  /** A caption drawn at the middle of the link's route. */
  label: Schema.optional(Schema.String.annotate({ title: 'Label' })),
  /** The scene layer the element is on; unset, or naming no layer of the scene, it is on the bottom one. */
  layer: Schema.optional(Schema.String.annotate({ title: 'Layer' })),
  /** A named style of the drawing the link takes its look from; its own `overrides` win over it. */
  style: Schema.optional(Schema.String.annotate({ title: 'Style' })),
  /** The link's own look, field by field over its named style. */
  overrides: Schema.optional(LineStyle),
  /** Drawn as a diagram connector rather than in the canvas's own link style. */
  connector: Schema.optional(DiagramConnector),
  ...constrainFields,
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

/** Where a diagram shape's heading (a group's name) sits, from the frame's top-left corner, and how it is set. */
export const DiagramHeading = Schema.Struct({
  /** The DSL element the heading came from, so the drawing reads it back under its own id. */
  id: Schema.String,
  x: Schema.Number,
  y: Schema.Number,
  w: Schema.optional(Schema.Number),
  color: Schema.optional(Color),
  weight: Schema.optional(Weight),
});
export type DiagramHeading = Schema.Schema.Type<typeof DiagramHeading>;

/** The DSL elements a diagram node can be. */
export const DiagramShape = Schema.Union([Shape.Box, Shape.Circle, Shape.Text, Shape.Portal]);
export type DiagramShape = Schema.Schema.Type<typeof DiagramShape>;

/**
 * A shape of a laid-out diagram (`@dxos/diagram`'s scene DSL), drawn by the renderer that writes the diagram's SVG file
 * (`SvgFile.elementMarkup`) so it reads on the canvas as it does there. The element's geometry is the node's frame and
 * its text the node's `label` (the heading's, when it has one), so a move, a resize or a relabel edits the element.
 */
export const DiagramNode = Schema.Struct({
  kind: Schema.Literal('diagram'),
  ...nodeBase,
  ...boxFields,
  element: DiagramShape,
  heading: Schema.optional(DiagramHeading),
});
export type DiagramNode = Schema.Schema.Type<typeof DiagramNode>;

/** The engine's own node kinds. A host may add its own (decision 1); those are `NodeBase` to the engine. */
export const BuiltinNode = Schema.Union([
  RectNode,
  EllipseNode,
  CloudNode,
  PolygonNode,
  ShapeNode,
  PolylineNode,
  HullNode,
  NoteNode,
  ViewNode,
  InstanceNode,
  PathNode,
  GeneratorNode,
  DiagramNode,
]);
export type BuiltinNode = Schema.Schema.Type<typeof BuiltinNode>;
export type BuiltinNodeKind = BuiltinNode['kind'];
export const NODE_KINDS: readonly BuiltinNodeKind[] = [
  'rect',
  'ellipse',
  'polygon',
  'cloud',
  'shape',
  'polyline',
  'hull',
  'note',
  'view',
  'instance',
  'path',
  'generator',
  'diagram',
];

/** A node of the scene: the engine handles any `NodeBase`; built-in code narrows with the guards below. */
export type Node = NodeBase;
/** A node kind name; the engine's own are `BuiltinNodeKind`. */
export type NodeKind = string;

/** Narrows a node to one built-in kind; sound because the registry maps each kind name to one schema. */
export const isRectNode = (node: NodeBase): node is RectNode => node.kind === 'rect';
export const isEllipseNode = (node: NodeBase): node is EllipseNode => node.kind === 'ellipse';
export const isCloudNode = (node: NodeBase): node is CloudNode => node.kind === 'cloud';
export const isShapeNode = (node: NodeBase): node is ShapeNode => node.kind === 'shape';
export const isPolygonNode = (node: NodeBase): node is PolygonNode => node.kind === 'polygon';
export const isPolylineNode = (node: NodeBase): node is PolylineNode => node.kind === 'polyline';
export const isHullNode = (node: NodeBase): node is HullNode => node.kind === 'hull';
export const isNoteNode = (node: NodeBase): node is NoteNode => node.kind === 'note';
export const isViewNode = (node: NodeBase): node is ViewNode => node.kind === 'view';
/**
 * The fields a node placing a composite Object carries, whatever its own kind: the generic `instance`, and a kind of
 * its own that declares a template (a UML class), which keeps its kind and its typed fields and draws through the
 * composite all the same.
 */
export type PlacedComposite = NodeBase & {
  readonly composite: ViewId;
  readonly partOverrides?: InstanceNode['partOverrides'];
  readonly fit?: InstanceFit;
  readonly frame?: Bounds;
};

/** Whether the node places a composite, which is what naming one makes it — not what its kind is called. */
export const isInstanceNode = (node: NodeBase): node is PlacedComposite =>
  typeof Reflect.get(node, 'composite') === 'string';

/** The fixed child region a portal or instance shows, when it places a composite at a scale. */
export const nodeFrame = (node: NodeBase): Bounds | undefined =>
  isViewNode(node) || isInstanceNode(node) ? node.frame : undefined;
export const isPathNode = (node: NodeBase): node is PathNode => node.kind === 'path';
export const isGeneratorNode = (node: NodeBase): node is GeneratorNode => node.kind === 'generator';
export const isDiagramNode = (node: NodeBase): node is DiagramNode => node.kind === 'diagram';
/** A node built on the `box` prototype, carrying a centred, editable label. */
export const isBoxNode = (node: NodeBase): node is RectNode | ViewNode => isRectNode(node) || isViewNode(node);
/** Whether a view node draws its child View: as set, else while it has no label to show instead. */
export const showsContents = (node: ViewNode): boolean => node.link?.contents ?? node.label === undefined;
export const isBuiltinNode = (node: NodeBase): node is BuiltinNode => NODE_KINDS.some((kind) => kind === node.kind);

/**
 * Node kinds stored under an earlier name: `frame` is what `view` was called before the View rename, and
 * `space-graph` is what plugin-canvas's `graph` kind was called while it was the only graph a canvas drew.
 */
const LEGACY_NODE_KINDS: ReadonlyMap<string, NodeKind> = new Map([
  ['frame', 'view'],
  ['space-graph', 'graph'],
]);

/** An element stored under an earlier kind name reads as its current kind; any other is returned as it is. */
export const withCurrentKind = <T extends { kind?: string }>(element: T): T => {
  const kind = element.kind === undefined ? undefined : LEGACY_NODE_KINDS.get(element.kind);
  return kind ? { ...element, kind } : element;
};

/** A node stored under an earlier kind name reads as its current kind; any other node is returned as it is. */
export const withLegacyNodeKind = (node: NodeBase): NodeBase => withCurrentKind(node);

/** The settings each kind once stored beside the shared fields, which it now keeps in `params`. */
export const LEGACY_PARAMS: Readonly<Record<string, readonly string[]>> = {
  cloud: ['bumps'],
  polygon: ['sides', 'fit'],
};

/** A node storing its kind's settings beside the shared fields reads with them in `params`; any other is returned as it is. */
export const withLegacyParams = (node: NodeBase): NodeBase => {
  const keys = (LEGACY_PARAMS[node.kind] ?? []).filter((key) => key in node);
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

/**
 * A link: an element with two ends. How it runs is its `path`, and nothing of its route is stored but a spline's
 * control points, so it follows its nodes as they move.
 */
export const Link = Schema.Struct(linkBase);
export type Link = Schema.Schema.Type<typeof Link>;

export type Element = Node | Link;

/** The path a link runs. */
export const linkPath = (link: Pick<Link, 'path'>): LinkPath => link.path ?? DEFAULT_LINK_PATH;

/** The markers a link draws. */
export const linkMarkers = (link: Pick<Link, 'tail' | 'head'>): LinkEnds => ({
  ...(link.tail !== undefined ? { tail: link.tail } : {}),
  ...(link.head !== undefined ? { head: link.head } : {}),
});

export const isNode = (element: Element): element is Node => 'center' in element;
export const isLink = (element: Element): element is Link => 'source' in element;
