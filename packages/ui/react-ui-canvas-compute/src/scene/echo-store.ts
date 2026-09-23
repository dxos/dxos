//
// Copyright 2026 DXOS.org
//

//
// The scene store over a `CanvasBoard` (MIGRATION.md M4): `layout.nodes` are the scene's nodes and
// `layout.edges` its links, so a board written by the old editor opens on the engine unchanged. The
// store is the only seam that changes — `SceneView` takes this exactly as it takes the memory store.
//
// The two representations differ in three places, and each is translated rather than migrated:
// z-order (an array in the layout, a fractional key in the scene), style (`guide` / `classNames` at the
// top of a shape, a `style` object on a node) and link ends (an edge's `input` / `output` property
// names, a link endpoint's anchor-id port).
//

import * as Equal from 'effect/Equal';
import * as Atom from 'effect/unstable/reactivity/Atom';

import { DEFAULT_INPUT, DEFAULT_OUTPUT } from '@dxos/conductor';
import { Obj } from '@dxos/echo';
import { CanvasBoard } from '@dxos/react-ui-canvas-editor';
import {
  type Link,
  LINK_TYPES,
  type LinkType,
  type Node,
  type NodeStyle,
  type Scene,
  type SceneId,
  type SceneMap,
  type SceneStore,
  initialKeys,
  sortByZ,
} from '@dxos/react-ui-canvas/scene';

import { createAnchorId, parseAnchorId } from '../shapes/defs.ts';

/** A board's layout as both representations see it: the arrays, whether live (ECHO) or plain. */
type Layout = { nodes: CanvasBoard.Shape[]; edges: CanvasBoard.Connection[] };

/** The scene id a board's own layout takes; a board holds one scene, so it is the board's id. */
export const boardSceneId = (board: CanvasBoard.CanvasBoard): SceneId => board.id;

/** An edge naming a type the engine does not have is drawn as a curve, which is what the editor drew. */
const DEFAULT_LINK_TYPE: LinkType = 'curve';
const linkType = (type: string | undefined): LinkType =>
  LINK_TYPES.find((candidate) => candidate === type) ?? DEFAULT_LINK_TYPE;

//
// Read
//

/**
 * The scene a layout stands for. `z` comes from array order — the order the editor painted in — so the
 * first read of an existing board reproduces its stacking exactly; every later read uses the key the
 * write path put the node's position in the array for.
 */
export const sceneFromLayout = (id: SceneId, layout: Partial<Layout> | undefined, name?: string): Scene => {
  const shapes = layout?.nodes ?? [];
  const edges = layout?.edges ?? [];
  const nodeKeys = initialKeys(shapes.length);
  const linkKeys = initialKeys(edges.length);
  const nodes: Record<string, Node> = {};
  shapes.forEach((shape, index) => {
    nodes[shape.id] = nodeFromShape(shape, nodeKeys[index]);
  });
  const links: Record<string, Link> = {};
  edges.forEach((edge, index) => {
    links[edge.id] = linkFromEdge(edge, linkKeys[index]);
  });
  return { id, ...(name ? { name } : {}), nodes, links };
};

const nodeFromShape = (shape: CanvasBoard.Shape, z: string): Node => {
  const { guide: _guide, classNames: _classNames, ...rest } = shape as CanvasBoard.Shape & { style?: NodeStyle };
  const style = styleFromShape(shape);
  return {
    ...(rest as unknown as Node),
    z,
    ...(style ? { style } : {}),
  };
};

/** A shape's look: its own `style` when the engine wrote one, else the editor's two top-level fields. */
const styleFromShape = (shape: CanvasBoard.Shape): NodeStyle | undefined => {
  const { style, guide, classNames } = shape as CanvasBoard.Shape & { style?: NodeStyle };
  const legacy: NodeStyle = {
    ...(guide !== undefined ? { guide } : {}),
    ...(classNames !== undefined ? { className: classNames } : {}),
  };
  const merged = { ...legacy, ...style };
  return Object.keys(merged).length > 0 ? merged : undefined;
};

/**
 * The link an edge stands for. Both ends are node ends: the editor has no free endpoints, and the
 * property names it stores become the anchor ids the compute node definitions draw ports for.
 */
const linkFromEdge = (edge: CanvasBoard.Connection, z: string): Link => {
  const { id, source, target, input, output, type } = edge;
  return {
    id,
    type: linkType(type),
    z,
    source: { node: source, port: createAnchorId('output', output ?? DEFAULT_OUTPUT) },
    target: { node: target, port: createAnchorId('input', input ?? DEFAULT_INPUT) },
  } as Link;
};

//
// Write
//

/**
 * The scene applied to a layout in place: each element updated, added or removed on its own, and the
 * arrays left in z order. A wholesale rebuild would be one Automerge delta per drag frame covering the
 * whole board, so every change here touches only what changed.
 */
export const applySceneToLayout = (layout: Layout, scene: Scene): void => {
  applyElements(layout.nodes, sortByZ(Object.values(scene.nodes)).map(shapeFromNode));
  applyElements(layout.edges, sortByZ(Object.values(scene.links)).map(edgeFromLink));
};

/** One array reconciled against the elements it should hold, in that order. */
const applyElements = <T extends { id: string }>(current: T[], next: readonly T[]): void => {
  const wanted = new Map(next.map((element) => [element.id, element]));
  for (let index = current.length - 1; index >= 0; index--) {
    const element = current[index];
    const update = wanted.get(element.id);
    if (update) {
      assignFields(element as Record<string, unknown>, update as Record<string, unknown>);
    } else {
      current.splice(index, 1);
    }
  }
  const present = new Set(current.map(({ id }) => id));
  for (const element of next) {
    if (!present.has(element.id)) {
      current.push(element);
    }
  }
  reorder(current, next);
};

/** The array put in `next`'s order, moving only the elements that are out of place. */
const reorder = <T extends { id: string }>(current: T[], next: readonly T[]): void => {
  const order = new Map(next.map((element, index) => [element.id, index]));
  for (let index = 1; index < current.length; index++) {
    const element = current[index];
    const rank = order.get(element.id) ?? 0;
    let target = index;
    while (target > 0 && (order.get(current[target - 1].id) ?? 0) > rank) {
      target--;
    }
    if (target !== index) {
      current.splice(index, 1);
      current.splice(target, 0, element);
    }
  }
};

/** The shape a node is stored as: the node's own fields, the style kept and also mirrored for the editor. */
const shapeFromNode = (node: Node): CanvasBoard.Shape => {
  const { z: _z, style, ...rest } = node as Node & { style?: NodeStyle };
  return {
    ...(rest as unknown as CanvasBoard.Shape),
    ...(style ? { style } : {}),
    // The old editor reads these two, so a board stays readable by it (M5 retires them with the package).
    ...(style?.guide !== undefined ? { guide: style.guide } : {}),
    ...(style?.className !== undefined ? { classNames: style.className } : {}),
  } as CanvasBoard.Shape;
};

const edgeFromLink = (link: Link): CanvasBoard.Connection => {
  const source = 'node' in link.source ? link.source : undefined;
  const target = 'node' in link.target ? link.target : undefined;
  return {
    id: link.id,
    type: link.type,
    source: source?.node ?? '',
    target: target?.node ?? '',
    output: parseAnchorId(source?.port ?? '')[1] || DEFAULT_OUTPUT,
    input: parseAnchorId(target?.port ?? '')[1] || DEFAULT_INPUT,
  } as CanvasBoard.Connection;
};

/** Fields written one by one, so an unchanged field produces no Automerge change. */
const assignFields = (element: Record<string, unknown>, next: Record<string, unknown>): void => {
  for (const [key, value] of Object.entries(next)) {
    // Structural, so a node whose geometry object was rebuilt but holds the same numbers writes nothing.
    if (key !== 'id' && !Equal.equals(element[key], value)) {
      element[key] = value;
    }
  }
  for (const key of Object.keys(element)) {
    if (key !== 'id' && !(key in next)) {
      delete element[key];
    }
  }
};

//
// Store
//

export type EchoStoreOptions = {
  /** The scene the board's own layout is; defaults to the board's id. */
  sceneId?: SceneId;
};

/**
 * A `SceneStore` over a board's layout: reads derive the scene from the object (re-deriving whenever
 * ECHO announces a change, including a peer's edit), writes go back through `Obj.update`. Only the
 * board's own scene lives here — a nested scene needs another object and is not part of M4.
 */
export const createEchoStore = (board: CanvasBoard.CanvasBoard, options: EchoStoreOptions = {}): SceneStore => {
  const sceneId = options.sceneId ?? boardSceneId(board);
  const scenes = Atom.keepAlive(
    Atom.writable<SceneMap, SceneMap>(
      (get) => {
        const snapshot = get(Obj.atom(board));
        return { [sceneId]: sceneFromLayout(sceneId, snapshot.layout as Partial<Layout>, snapshot.name) };
      },
      (ctx, next) => {
        const scene = next[sceneId];
        if (scene) {
          Obj.update(board, (board) => applySceneToLayout(board.layout as Layout, scene));
        }
        ctx.refreshSelf();
      },
    ),
  );

  const derived = new Map<SceneId, Atom.Atom<Scene | undefined>>();
  return {
    scenes,
    scene: (id) => {
      let atom = derived.get(id);
      if (!atom) {
        atom = Atom.keepAlive(Atom.make((get) => get(scenes)[id]));
        derived.set(id, atom);
      }
      return atom;
    },
  };
};
