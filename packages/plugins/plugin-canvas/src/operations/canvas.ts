//
// Copyright 2026 DXOS.org
//

import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';

import { type ContentMap } from '@dxos/diagram';
import { Database, Obj, type Ref } from '@dxos/echo';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import { type ViewId } from '@dxos/scene';

import { Canvas } from '#types';

import { readViews, rootOf, seedContent } from '../model/content.ts';

/**
 * A legacy drawing's canvas, loaded, with its scenes read, the scene `scene` (the root by default) resolved, and
 * `edit` to change its content records.
 */
export const loadScene = Effect.fn(function* (ref: Ref.Ref<Drawing.Drawing>, scene?: ViewId) {
  const drawing = yield* Database.load(ref);
  const canvas = yield* Database.load(drawing.canvas);
  if (!Drawing.isCanvas(canvas) || !Canvas.isSceneSchema(canvas.schema)) {
    return yield* Effect.fail(new DrawingDialectError({ message: 'The drawing is not a scene canvas.' }));
  }
  const edit = (change: (content: ContentMap) => void) => Obj.update(canvas, (canvas) => change(canvas.content));
  const id = scene ?? rootOf(canvas.content) ?? seedContent({});
  return { canvas, id, scenes: readViews(canvas.content), edit };
});

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
