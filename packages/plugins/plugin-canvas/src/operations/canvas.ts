//
// Copyright 2026 DXOS.org
//

import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';

import { Database, type Ref } from '@dxos/echo';
import type * as Drawing from '@dxos/plugin-illustrator/Drawing';
import { type SceneId } from '@dxos/react-ui-canvas/headless';

import { readScenes, rootOf, seedContent } from '../model/content.ts';

/** A drawing's canvas, loaded, with its scenes read and the scene `scene` (the root by default) resolved. */
export const loadScene = Effect.fn(function* (ref: Ref.Ref<Drawing.Drawing>, scene?: SceneId) {
  const drawing = yield* Database.load(ref);
  const canvas = yield* Database.load(drawing.canvas);
  const id = scene ?? rootOf(canvas.content) ?? seedContent({});
  return { canvas, id, scenes: readScenes(canvas.content) };
});

/** The drawing has no scene or node of the id an operation named. */
export class CanvasElementNotFoundError extends Data.TaggedError('CanvasElementNotFoundError')<{ message: string }> {}
