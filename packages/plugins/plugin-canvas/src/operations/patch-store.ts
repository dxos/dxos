//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Registry from 'effect/reactivity/AtomRegistry';

import { Database, type Ref } from '@dxos/echo';
import type * as Drawing from '@dxos/plugin-illustrator/Drawing';
import { type VersionedSource, storeVersions } from '@dxos/react-ui-canvas/headless';

import { type LiveCanvasStore, bindCanvasStore, liveCanvasStore } from '../model/store.ts';

/**
 * Runs `use` over the canvas's store: the one a view has open, so the view shows the edit at once and its linked
 * drawings are already loaded, else one bound for the call. The canvas is loaded through its ref, as the tracker
 * invokes an inverse with no space to provide a database service from.
 */
export const withCanvasStore = <A>(
  ref: Ref.Ref<Drawing.Canvas>,
  use: (store: LiveCanvasStore & { canvas: Drawing.Canvas; versions: VersionedSource }) => A,
) =>
  Effect.gen(function* () {
    const canvas = yield* Database.load(ref);
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
