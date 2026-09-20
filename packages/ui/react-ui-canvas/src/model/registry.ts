//
// Copyright 2026 DXOS.org
//

//
// Node and link type definitions (decision 12): what a type renders, where its ports are, how it may
// be manipulated, and how the palette presents it. Per type, not per instance, so the data stays
// small and ports come for free; a node may still carry its own `ports`.
//

import { type ComponentType } from 'react';

import {
  ClassNodeView,
  EllipseNodeView,
  PortalNodeView,
  RectNodeView,
  TextNodeView,
} from '../components/SceneLayer/SceneLayer.tsx';
import { type PartEditing } from '../utils/parts.ts';
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
  /** Nested levels below the root that may mount live (decision 10). */
  liveDepth: number;
  selected: boolean;
  /** The view is being zoomed into: a portal shows its child plainly, as the child will look once entered. */
  opening?: boolean;
  /** The text part of this node being edited in place, with the editor's callbacks. */
  editing?: PartEditing;
};

export type NodeDef = {
  type: NodeType;
  name: string;
  icon: string;
  /** Palette shortcut. */
  key: string;
  component: ComponentType<NodeViewProps>;
  /** Explicit port layout; absent, the type gets `portsPerSide` ports spread along each side. */
  ports?: (node: Node) => readonly Port[];
  /** Defaults to `DEFAULT_PORTS_PER_SIDE`. */
  portsPerSide?: number;
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

const MIN_SIZE: Size = { width: 64, height: 32 };

export const defaultNodeRegistry: NodeRegistry = {
  rect: {
    type: 'rect',
    name: 'Rectangle',
    icon: 'ph--rectangle--regular',
    key: 'R',
    component: RectNodeView,
    resizable: true,
    minSize: MIN_SIZE,
  },
  ellipse: {
    type: 'ellipse',
    name: 'Ellipse',
    icon: 'ph--circle--regular',
    key: 'E',
    component: EllipseNodeView,
    // Only the side centres of the frame lie on the curve.
    portsPerSide: 1,
    resizable: true,
    minSize: MIN_SIZE,
  },
  class: {
    type: 'class',
    name: 'Class',
    icon: 'ph--rows--regular',
    key: 'C',
    component: ClassNodeView,
    resizable: true,
    minSize: { width: 128, height: 96 },
  },
  text: {
    type: 'text',
    name: 'Text',
    icon: 'ph--text-t--regular',
    key: 'T',
    component: TextNodeView,
    resizable: true,
    minSize: MIN_SIZE,
  },
  scene: {
    type: 'scene',
    name: 'Scene',
    icon: 'ph--frame-corners--regular',
    key: 'S',
    component: PortalNodeView,
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
