//
// Copyright 2026 DXOS.org
//

import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';

import { Database, type Ref } from '@dxos/echo';
import type * as Drawing from '@dxos/plugin-illustrator/Drawing';

import { Canvas } from '#types';

import { loadCanvas } from '../model/canvas-document.ts';

/** The `Canvas` an operation was given, with what it reaches loaded, or a failure naming what it was instead. */
export const canvasOf = Effect.fn(function* (ref: Ref.Ref<unknown>) {
  const canvas = yield* Database.load(ref);
  if (!Canvas.isCanvas(canvas)) {
    return yield* Effect.fail(new DrawingDialectError({ message: `Object ${ref.uri} is not a scene canvas.` }));
  }
  yield* loadCanvas(canvas);
  return canvas;
});

/** The `Canvas` a drawing draws on. */
export const drawingCanvasOf = Effect.fn(function* (drawing: Drawing.Drawing) {
  return yield* canvasOf(drawing.canvas);
});

/** The drawing has no scene or node of the id an operation named. */
export class CanvasElementNotFoundError extends Data.TaggedError('CanvasElementNotFoundError')<{ message: string }> {}

/** The drawing an operation was given is not of the dialect it reads. */
export class DrawingDialectError extends Data.TaggedError('DrawingDialectError')<{ message: string }> {}

/** An intent sent to the canvas that is not one the projection understands. */
export class InvalidIntentError extends Data.TaggedError('InvalidIntentError')<{ message: string }> {}

/** A canvas with no version history, whose edits could not be undone. */
export class UnversionedCanvasError extends Data.TaggedError('UnversionedCanvasError')<{
  message: string;
}> {}
