//
// Copyright 2026 DXOS.org
//

//
// The draw scene the editor uses while an Object is open in place: it shows the Instance's parts where the Instance
// draws them, and writes what an edit made back into the definition and the Instance (`utils/inside.ts`). Every
// gesture, command and panel goes through `DrawScene`, so wrapping it here is what makes moving a part, restyling it
// or typing in it work inside an Object without any of them knowing about Objects.
//

import * as Atom from 'effect/reactivity/Atom';
import type * as Registry from 'effect/reactivity/AtomRegistry';

import { isInstanceNode } from '@dxos/scene';

import { type NodeRegistry, type RenderList2D } from '../model/index.ts';
import { type Inside, insideScene, insideWrites } from '../utils/index.ts';
import { type DrawState } from './draw-state.ts';
import { type DrawScene } from './draw.ts';

export type InsideSceneOptions = {
  registry: Registry.AtomRegistry;
  store: DrawState;
  /** The scene the Instance is in, which the editor was showing before it was entered. */
  outer: DrawScene;
  inside: Inside;
  nodeRegistry: NodeRegistry;
};

const EMPTY: RenderList2D = { id: '', nodes: {}, links: {} };

/**
 * `outer` with the entered Instance replaced by its parts. An edit lands on the parts as they are drawn and is then
 * written to the definition — or, for a part's text, to this Instance's overrides — as one change.
 */
export const createInsideScene = ({ registry, store, outer, inside, nodeRegistry }: InsideSceneOptions): DrawScene => {
  const parts = () => {
    const scene = registry.get(outer.scene);
    const instance = scene.nodes[inside.instance];
    const composite = registry.get(store.views)[inside.composite];
    return instance && isInstanceNode(instance) && composite
      ? { ...insideScene(scene, instance, composite), instance, composite }
      : undefined;
  };
  return {
    ...outer,
    scene: Atom.keepAlive(
      Atom.make((get) => {
        const scene = get(outer.scene);
        const instance = scene.nodes[inside.instance];
        const composite = get(store.views)[inside.composite];
        return instance && isInstanceNode(instance) && composite
          ? insideScene(scene, instance, composite).scene
          : (scene ?? EMPTY);
      }),
    ),
    apply: (edit) => {
      const current = parts();
      if (!current) {
        return;
      }
      const edited = edit(current.scene);
      if (edited === current.scene) {
        return;
      }
      const writes = insideWrites(nodeRegistry, current.instance, current.composite, edited, current.parts);
      if (writes.composite) {
        registry.set(store.views, { ...registry.get(store.views), [current.composite.id]: writes.composite });
      }
      if (writes.overrides !== undefined || 'overrides' in writes) {
        const { overrides, ...rest } = current.instance;
        outer.apply((scene) => ({
          ...scene,
          nodes: {
            ...scene.nodes,
            [current.instance.id]: writes.overrides ? { ...rest, overrides: writes.overrides } : rest,
          },
        }));
      }
    },
  };
};
