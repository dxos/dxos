//
// Copyright 2026 DXOS.org
//

//
// Edits of a scene as the engine draws it (COMMON-CORE C.2): what a gesture or a command makes of the open render list.
// The draw state previews them, and what a gesture leaves on release reaches the host as layout intents, so none of
// these is ever stored as such.
//

import {
  type Bounds,
  type ElementId,
  type Link,
  type Node,
  type NodeId,
  type Point,
  endpointNode,
  isViewNode,
} from '@dxos/scene';

import { type LinkValues, type NodeValues, type View } from '../model/index.ts';
import { layoutView } from './layout.ts';
import { resizeNode } from './shapes.ts';

/** A change to the open scene; the same scene back when there is nothing to change. */
export type SceneEdit = (scene: View) => View;

/** The edits applied in order, as one change (one undo step). */
export const chainEdits =
  (edits: readonly SceneEdit[]): SceneEdit =>
  (scene) =>
    edits.reduce((current, edit) => edit(current), scene);

/** Moves the unlocked nodes of `ids` by `delta`. */
export const moveNodes =
  (ids: readonly NodeId[], delta: Point): SceneEdit =>
  (scene) => {
    const nodes = { ...scene.nodes };
    let changed = false;
    for (const id of ids) {
      const node = nodes[id];
      if (node && !node.locked) {
        nodes[id] = { ...node, center: { x: node.center.x + delta.x, y: node.center.y + delta.y } };
        changed = true;
      }
    }
    return changed ? { ...scene, nodes } : scene;
  };

/** Gives an unlocked node the frame `bounds`. */
export const resizeTo =
  (id: NodeId, bounds: Bounds): SceneEdit =>
  (scene) => {
    const node = scene.nodes[id];
    return !node || node.locked ? scene : { ...scene, nodes: { ...scene.nodes, [id]: resizeNode(node, bounds) } };
  };

/** Adds a link whose node ends exist; a link never joins a node to itself, and free ends need nothing. */
export const insertLink =
  (link: Link): SceneEdit =>
  (scene) => {
    const nodes = [link.source, link.target].map(endpointNode);
    if (nodes.some((id) => id !== undefined && scene.nodes[id] === undefined)) {
      return scene;
    }
    if (nodes[0] !== undefined && nodes[0] === nodes[1]) {
      return scene;
    }
    return { ...scene, links: { ...scene.links, [link.id]: link } };
  };

/** Adds a node; an object's parts hold no view, as a view inside an object would be a place with no single path. */
export const insertNode =
  (node: Node): SceneEdit =>
  (scene) =>
    scene.kind === 'composite' && isViewNode(node) ? scene : { ...scene, nodes: { ...scene.nodes, [node.id]: node } };

/** Removes the nodes and links of `ids`, and every link that loses an end with them. */
export const deleteElements =
  (ids: readonly ElementId[]): SceneEdit =>
  (scene) => {
    const removed = new Set(ids);
    const nodes = Object.fromEntries(Object.entries(scene.nodes).filter(([id]) => !removed.has(id)));
    const links = Object.fromEntries(
      Object.entries(scene.links).filter(
        ([id, link]) =>
          !removed.has(id) &&
          !removed.has(endpointNode(link.source) ?? '') &&
          !removed.has(endpointNode(link.target) ?? ''),
      ),
    );
    return { ...scene, nodes, links };
  };

/** Puts a node or link at `z` in the stacking order. */
export const reorderElement =
  (id: ElementId, z: string): SceneEdit =>
  (scene) => {
    const node = scene.nodes[id];
    if (node) {
      return node.z === z ? scene : { ...scene, nodes: { ...scene.nodes, [id]: { ...node, z } } };
    }
    const link = scene.links[id];
    if (link) {
      return link.z === z ? scene : { ...scene, links: { ...scene.links, [id]: { ...link, z } } };
    }
    return scene;
  };

/** Sets a node's or link's fields (a label, text, geometry, control points); its `id` and `type` never change. */
export const updateElement =
  (id: ElementId, values: NodeValues | LinkValues): SceneEdit =>
  (scene) => {
    const node = scene.nodes[id];
    if (node) {
      return { ...scene, nodes: { ...scene.nodes, [id]: Object.assign({}, node, values, { id, type: node.type }) } };
    }
    const link = scene.links[id];
    if (link) {
      return { ...scene, links: { ...scene.links, [id]: Object.assign({}, link, values, { id, type: link.type }) } };
    }
    return scene;
  };

/** Arranges the scene, or just `ids` when the selection is what was asked to be tidied. */
export const arrangeScene =
  (ids?: readonly ElementId[]): SceneEdit =>
  (scene) =>
    layoutView(scene, ids);
