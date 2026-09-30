//
// Copyright 2026 DXOS.org
//

//
// Binds a `Drawing.Canvas` to the engine's `SceneStore`: the store's atom is fed from the canvas
// records and every store write goes back as record-level changes inside one `Obj.update`, so the
// view stays the memory store's client and ECHO merges edits element by element.
//

import type * as Registry from 'effect/unstable/reactivity/AtomRegistry';

import { Obj } from '@dxos/echo';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import { type SceneId, type SceneStore, createMemoryStore } from '@dxos/react-ui-canvas/scene';

import { Canvas } from '#types';

import { clone, readScenes, rootOf, seedContent, writeScenes } from './content.ts';

export type BoundCanvasStore = {
  store: SceneStore;
  root: SceneId;
  dispose: () => void;
};

export const bindCanvasStore = (registry: Registry.AtomRegistry, canvas: Drawing.Canvas): BoundCanvasStore => {
  let root = rootOf(canvas.content);
  if (root === undefined) {
    Obj.update(canvas, (canvas) => {
      root = seedContent(canvas.content);
    });
  }
  const store = createMemoryStore(Object.values(readScenes(clone(canvas.content))));

  // Our own writes notify ECHO synchronously; the flag keeps them from bouncing back into the atom.
  let writing = false;
  const unsubscribeCanvas = Obj.subscribe(canvas, () => {
    if (!writing) {
      registry.set(store.scenes, readScenes(clone(canvas.content)));
    }
  });
  const unsubscribeStore = registry.subscribe(store.scenes, (scenes) => {
    writing = true;
    try {
      Obj.update(canvas, (canvas) => {
        writeScenes(canvas.content, scenes);
      });
    } finally {
      writing = false;
    }
  });

  return {
    store,
    root: root ?? seedContent({}),
    dispose: () => {
      unsubscribeCanvas();
      unsubscribeStore();
    },
  };
};

/** A fresh canvas for the variant: the root scene and nothing else. */
export const createCanvas = (): Drawing.Canvas => {
  const content = {};
  seedContent(content);
  return Drawing.makeCanvas({ schema: Canvas.SCENE_SCHEMA, content });
};
