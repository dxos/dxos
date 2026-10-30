//
// Copyright 2026 DXOS.org
//

//
// Node and link type definitions (decision 12): what a type's schema is, what it renders, where its
// ports are, how it may be manipulated, and how the palette presents it. Per type, not per instance, so
// the data stays small and ports come for free; a node may still carry its own `ports`. A host composes
// its own registry from the built-ins and its types.
//
// A type may be built on a prototype (`extends`): it inherits every definition field it leaves unset, so
// shapes that look and behave alike share one definition and differ only where they say so. Prototypes
// are resolved once, when the registry is created, so a lookup is still one record read.
//

import type * as Schema from 'effect/Schema';
import { type ComponentType } from 'react';

import { type FormFieldMap } from '@dxos/react-ui-form';
import { type LinkType, type Node, type NodeBase, type NodeType, type Point, type Port, type Size } from '@dxos/scene';

import { type PartEditing, type PartField } from '../utils/index.ts';
import { type DrawnLists } from './lists.ts';
import { type RenderList2D } from './types.ts';

export type NodeViewProps = {
  node: Node;
  scene: RenderList2D;
  /** The lists the view may draw from (a portal's scene, an instance's parts). */
  lists: DrawnLists;
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
  /** The node's embedded content takes input (`CanvasAtoms.active`); otherwise it should be inert. */
  active?: boolean;
  /** Opens the node (drills into a portal); absent where the layer is read-only. */
  onOpen?: () => void;
};

export type CreateProps = { id: string; z: string; center: Point; size: Size };

/** What a node's edit mode edits (`NodeDef.editor`). */
export type NodeEditor = 'label' | 'vertices';

export type NodeDef = {
  type: NodeType;
  name: string;
  icon: string;
  /** Tools panel shortcut; a registry of many types leaves most without one. */
  key?: string;
  /** Tools panel group; types without one share the default group. */
  group?: string;
  /** The type's schema, which validates the node's own fields. */
  schema: Schema.Codec<NodeBase, unknown>;
  component: ComponentType<NodeViewProps>;
  /** A new node of the type with its default content, for the palette tool and drop-on-canvas. */
  create: (props: CreateProps) => Node;
  /** Size when created, in nominal units: one unit is the drawing's major grid cell. */
  defaultSize: Size;
  /** Explicit port layout; absent, the type gets `portsPerSide` ports spread along each side. */
  ports?: (node: Node) => readonly Port[];
  /** Defaults to `DEFAULT_PORTS_PER_SIDE`. */
  portsPerSide?: number;
  resizable?: boolean;
  minSize?: Size;
  maxSize?: Size;
  /** Double-click opens the node (a frame drills in; a text node edits, later). */
  openable?: boolean;
  /** The frame is the ellipse inscribed in the node's bounds, as the engine's own ellipse is (a circle when square). */
  ellipse?: boolean;
  /**
   * The frame's fill and border take this outline (SVG path data in the frame's px, kept `inset` px inside it) rather
   * than the box: a cloud is a box drawn as a cloud. `radius` is the look's corner radius in px, for an outline with
   * corners of its own to round.
   */
  silhouette?: (node: Node, inset: number, radius: number) => string;
  /** Whether the silhouette's fill is drawn; unset, it is. An open outline (a line of segments) is its border alone. */
  filled?: (node: Node) => boolean;
  /**
   * Makes the type drawn vertex by vertex: its palette tool places points click by click, and this makes the node from
   * them, `points` in the unit space of the frame `props` gives (0..1, origin top-left).
   */
  createFromPoints?: (props: CreateProps, points: readonly Point[], closed: boolean) => Node;
  /**
   * What the node's edit mode (a double-click on it, or Enter with it selected alone) edits: `'label'`, the default, its
   * text part in place; `'vertices'`, the unit-space `points` of a type drawn vertex by vertex, each shown as a point to
   * drag, with its move and resize handles hidden. Enter, Escape or a press outside the node leaves either.
   */
  editor?: NodeEditor;
  /** The outline drawn while the node is moved or drawn: its frame unless the shape fits a `circle` inside it. */
  bounds?: (node: Node) => 'frame' | 'circle';
  /**
   * The host's own way to open this node, when it has one (a frame showing an object rather than a scene):
   * opening calls it instead of drilling in, and auto-drill passes the node by.
   */
  hostOpen?: (node: Node) => (() => void) | undefined;
  /**
   * Controls floating above the node, flush with its right edge and at screen size, so they neither cover the node's
   * content nor scale with the camera; renders nothing when it returns `null`.
   */
  toolbar?: ComponentType<NodeViewProps>;
  /** The text properties edited in place, in order; the first is the node's main text. */
  parts?: readonly PartField[];
  /** Properties-panel renderers for this type's fields, by path (e.g. a list as lines). */
  fields?: FormFieldMap;
  /** The palette and the create menu offer the type; false for a type placed some other way (an instance). */
  palette?: boolean;
  /** The frame draws no fill or border unless the node's style asks for them: the type draws all it shows. */
  bare?: boolean;
  /** The type draws past its frame (a stroke centred on the frame's edge), so the frame does not clip it. */
  unclipped?: boolean;
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
