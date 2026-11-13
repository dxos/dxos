//
// Copyright 2026 DXOS.org
//

//
// The built-in node and link types: their definitions over the views this folder draws them with, so the model layer
// holds only what a registry is and the React views stay with the components.
//

import {
  CloudNode,
  DEFAULT_GRID,
  DiagramNode,
  EllipseNode,
  GeneratorNode,
  HullNode,
  InstanceNode,
  MAJOR_GRID_RATIO,
  type NodeType,
  NoteNode,
  PathNode,
  PolygonNode,
  PolylineNode,
  RectNode,
  type Size,
  ViewNode,
  isCloudNode,
  isHullNode,
  isPolygonNode,
  isPolylineNode,
} from '@dxos/scene';

import {
  type LinkRegistry,
  type NodeDefSpec,
  type NodeRegistry,
  createNodeRegistry,
  templateCompositeId,
} from '../../model/index.ts';
import {
  CONTAINERS_GROUP,
  EXTENSIONS_GROUP,
  HULL_STYLE,
  NOMINAL_SIZES,
  cloudPath,
  createNode,
  polygonPath,
  polylinePath,
} from '../../utils/index.ts';
import { CARD_TEMPLATE } from './card-template.ts';
import { CardNode, CardNodeView, IconNode, IconNodeView } from './CardNodeView.tsx';
import {
  BoxNodeView,
  CloudNodeView,
  DiagramNodeView,
  EllipseNodeView,
  GeneratorNodeView,
  HullNodeView,
  InstanceNodeView,
  NoteNodeView,
  PathNodeView,
  PolygonNodeView,
  PolylineNodeView,
  ViewNodeView,
} from './SceneLayer.tsx';

// Every minimum is a whole number of the finest grid level (a quarter of the minor cell), so a shape resized to its
// floor still has its edges on a line the canvas draws.
const MIN_SIZE: Size = { width: 48, height: 24 };

/** A hull's border before anything is inside it: its own frame. */
const UNIT_SQUARE = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
];

/**
 * A framed shape with a centred, editable label: resizable, with ports spread along every side. The
 * built-in rectangle and frame are both boxes; a host type can extend it too.
 */
export const boxPrototype: NodeDefSpec = {
  component: BoxNodeView,
  parts: [{ field: 'label' }],
  defaultSize: NOMINAL_SIZES.rect,
  resizable: true,
  minSize: MIN_SIZE,
};

/**
 * A card: a header of an icon and a title, a body, and a footer under a hairline, each edited in place. A type
 * extending it declares which of `icon`, `label`, `body` and `footer` it carries — a region whose field the node
 * does not have is not drawn — and composes `CardFrame` in a view of its own when it has more to show.
 */
export const cardPrototype: NodeDefSpec = {
  component: CardNodeView,
  parts: [{ field: 'label' }, { field: 'body', multiline: true }, { field: 'footer' }],
  // The size the card's composite is authored at (`CARD_SIZE`), so a new card's parts sit on the grid as written.
  defaultSize: { width: 4, height: 3 },
  resizable: true,
  // A cell of padding, a two-cell header, and a two-cell footer half a cell off the floor: what a card must keep to
  // still read as one, with half a cell of body left between the gaps.
  minSize: { width: 96, height: 84 },
};

/**
 * An icon alone, drawn from the node's `icon` field, with an optional caption under it. Any Phosphor name works: the
 * icon registry fetches a symbol the sprite does not hold, so a type is not limited to the glyphs the UI draws.
 */
export const iconPrototype: NodeDefSpec = {
  component: IconNodeView,
  parts: [{ field: 'label' }],
  defaultSize: { width: 1, height: 1 },
  resizable: true,
  minSize: { width: 24, height: 24 },
  // The glyph is the shape; a frame around it would be a second shape.
  bare: true,
  portsPerSide: 1,
};

/**
 * A tool whose shape is a composite object: it places an Instance of the template the type declares, which the
 * editor registers on the first drop and every later one reuses. A type extending this writes `template` and nothing
 * else about how it draws — the composite's own parts say that.
 */
export const objectPrototype: NodeDefSpec = {
  schema: InstanceNode,
  component: InstanceNodeView,
  defaultSize: NOMINAL_SIZES.instance,
  resizable: true,
  minSize: { width: 48, height: 24 },
  // Double-click edits the Object's parts in place.
  openable: true,
  // The composite's own parts draw everything; a frame around them would be a second shape.
  bare: true,
};

export const defaultNodePrototypes: Readonly<Record<string, NodeDefSpec>> = {
  box: boxPrototype,
  card: cardPrototype,
  icon: iconPrototype,
  object: objectPrototype,
};

export const defaultNodeTypes: Readonly<Record<NodeType, NodeDefSpec>> = {
  rect: {
    extends: 'box',
    name: 'Rectangle',
    icon: 'ph--rectangle--regular',
    key: 'R',
    schema: RectNode,
    create: (props) => createNode({ type: 'rect', ...props }),
  },
  ellipse: {
    name: 'Ellipse',
    icon: 'ph--circle--regular',
    key: 'E',
    schema: EllipseNode,
    component: EllipseNodeView,
    create: (props) => createNode({ type: 'ellipse', ...props }),
    defaultSize: NOMINAL_SIZES.ellipse,
    // Only the side centres of the frame lie on the curve.
    portsPerSide: 1,
    parts: [{ field: 'label' }],
    resizable: true,
    // A quarter of a nominal unit each way: a dot on a diagram is an ellipse, so its floor is the finest grid level.
    minSize: { width: DEFAULT_GRID / MAJOR_GRID_RATIO, height: DEFAULT_GRID / MAJOR_GRID_RATIO },
  },
  polygon: {
    name: 'Polygon',
    icon: 'ph--hexagon--regular',
    key: 'N',
    schema: PolygonNode,
    component: PolygonNodeView,
    create: (props) => createNode({ type: 'polygon', ...props }),
    defaultSize: NOMINAL_SIZES.polygon,
    silhouette: (node, inset, radius) =>
      polygonPath(node.size, {
        inset,
        ...(isPolygonNode(node) ? node.params : undefined),
        radius,
      }),
    bounds: (node) => (isPolygonNode(node) && node.params?.fit === 'circle' ? 'circle' : 'frame'),
    portsPerSide: 1,
    parts: [{ field: 'label' }],
    resizable: true,
    minSize: MIN_SIZE,
  },
  cloud: {
    name: 'Cloud',
    icon: 'ph--cloud--regular',
    key: 'C',
    schema: CloudNode,
    component: CloudNodeView,
    create: (props) => createNode({ type: 'cloud', ...props }),
    defaultSize: NOMINAL_SIZES.cloud,
    silhouette: (node, inset) => cloudPath(node.size, inset, isCloudNode(node) ? node.params?.bumps : undefined),
    // Only the side centres of the frame lie near the outline.
    portsPerSide: 1,
    parts: [{ field: 'label' }],
    resizable: true,
    minSize: MIN_SIZE,
  },
  polyline: {
    name: 'Polyline',
    icon: 'ph--line-segments--regular',
    key: 'Y',
    schema: PolylineNode,
    component: PolylineNodeView,
    create: (props) => createNode({ type: 'polyline', ...props }),
    createFromPoints: (props, points, closed) => ({
      ...createNode({ type: 'polyline', ...props }),
      points: [...points],
      ...(closed ? { params: { closed } } : {}),
    }),
    defaultSize: NOMINAL_SIZES.polyline,
    silhouette: (node, inset, radius) =>
      isPolylineNode(node)
        ? polylinePath(node.size, node.points, {
            inset,
            closed: node.params?.closed,
            smooth: node.params?.smooth,
            radius,
          })
        : '',
    filled: (node) => isPolylineNode(node) && node.params?.closed === true,
    // Its label is edited in the properties panel: a double-click shows the vertices to drag.
    editor: 'vertices',
    portsPerSide: 1,
    parts: [{ field: 'label' }],
    resizable: true,
    minSize: { width: 12, height: 12 },
  },
  // A tool rather than a type of its own: the stroke it draws is a polyline, run as a curve through its points.
  freehand: {
    name: 'Draw',
    icon: 'ph--scribble--regular',
    key: 'S',
    schema: PolylineNode,
    component: PolylineNodeView,
    create: (props) => createNode({ type: 'polyline', ...props }),
    createFromPoints: (props, points) => ({
      ...createNode({ type: 'polyline', ...props }),
      points: [...points],
      params: { smooth: true },
    }),
    freehand: true,
    defaultSize: NOMINAL_SIZES.polyline,
  },
  // Dragged out round the shapes it is to hold, which it takes as it lands; Enclose makes one round a selection.
  hull: {
    name: 'Hull',
    icon: 'ph--bounding-box--regular',
    key: 'B',
    group: CONTAINERS_GROUP,
    schema: HullNode,
    component: HullNodeView,
    create: (props) => ({ ...createNode({ type: 'hull', ...props }), style: HULL_STYLE }),
    defaultSize: NOMINAL_SIZES.hull,
    silhouette: (node, inset, radius) =>
      polylinePath(node.size, (isHullNode(node) && node.points) || UNIT_SQUARE, { inset, closed: true, radius }),
    portsPerSide: 1,
    parts: [{ field: 'label' }],
    resizable: false,
  },
  note: {
    name: 'Text',
    icon: 'ph--text-t--regular',
    key: 'T',
    schema: NoteNode,
    component: NoteNodeView,
    parts: [{ field: 'text', multiline: true }],
    // The text is the shape: a border and a fill around it would be a second one, and a rounded corner would cut its
    // first line. A node that wants either sets them on its own style.
    bare: true,
    create: (props) => createNode({ type: 'note', ...props }),
    defaultSize: NOMINAL_SIZES.note,
    resizable: true,
    minSize: MIN_SIZE,
  },
  view: {
    extends: 'box',
    name: 'View',
    icon: 'ph--frame-corners--regular',
    key: 'F',
    group: CONTAINERS_GROUP,
    schema: ViewNode,
    component: ViewNodeView,
    create: (props) => createNode({ type: 'view', ...props }),
    defaultSize: NOMINAL_SIZES.view,
    minSize: { width: 96, height: 60 },
    openable: true,
  },
  instance: {
    name: 'Object',
    icon: 'ph--cube--regular',
    group: 'Objects',
    schema: InstanceNode,
    component: InstanceNodeView,
    create: (props) => createNode({ type: 'instance', ...props }),
    defaultSize: NOMINAL_SIZES.instance,
    resizable: true,
    minSize: { width: 12, height: 12 },
    // Double-clicking opens the composite in isolation (ANIMATION.md §4.3).
    openable: true,
    palette: false,
    bare: true,
  },
  generator: {
    name: 'Generator',
    icon: 'ph--sparkle--regular',
    schema: GeneratorNode,
    component: GeneratorNodeView,
    create: (props) => createNode({ type: 'generator', ...props }),
    defaultSize: NOMINAL_SIZES.generator,
    resizable: true,
    minSize: { width: 12, height: 12 },
    // Placed by an agent (`canvas.addGenerator`) with its parameters and bindings, not drawn from the palette.
    palette: false,
    bare: true,
  },
  path: {
    name: 'Path',
    icon: 'ph--pen-nib--regular',
    schema: PathNode,
    component: PathNodeView,
    create: (props) => createNode({ type: 'path', ...props }),
    defaultSize: NOMINAL_SIZES.path,
    resizable: true,
    minSize: { width: 3, height: 3 },
    palette: false,
    bare: true,
  },
  card: {
    extends: 'object',
    name: 'Card',
    icon: 'ph--article--regular',
    key: 'D',
    group: EXTENSIONS_GROUP,
    schema: CardNode,
    // A composite object (`card-template.ts`), not a shape a view paints: the canvas places an Instance of it and
    // binds each region to the card's own field, so the regions are edited in place and the data stays typed.
    template: CARD_TEMPLATE,
    // Placeholder regions, so a new card reads as a card before it is edited (as a new UML class does).
    create: (props) => ({
      type: 'card',
      ...props,
      composite: templateCompositeId('card'),
      icon: { type: 'command' },
      label: 'Card',
      body: 'Body',
      footer: 'Footer',
    }),
    defaultSize: cardPrototype.defaultSize,
    resizable: true,
    minSize: cardPrototype.minSize,
    parts: cardPrototype.parts,
  },
  icon: {
    extends: 'icon',
    name: 'Icon',
    icon: 'ph--command--regular',
    key: 'G',
    schema: IconNode,
    create: (props) => ({ type: 'icon', ...props, icon: { type: 'command' } }),
  },
  diagram: {
    name: 'Diagram shape',
    icon: 'ph--flow-arrow--regular',
    schema: DiagramNode,
    component: DiagramNodeView,
    // Made from a laid-out diagram (the illustrator's DSL), not drawn from the palette; a fresh one is an empty box.
    create: (props) => createNode({ type: 'diagram', ...props }),
    parts: [{ field: 'label' }],
    defaultSize: NOMINAL_SIZES.rect,
    resizable: true,
    minSize: { width: 12, height: 12 },
    palette: false,
    bare: true,
    unclipped: true,
  },
};

export const defaultNodeRegistry: NodeRegistry = createNodeRegistry(defaultNodeTypes, defaultNodePrototypes);

/**
 * The link variants, in the order the palette and the Properties panel list them, the default (elbow) first. A link's
 * stored `type` is the variant: `elbow` leaves each port along its normal and joins with one corner, `straight` runs
 * between the ends as they are, and `orthogonal` turns at right angles.
 */
export const defaultLinkRegistry: LinkRegistry = {
  smart: { type: 'smart', name: 'Elbow', icon: 'ph--flow-arrow--regular', key: 'O' },
  line: { type: 'line', name: 'Straight', icon: 'ph--line-segment--regular', key: 'L' },
  ortho: { type: 'ortho', name: 'Orthogonal', icon: 'ph--arrow-elbow-right-up--regular', key: 'H' },
  curve: { type: 'curve', name: 'Curve', icon: 'ph--bezier-curve--regular', key: 'K' },
  spline: { type: 'spline', name: 'Spline', icon: 'ph--wave-sine--regular', key: 'P' },
};
