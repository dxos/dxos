//
// Copyright 2026 DXOS.org
//

import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import * as Registry from 'effect/reactivity/AtomRegistry';

import { Database, type Obj, type Ref } from '@dxos/echo';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import { type VersionedSource, type ViewStore, storeVersions } from '@dxos/react-ui-canvas/headless';
import { type ViewId } from '@dxos/scene';

import { bindCanvasStore, liveCanvasStore } from '../model/store.ts';

/** A legacy canvas's store, as an operation edits it. */
export type CanvasStore = {
  registry: Registry.AtomRegistry;
  bound: { store: ViewStore; root: ViewId };
  canvas: Drawing.Canvas;
  versions: VersionedSource;
};

/** The canvas an operation was given is neither a scene canvas nor a legacy one. */
export class NotACanvasError extends Data.TaggedError('NotACanvasError')<{ message: string }> {}

/**
 * Runs `use` over a legacy canvas's store: the one a view has open, so the view shows the edit at once and its linked
 * drawings are already loaded, else one bound for the call. The canvas is loaded through its ref, as the tracker
 * invokes an inverse with no space to provide a database service from.
 */
export const withCanvasStore = <A>(ref: Ref.Ref<Obj.Unknown>, use: (store: CanvasStore) => A) =>
  Effect.gen(function* () {
    const canvas = yield* Database.load(ref);
    if (!Drawing.isCanvas(canvas)) {
      return yield* Effect.fail(new NotACanvasError({ message: `Object ${canvas.id} is not a canvas.` }));
    }
    const open = liveCanvasStore(canvas.id);
    if (open) {
      return use({ ...open, canvas, versions: storeVersions(open.registry, open.bound.store) });
    }
    const registry = Registry.make();
    const bound = bindCanvasStore(registry, canvas);
    try {
      return use({ registry, bound, canvas, versions: storeVersions(registry, bound.store) });
    } finally {
      bound.dispose();
    }
  });
