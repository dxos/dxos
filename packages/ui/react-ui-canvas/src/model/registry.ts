//
// Copyright 2026 DXOS.org
//

//
// Node and link type definitions (decision 12): what a type's schema is, what it renders, where its
// ports are, how it may be manipulated, and how the palette presents it. Per type, not per instance, so
// the data stays small and ports come for free; a node may still carry its own `ports`. A host composes
// its own registry (and with `createSceneSchema` its scene schema) from the built-ins and its types.
//

import type * as Schema from 'effect/Schema';
import { type ComponentType } from 'react';

import {
  ClassNodeView,
  EllipseNodeView,
  NoteNodeView,
  PortalNodeView,
  RectNodeView,
} from '../components/SceneLayer/SceneLayer.tsx';
import { type PartEditing } from '../utils/parts.ts';
import { DEFAULT_SIZES, createNode } from '../utils/shapes.ts';
import { type SceneStore } from './store.ts';
import {
  ClassNode,
  EllipseNode,
  type LinkType,
  type Node,
  type NodeBase,
  type NodeType,
  NoteNode,
  type Point,
  type Port,
  PortalNode,
  RectNode,
  type Scene,
  type Size,
} from './types.ts';

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

export type CreateProps = { id: string; z: string; center: Point; size: Size };

export type NodeDef = {
  type: NodeType;
  name: string;
  icon: string;
  /** Palette shortcut; a registry of many types leaves most without one. */
  key?: string;
  /** Palette group; types without one share the default group. */
  group?: string;
  /** The type's schema; the host's scene schema is the union of its registry's (`createSceneSchema`). */
  schema: Schema.Codec<NodeBase, unknown>;
  component: ComponentType<NodeViewProps>;
  /** A new node of the type with its default content, for the palette tool and drop-on-canvas. */
  create: (props: CreateProps) => Node;
  defaultSize: Size;
  /** Explicit port layout; absent, the type gets `portsPerSide` ports spread along each side. */
  ports?: (node: Node) => readonly Port[];
  /** Defaults to `DEFAULT_PORTS_PER_SIDE`. */
  portsPerSide?: number;
  resizable?: boolean;
  minSize?: Size;
  maxSize?: Size;
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

/** The definition of a node's type, when the registry has it. */
export const nodeDef = (registry: NodeRegistry, node: Node): NodeDef | undefined => registry[node.type];

const MIN_SIZE: Size = { width: 64, height: 32 };

export const defaultNodeRegistry: NodeRegistry = {
  rect: {
    type: 'rect',
    name: 'Rectangle',
    icon: 'ph--rectangle--regular',
    key: 'R',
    schema: RectNode,
    component: RectNodeView,
    create: (props) => createNode({ type: 'rect', ...props }),
    defaultSize: DEFAULT_SIZES.rect,
    resizable: true,
    minSize: MIN_SIZE,
  },
  ellipse: {
    type: 'ellipse',
    name: 'Ellipse',
    icon: 'ph--circle--regular',
    key: 'E',
    schema: EllipseNode,
    component: EllipseNodeView,
    create: (props) => createNode({ type: 'ellipse', ...props }),
    defaultSize: DEFAULT_SIZES.ellipse,
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
    schema: ClassNode,
    component: ClassNodeView,
    create: (props) => createNode({ type: 'class', ...props }),
    defaultSize: DEFAULT_SIZES.class,
    resizable: true,
    minSize: { width: 128, height: 96 },
  },
  note: {
    type: 'note',
    name: 'Note',
    icon: 'ph--text-t--regular',
    key: 'T',
    schema: NoteNode,
    component: NoteNodeView,
    create: (props) => createNode({ type: 'note', ...props }),
    defaultSize: DEFAULT_SIZES.note,
    resizable: true,
    minSize: MIN_SIZE,
  },
  scene: {
    type: 'scene',
    name: 'Scene',
    icon: 'ph--frame-corners--regular',
    key: 'S',
    schema: PortalNode,
    component: PortalNodeView,
    create: (props) => createNode({ type: 'scene', ...props }),
    defaultSize: DEFAULT_SIZES.scene,
    resizable: true,
    minSize: { width: 96, height: 60 },
    openable: true,
  },
};

export const defaultLinkRegistry: LinkRegistry = {
  line: { type: 'line', name: 'Line', icon: 'ph--line-segment--regular', key: 'L' },
  curve: { type: 'curve', name: 'Curve', icon: 'ph--bezier-curve--regular', key: 'K' },
  spline: { type: 'spline', name: 'Spline', icon: 'ph--wave-sine--regular', key: 'P' },
  smart: { type: 'smart', name: 'Smart line', icon: 'ph--flow-arrow--regular', key: 'O' },
};
