//
// Copyright 2026 DXOS.org
//

//
// The projection seam (docs/DESIGN.md §3): the only thing the surface knows. It reads a positioned
// scene and sends intents; the projection owns the drawing model and decides what an intent means.
// `freehand` is the identity projection: intents write coordinates straight into the scene.
//

import * as Schema from 'effect/Schema';
import * as Atom from 'effect/unstable/reactivity/Atom';
import type * as Registry from 'effect/unstable/reactivity/AtomRegistry';

import { layoutScene } from '../utils/layout.ts';
import { resizeNode } from '../utils/shapes.ts';
import { type SceneStore, putScene, updateScene } from './store.ts';
import {
  type Capabilities,
  type Intent,
  type Link,
  type Node,
  OpenScene,
  type Scene,
  type SceneId,
  endpointNode,
} from './types.ts';

export type Projection = {
  /** Positioned nodes and links; re-emitted on every model change. */
  readonly scene: Atom.Atom<Scene>;
  /** May apply, partially apply, rewrite the model, or reject. */
  apply: (intent: Intent) => void;
  readonly capabilities: Capabilities;
  /**
   * The model as an opaque immutable value, identical (`===`) when nothing changed, so the view can
   * keep an undo log without knowing what the model is (`undo.ts`).
   */
  snapshot: () => unknown;
  restore: (snapshot: unknown) => void;
};

const EMPTY: Scene = { id: '', nodes: {}, links: {} };

/** Freehand semantics as a pure reducer, so it is testable and reusable by other projections. */
export const reduceIntent = (scene: Scene, intent: Intent): Scene => {
  switch (intent.kind) {
    case 'move': {
      const nodes = { ...scene.nodes };
      let changed = false;
      for (const id of intent.ids) {
        const node = nodes[id];
        if (node && !node.locked) {
          nodes[id] = { ...node, center: { x: node.center.x + intent.delta.x, y: node.center.y + intent.delta.y } };
          changed = true;
        }
      }
      return changed ? { ...scene, nodes } : scene;
    }

    case 'resize': {
      const node = scene.nodes[intent.id];
      if (!node || node.locked) {
        return scene;
      }
      return { ...scene, nodes: { ...scene.nodes, [intent.id]: resizeNode(node, intent.bounds) } };
    }

    case 'link': {
      const { link } = intent;
      // Every node end must exist, and a link never joins a node to itself; free ends need nothing.
      const nodes = [link.source, link.target].map(endpointNode);
      if (nodes.some((id) => id !== undefined && scene.nodes[id] === undefined)) {
        return scene;
      }
      if (nodes[0] !== undefined && nodes[0] === nodes[1]) {
        return scene;
      }
      return { ...scene, links: { ...scene.links, [link.id]: link } };
    }

    case 'create': {
      return { ...scene, nodes: { ...scene.nodes, [intent.node.id]: intent.node } };
    }

    case 'delete': {
      const ids = new Set(intent.ids);
      const nodes: Record<string, Node> = {};
      for (const node of Object.values(scene.nodes)) {
        if (!ids.has(node.id)) {
          nodes[node.id] = node;
        }
      }
      const links: Record<string, Link> = {};
      for (const link of Object.values(scene.links)) {
        // A link loses its meaning with either end, so it goes too.
        if (
          !ids.has(link.id) &&
          !ids.has(endpointNode(link.source) ?? '') &&
          !ids.has(endpointNode(link.target) ?? '')
        ) {
          links[link.id] = link;
        }
      }
      return { ...scene, nodes, links };
    }

    case 'reorder': {
      const node = scene.nodes[intent.id];
      if (node) {
        return node.z === intent.z
          ? scene
          : { ...scene, nodes: { ...scene.nodes, [intent.id]: { ...node, z: intent.z } } };
      }
      const link = scene.links[intent.id];
      if (link) {
        return link.z === intent.z
          ? scene
          : { ...scene, links: { ...scene.links, [intent.id]: { ...link, z: intent.z } } };
      }
      return scene;
    }

    case 'layout':
      return layoutScene(scene, intent.ids);

    case 'batch':
      return intent.intents.reduce(reduceIntent, scene);

    case 'update': {
      const node = scene.nodes[intent.id];
      if (node) {
        const next = Object.assign({}, node, intent.values, { id: node.id, type: node.type });
        return { ...scene, nodes: { ...scene.nodes, [intent.id]: next } };
      }
      const link = scene.links[intent.id];
      if (link) {
        const next = Object.assign({}, link, intent.values, { id: link.id, type: link.type });
        return { ...scene, links: { ...scene.links, [intent.id]: next } };
      }
      return scene;
    }
  }
};

export type FreehandProjectionOptions = {
  registry: Registry.AtomRegistry;
  store: SceneStore;
  sceneId: SceneId;
};

export const freehandCapabilities: Capabilities = {
  move: true,
  resize: true,
  link: true,
  create: true,
  delete: true,
  update: true,
  layout: true,
};

/** What a read-only view may do: look, select and navigate, nothing that reaches the model. */
export const readonlyCapabilities: Capabilities = {
  move: false,
  resize: false,
  link: false,
  create: false,
  delete: false,
  update: false,
  layout: false,
};

/** Identity projection over the store: what the surface asks for is what the model becomes. */
export const createFreehandProjection = ({ registry, store, sceneId }: FreehandProjectionOptions): Projection => ({
  scene: Atom.keepAlive(Atom.make((get) => get(store.scene(sceneId)) ?? EMPTY)),
  apply: (intent) => updateScene(registry, store, sceneId, (scene) => reduceIntent(scene, intent)),
  capabilities: freehandCapabilities,
  snapshot: () => registry.get(store.scene(sceneId)),
  restore: (snapshot) => {
    // A host's nodes are `NodeBase` to the engine, so a snapshot is checked against the open schema.
    if (Schema.is(OpenScene)(snapshot)) {
      putScene(registry, store, snapshot);
    }
  },
});
