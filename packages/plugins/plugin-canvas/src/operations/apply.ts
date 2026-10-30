//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';
import { type VersionChange, recordChanges } from '@dxos/react-ui-canvas/headless';
import { constrain2D } from '@dxos/react-ui-scene/canvas';
import { type LayoutIntent, Scene, isLayoutIntent } from '@dxos/scene';

import { Canvas, CanvasOperation } from '#types';

import { openScene } from '../model/canvas-document.ts';
import { applyLayoutIntent, canvasLayouts, canvasSource, layoutRecord } from '../model/layout-source.ts';
import { CanvasElementNotFoundError, InvalidIntentError, UnversionedCanvasError, sceneCanvasFor } from './canvas.ts';

/**
 * Applies layout intents to a scene canvas's layout `view` (the open scene's by default), in that layout's dimension
 * and kept to its mode (snapped onto its lattice, re-placed by its constraints), recorded over every layout the canvas
 * lists so the patch it returns undoes it.
 */
const applyToLayout = Effect.fn(function* (
  canvas: Canvas.Canvas,
  view: string | undefined,
  intents: readonly unknown[],
) {
  const layout = view === undefined ? openScene(canvas)?.layout.target : canvasLayouts(canvas).get(view);
  if (!Obj.instanceOf(Scene.Layout2D, layout) && !Obj.instanceOf(Scene.Layout3D, layout)) {
    return yield* Effect.fail(
      new CanvasElementNotFoundError({ message: `Canvas ${canvas.id} has no layout ${view ?? 'open'}.` }),
    );
  }
  const dim = Obj.instanceOf(Scene.Layout3D, layout) ? '3d' : '2d';
  // The schema leaves intents untyped, so a malformed one is refused here before anything is written.
  const valid = intents.flatMap((intent): LayoutIntent[] => (isLayoutIntent(intent, dim) ? [intent] : []));
  if (valid.length < intents.length) {
    const invalid = intents.findIndex((intent) => !isLayoutIntent(intent, dim));
    return yield* Effect.fail(new InvalidIntentError({ message: `Intent ${invalid} is not a valid layout intent.` }));
  }
  // Without heads the edit could not be undone.
  if (Obj.version(layout).automergeHeads === undefined) {
    return yield* Effect.fail(new UnversionedCanvasError({ message: `Canvas ${canvas.id} has no version history.` }));
  }
  // An agent's edit keeps the layout's mode, as a person's drag with snapping on does.
  const constrained = constrain2D(layoutRecord(layout), { kind: 'batch', intents: valid }, { snap: true });
  if (constrained === undefined) {
    return yield* Effect.fail(
      new InvalidIntentError({ message: `The intents break the mode of layout ${layout.key}; nothing was written.` }),
    );
  }
  const [change] = recordChanges([canvasSource(canvas)], () => applyLayoutIntent(layout, constrained));
  return applied(canvas.id, change);
});

/** Each written object's Automerge heads, keyed by layout. */
type CanvasHeads = Readonly<Record<string, readonly string[]>>;

const isCanvasHeads = (value: unknown): value is CanvasHeads =>
  typeof value === 'object' &&
  value !== null &&
  Object.values(value).every((heads) => Array.isArray(heads) && heads.every((head) => typeof head === 'string'));

/** What an edit did, as the operation returns it: no heads and no paths when it wrote nothing. */
const applied = (canvas: string, change: VersionChange | undefined) =>
  change && isCanvasHeads(change.before) && isCanvasHeads(change.after)
    ? { canvas, before: change.before, after: change.after, paths: change.paths }
    : { canvas, before: {}, after: {}, paths: [] };

const handler: Operation.WithHandler<typeof CanvasOperation.Apply> = CanvasOperation.Apply.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ canvas: ref, view, intents }) {
      // A legacy scene canvas is edited on the scene canvas it migrates onto, as opening it would.
      const canvas = yield* sceneCanvasFor(yield* Database.load(ref));
      return yield* applyToLayout(canvas, view, intents);
    }),
  ),
);

export default handler;
