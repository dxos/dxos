//
// Copyright 2026 DXOS.org
//

//
// Node and link type definitions (decision 12): what a type renders, where its ports are, how it may
// be manipulated, and how the palette presents it. Per type, not per instance, so the data stays
// small and ports come for free; a node may still carry its own `ports`.
//

import { type ComponentType } from 'react';

import { defaultPorts } from './ports.ts';
import { ClassNodeView, EllipseNodeView, PortalNodeView, RectNodeView, TextNodeView } from './SceneLayer.tsx';
import { type SceneStore } from './store.ts';
import { type LinkType, type Node, type NodeType, type Port, type Scene, type Size } from './types.ts';

export type NodeViewProps = {
  node: Node;
  scene: Scene;
  store: SceneStore;
  registry: NodeRegistry;
  /** Effective screen zoom of the layer (camera zoom × portal scales), for level-of-detail choices. */
  zoom: number;
  /** Nesting depth of the layer; 0 is the root. */
  depth: number;
  selected: boolean;
};

export type NodeDef = {
  type: NodeType;
  name: string;
  icon: string;
  /** Palette shortcut. */
  key: string;
  component: ComponentType<NodeViewProps>;
  ports: (node: Node) => readonly Port[];
  resizable?: boolean;
  minSize?: Size;
  /** Double-click opens the node (a portal drills in; a text node edits, later). */
  openable?: boolean;
};

export type LinkDef = {
  type: LinkType;
  name: string;
  icon: string;
  key: string;
};

export type NodeRegistry = Readonly<Record<NodeType, NodeDef>>;
export type LinkRegistry = Readonly<Record<LinkType, LinkDef>>;

/** A node's ports: its own when it carries them, else its type's. */
export const nodePorts = (registry: NodeRegistry, node: Node): readonly Port[] =>
  node.ports ?? registry[node.type].ports(node);

const MIN_SIZE: Size = { width: 64, height: 32 };

export const defaultNodeRegistry: NodeRegistry = {
  rect: {
    type: 'rect',
    name: 'Rectangle',
    icon: 'ph--rectangle--regular',
    key: 'R',
    component: RectNodeView,
    ports: () => defaultPorts,
    resizable: true,
    minSize: MIN_SIZE,
  },
  ellipse: {
    type: 'ellipse',
    name: 'Ellipse',
    icon: 'ph--circle--regular',
    key: 'E',
    component: EllipseNodeView,
    ports: () => defaultPorts,
    resizable: true,
    minSize: MIN_SIZE,
  },
  class: {
    type: 'class',
    name: 'Class',
    icon: 'ph--rows--regular',
    key: 'C',
    component: ClassNodeView,
    ports: () => defaultPorts,
    resizable: true,
    minSize: { width: 128, height: 96 },
  },
  text: {
    type: 'text',
    name: 'Text',
    icon: 'ph--text-t--regular',
    key: 'T',
    component: TextNodeView,
    ports: () => defaultPorts,
    resizable: true,
    minSize: MIN_SIZE,
  },
  scene: {
    type: 'scene',
    name: 'Scene',
    icon: 'ph--frame-corners--regular',
    key: 'S',
    component: PortalNodeView,
    ports: () => defaultPorts,
    resizable: true,
    minSize: { width: 96, height: 60 },
    openable: true,
  },
};

export const defaultLinkRegistry: LinkRegistry = {
  line: { type: 'line', name: 'Line', icon: 'ph--line-segment--regular', key: 'L' },
  curve: { type: 'curve', name: 'Curve', icon: 'ph--bezier-curve--regular', key: 'K' },
  spline: { type: 'spline', name: 'Spline', icon: 'ph--wave-sine--regular', key: 'P' },
};
