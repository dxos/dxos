//
// Copyright 2026 DXOS.org
//

//
// The built-in node and link types: their definitions over the views this folder draws them with, so the model layer
// holds only what a registry is and the React views stay with the components.
//

import {
  CloudNode,
  EllipseNode,
  GeneratorNode,
  InstanceNode,
  NoteNode,
  PathNode,
  PolygonNode,
  PolylineNode,
  RectNode,
  type Size,
  ViewNode,
} from '@dxos/scene';

import {
  DiagramNode,
  type LinkRegistry,
  type NodeDefSpec,
  type NodeRegistry,
  type NodeType,
  createNodeRegistry,
  isCloudNode,
  isPolygonNode,
  isPolylineNode,
} from '../../model/index.ts';
import { NOMINAL_SIZES, cloudPath, createNode, polygonPath, polylinePath } from '../../utils/index.ts';
import {
  BoxNodeView,
  CloudNodeView,
  DiagramNodeView,
  EllipseNodeView,
  GeneratorNodeView,
  InstanceNodeView,
  NoteNodeView,
  PathNodeView,
  PolygonNodeView,
  PolylineNodeView,
  ViewNodeView,
} from './SceneLayer.tsx';

const MIN_SIZE: Size = { width: 64, height: 32 };

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

export const defaultNodePrototypes: Readonly<Record<string, NodeDefSpec>> = { box: boxPrototype };

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
    minSize: MIN_SIZE,
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
            radius,
          })
        : '',
    filled: (node) => isPolylineNode(node) && node.params?.closed === true,
    // Its label is edited in the properties panel: a double-click shows the vertices to drag.
    editor: 'vertices',
    portsPerSide: 1,
    parts: [{ field: 'label' }],
    resizable: true,
    minSize: { width: 16, height: 16 },
  },
  note: {
    name: 'Note',
    icon: 'ph--text-t--regular',
    key: 'T',
    schema: NoteNode,
    component: NoteNodeView,
    parts: [{ field: 'text', multiline: true }],
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
    minSize: { width: 16, height: 16 },
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
    minSize: { width: 16, height: 16 },
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
    minSize: { width: 4, height: 4 },
    palette: false,
    bare: true,
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
    minSize: { width: 16, height: 16 },
    palette: false,
    bare: true,
    unclipped: true,
  },
};

export const defaultNodeRegistry: NodeRegistry = createNodeRegistry(defaultNodeTypes, defaultNodePrototypes);

// The palette lists link types in this order, so the default (smart) leads.
export const defaultLinkRegistry: LinkRegistry = {
  smart: { type: 'smart', name: 'Smart line', icon: 'ph--flow-arrow--regular', key: 'O' },
  line: { type: 'line', name: 'Line', icon: 'ph--line-segment--regular', key: 'L' },
  curve: { type: 'curve', name: 'Curve', icon: 'ph--bezier-curve--regular', key: 'K' },
  spline: { type: 'spline', name: 'Spline', icon: 'ph--wave-sine--regular', key: 'P' },
};
