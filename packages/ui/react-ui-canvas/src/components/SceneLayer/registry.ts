//
// Copyright 2026 DXOS.org
//

//
// The built-in node and link types: their definitions over the views this folder draws them with, so the model layer
// holds only what a registry is and the React views stay with the components.
//

import {
  EllipseNode,
  FrameNode,
  GeneratorNode,
  InstanceNode,
  type LinkRegistry,
  type NodeDefSpec,
  type NodeRegistry,
  type NodeType,
  NoteNode,
  PathNode,
  RectNode,
  type Size,
  createNodeRegistry,
} from '../../model/index.ts';
import { NOMINAL_SIZES, createNode } from '../../utils/index.ts';
import {
  BoxNodeView,
  EllipseNodeView,
  FrameNodeView,
  GeneratorNodeView,
  InstanceNodeView,
  NoteNodeView,
  PathNodeView,
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
  frame: {
    extends: 'box',
    name: 'Frame',
    icon: 'ph--frame-corners--regular',
    key: 'F',
    schema: FrameNode,
    component: FrameNodeView,
    create: (props) => createNode({ type: 'frame', ...props }),
    defaultSize: NOMINAL_SIZES.frame,
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
};

export const defaultNodeRegistry: NodeRegistry = createNodeRegistry(defaultNodeTypes, defaultNodePrototypes);

// The palette lists link types in this order, so the default (smart) leads.
export const defaultLinkRegistry: LinkRegistry = {
  smart: { type: 'smart', name: 'Smart line', icon: 'ph--flow-arrow--regular', key: 'O' },
  line: { type: 'line', name: 'Line', icon: 'ph--line-segment--regular', key: 'L' },
  curve: { type: 'curve', name: 'Curve', icon: 'ph--bezier-curve--regular', key: 'K' },
  spline: { type: 'spline', name: 'Spline', icon: 'ph--wave-sine--regular', key: 'P' },
};
