//
// Copyright 2026 DXOS.org
//

//
// The projection seam (docs/DESIGN.md §3): the only thing the surface knows. It reads a positioned
// scene and sends intents; the projection owns the drawing model and decides what an intent means.
// `freehand` is the identity projection: intents write coordinates straight into the scene.
//

import * as Atom from 'effect/unstable/reactivity/Atom';
import type * as Registry from 'effect/unstable/reactivity/AtomRegistry';

import { boundsCenter } from './camera.ts';
import { topZ } from './order.ts';
import { type SceneStore, updateScene } from './store.ts';
import { type Capabilities, type Cell, type Intent, type Scene, type SceneId, isLink, isPlaced } from './types.ts';

export type Projection = {
  /** Positioned cells; re-emitted on every model change. */
  readonly scene: Atom.Atom<Scene>;
  /** May apply, partially apply, rewrite the model, or reject. */
  apply: (intent: Intent) => void;
  readonly capabilities: Capabilities;
};

const EMPTY: Scene = { id: '', cells: {} };

/** Freehand semantics as a pure reducer, so it is testable and reusable by other projections. */
export const reduceIntent = (scene: Scene, intent: Intent): Scene => {
  switch (intent.kind) {
    case 'move': {
      const cells = { ...scene.cells };
      let changed = false;
      for (const id of intent.ids) {
        const cell = cells[id];
        if (cell && isPlaced(cell) && !cell.locked) {
          cells[id] = {
            ...cell,
            center: { x: cell.center.x + intent.delta.x, y: cell.center.y + intent.delta.y },
          };
          changed = true;
        }
      }
      return changed ? { ...scene, cells } : scene;
    }

    case 'resize': {
      const cell = scene.cells[intent.id];
      if (!cell || !isPlaced(cell) || cell.locked) {
        return scene;
      }
      return {
        ...scene,
        cells: {
          ...scene.cells,
          [intent.id]: {
            ...cell,
            center: boundsCenter(intent.bounds),
            size: { width: intent.bounds.width, height: intent.bounds.height },
          },
        },
      };
    }

    case 'link': {
      const source = scene.cells[intent.source.cell];
      const target = scene.cells[intent.target.cell];
      if (!source || !target || !isPlaced(source) || !isPlaced(target) || source.id === target.id) {
        return scene;
      }
      const link: Cell = {
        kind: 'link',
        id: intent.id,
        z: topZ(Object.values(scene.cells)),
        source: intent.source,
        target: intent.target,
      };
      return { ...scene, cells: { ...scene.cells, [link.id]: link } };
    }

    case 'create': {
      return { ...scene, cells: { ...scene.cells, [intent.cell.id]: intent.cell } };
    }

    case 'delete': {
      const ids = new Set(intent.ids);
      const cells: Record<string, Cell> = {};
      for (const cell of Object.values(scene.cells)) {
        if (ids.has(cell.id)) {
          continue;
        }
        // A link loses its meaning with either end, so it goes too.
        if (isLink(cell) && (ids.has(cell.source.cell) || ids.has(cell.target.cell))) {
          continue;
        }
        cells[cell.id] = cell;
      }
      return { ...scene, cells };
    }

    case 'reorder': {
      const cell = scene.cells[intent.id];
      if (!cell || cell.z === intent.z) {
        return scene;
      }
      return { ...scene, cells: { ...scene.cells, [intent.id]: { ...cell, z: intent.z } } };
    }
  }
};

export type FreehandProjectionOptions = {
  registry: Registry.AtomRegistry;
  store: SceneStore;
  sceneId: SceneId;
};

export const freehandCapabilities: Capabilities = { move: true, resize: true, link: true, create: true, delete: true };

/** Identity projection over the store: what the surface asks for is what the model becomes. */
export const createFreehandProjection = ({ registry, store, sceneId }: FreehandProjectionOptions): Projection => ({
  scene: Atom.keepAlive(Atom.make((get) => get(store.scene(sceneId)) ?? EMPTY)),
  apply: (intent) => updateScene(registry, store, sceneId, (scene) => reduceIntent(scene, intent)),
  capabilities: freehandCapabilities,
});
