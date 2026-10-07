//
// Copyright 2026 DXOS.org
//

//
// Node and link type definitions (decision 12): what a type's schema is, what it renders, where its
// ports are, how it may be manipulated, and how the palette presents it. Per type, not per instance, so
// the data stays small and ports come for free; a node may still carry its own `ports`. A host composes
// its own registry (and with `createSceneSchema` its scene schema) from the built-ins and its types.
//
// A type may be built on a prototype (`extends`): it inherits every definition field it leaves unset, so
// shapes that look and behave alike share one definition and differ only where they say so. Prototypes
// are resolved once, when the registry is created, so a lookup is still one record read.
//

import type * as Schema from 'effect/Schema';
import { type ComponentType } from 'react';

import { BoxNodeView, EllipseNodeView, NoteNodeView, PortalNodeView } from '../components/SceneLayer/SceneLayer.tsx';
import { type PartEditing, type PartField } from '../utils/parts.ts';
import { DEFAULT_SIZES, createNode } from '../utils/shapes.ts';
import { type SceneStore } from './store.ts';
import {
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
  /** Opens the node (drills into a portal); absent where the layer is read-only. */
  onOpen?: () => void;
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
  /** The text properties edited in place, in order; the first is the node's main text. */
  parts?: readonly PartField[];
};

/**
 * A node type as declared: a `NodeDef` whose fields may be left to its prototype. A prototype (a spec in
 * `prototypes`) is never a type of its own: it is not in the registry, the palette or the scene schema.
 */
export type NodeDefSpec = Partial<Omit<NodeDef, 'type'>> & {
  /** The prototype this type inherits unset fields from. */
  extends?: string;
};

/**
 * A registry from type specs and the prototypes they extend: each type takes its own fields over its
 * prototype's, recursively. Throws when a type names a missing prototype, a cycle, or ends up without a
 * field every type needs.
 */
export const createNodeRegistry = (
  types: Readonly<Record<NodeType, NodeDefSpec>>,
  prototypes: Readonly<Record<string, NodeDefSpec>> = {},
): NodeRegistry => {
  const inherit = (spec: NodeDefSpec, chain: readonly string[]): NodeDefSpec => {
    if (spec.extends === undefined) {
      return spec;
    }
    if (chain.includes(spec.extends)) {
      throw new Error(`Node prototype cycle: ${[...chain, spec.extends].join(' -> ')}`);
    }
    const prototype = prototypes[spec.extends];
    if (!prototype) {
      throw new Error(`Unknown node prototype: ${spec.extends}`);
    }
    const { extends: _, ...own } = spec;
    return { ...inherit(prototype, [...chain, spec.extends]), ...own };
  };
  return Object.fromEntries(
    Object.entries(types).map(([type, spec]) => {
      const { extends: _, ...resolved } = inherit(spec, [type]);
      const { name, icon, schema, component, create, defaultSize } = resolved;
      if (!name || !icon || !schema || !component || !create || !defaultSize) {
        throw new Error(`Node type ${type} is missing a required field`);
      }
      const def: NodeDef = { ...resolved, type, name, icon, schema, component, create, defaultSize };
      return [type, def];
    }),
  );
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

/**
 * A framed shape with a centred, editable label: resizable, with ports spread along every side. The
 * built-in rectangle and scene are both boxes; a host type can extend it too.
 */
export const boxPrototype: NodeDefSpec = {
  component: BoxNodeView,
  parts: [{ field: 'label' }],
  defaultSize: DEFAULT_SIZES.rect,
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
    defaultSize: DEFAULT_SIZES.ellipse,
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
    defaultSize: DEFAULT_SIZES.note,
    resizable: true,
    minSize: MIN_SIZE,
  },
  scene: {
    extends: 'box',
    name: 'Scene',
    icon: 'ph--frame-corners--regular',
    key: 'S',
    schema: PortalNode,
    component: PortalNodeView,
    create: (props) => createNode({ type: 'scene', ...props }),
    defaultSize: DEFAULT_SIZES.scene,
    minSize: { width: 96, height: 60 },
    openable: true,
  },
};

export const defaultNodeRegistry: NodeRegistry = createNodeRegistry(defaultNodeTypes, defaultNodePrototypes);

export const defaultLinkRegistry: LinkRegistry = {
  line: { type: 'line', name: 'Line', icon: 'ph--line-segment--regular', key: 'L' },
  curve: { type: 'curve', name: 'Curve', icon: 'ph--bezier-curve--regular', key: 'K' },
  spline: { type: 'spline', name: 'Spline', icon: 'ph--wave-sine--regular', key: 'P' },
  smart: { type: 'smart', name: 'Smart line', icon: 'ph--flow-arrow--regular', key: 'O' },
};
