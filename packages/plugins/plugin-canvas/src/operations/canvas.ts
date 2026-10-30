//
// Copyright 2026 DXOS.org
//

import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';

import { Database, Filter, Obj, Ref } from '@dxos/echo';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';

import { Canvas } from '#types';

import { migrateSceneDrawing } from '../model/migrate-scenes.ts';

/**
 * The scene `Canvas` a drawing draws on: a legacy scene canvas is moved onto one first (`migrateSceneDrawing`), as
 * opening it would, so an operation has one model to edit.
 */
export const sceneCanvasOf = Effect.fn(function* (drawing: Drawing.Drawing) {
  const current = yield* Database.load(drawing.canvas);
  // A newer plugin's format may hold fields this one would drop in moving it.
  if (Drawing.isCanvas(current) && Canvas.isNewerScene(current.schema)) {
    return yield* Effect.fail(
      new NewerCanvasError({
        message: `Canvas ${current.id} is at ${current.schema}; update the Canvas plugin to edit it.`,
      }),
    );
  }
  yield* migrateSceneDrawing(drawing);
  const canvas = yield* Database.load(drawing.canvas);
  if (!Canvas.isCanvas(canvas)) {
    return yield* Effect.fail(new DrawingDialectError({ message: 'The drawing is not a scene canvas.' }));
  }
  return canvas;
});

/**
 * The scene `Canvas` an operation was given, or the one a legacy scene canvas's drawing migrates onto; the canvas's own
 * database serves the migration, as `Apply` is invoked with no database service.
 */
export const sceneCanvasFor = Effect.fn(function* (canvas: Obj.Unknown) {
  if (Canvas.isCanvas(canvas)) {
    return canvas;
  }
  const db = Obj.getDatabase(canvas);
  if (!Drawing.isCanvas(canvas) || !db) {
    return yield* Effect.fail(new DrawingDialectError({ message: `Object ${canvas.id} is not a scene canvas.` }));
  }
  return yield* Effect.gen(function* () {
    const drawings = yield* Database.query(Filter.type(Drawing.Drawing)).run;
    const drawing = drawings.find((drawing) => Ref.hasEntityId(canvas.id)(drawing.canvas));
    if (!drawing) {
      return yield* Effect.fail(new DrawingDialectError({ message: `No drawing draws on canvas ${canvas.id}.` }));
    }
    return yield* sceneCanvasOf(drawing);
  }).pipe(Effect.provide(Database.layer(db)));
});

/** A legacy scene canvas, whose edits are made on the scene canvas it migrates onto. */
export class LegacyCanvasError extends Data.TaggedError('LegacyCanvasError')<{ message: string }> {}

/** The drawing has no scene or node of the id an operation named. */
export class CanvasElementNotFoundError extends Data.TaggedError('CanvasElementNotFoundError')<{ message: string }> {}

/** The drawing an operation was given is not of the dialect it reads. */
export class DrawingDialectError extends Data.TaggedError('DrawingDialectError')<{ message: string }> {}

/** An intent sent to the canvas that is not one the projection understands. */
export class InvalidIntentError extends Data.TaggedError('InvalidIntentError')<{ message: string }> {}

/** A canvas a newer plugin wrote, whose format this one must not write. */
export class NewerCanvasError extends Data.TaggedError('NewerCanvasError')<{ message: string }> {}

/** A canvas with no version history, whose edits could not be undone. */
export class UnversionedCanvasError extends Data.TaggedError('UnversionedCanvasError')<{
  message: string;
}> {}
