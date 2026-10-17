//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import type * as Capabilities from '@dxos/app-framework/Capabilities';
import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { Database, Filter, Ref } from '@dxos/echo';
import * as Canvas from '@dxos/plugin-canvas/Canvas';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as DrawingOperation from '@dxos/plugin-illustrator/DrawingOperation';
import * as IllustratorModel from '@dxos/plugin-illustrator/IllustratorModel';

import { STARTER_SOURCE, compileDrawing } from './drawing-io.ts';

/** Marks the one space this app keeps its drawings in, so a later visit finds it among the profile's spaces. */
export const SPACE_TAG = 'org.dxos.space.drawingApp';

const LAST_DRAWING_KEY = 'org.dxos.drawing-app.last-drawing';

/** A file or URL could not be loaded as a drawing. */
export class LoadError extends Error {
  readonly _tag = 'LoadError';
}

/** Creates the identity and the drawings space on first run, and returns that space. */
export const openSpace = Effect.fn('openSpace')(function* (client: Client) {
  yield* Effect.promise(() => client.waitUntilInitialized());
  if (!client.halo.identity.get()) {
    yield* Effect.promise(() => client.halo.createIdentity());
  }
  const existing = client.spaces.get().find((space) => space.tags.includes(SPACE_TAG));
  const space =
    existing ?? (yield* Effect.promise(() => client.spaces.create({ name: 'Drawings' }, { tags: [SPACE_TAG] })));
  yield* Effect.promise(() => space.waitUntilReady());
  return space;
});

/** Moves the drawing onto the Canvas variant, so its boxes can be dragged with their arrows bound. */
const ensureCanvas = Effect.fn('ensureCanvas')(function* (
  invoker: Capabilities.OperationInvoker,
  space: Space,
  drawing: Drawing.Drawing,
) {
  const canvas = yield* Effect.promise(() => drawing.canvas.load());
  if (canvas.schema !== Canvas.SCENE_SCHEMA) {
    yield* invoker.invoke(
      DrawingOperation.Convert,
      { drawing: Ref.make(drawing), variant: Canvas.SCENE_SCHEMA },
      { spaceId: space.id },
    );
  }
  remember(drawing);
  return drawing;
});

/** Imports a `.dx.svg` (Composer's export or a drawing.sh render) into the space and opens it on the Canvas. */
export const importDrawing: (
  invoker: Capabilities.OperationInvoker,
  space: Space,
  svg: string,
) => Effect.Effect<Drawing.Drawing, Error> = Effect.fn('importDrawing')(function* (
  invoker: Capabilities.OperationInvoker,
  space: Space,
  svg: string,
) {
  const drawing = yield* IllustratorModel.DrawingFile.importDxSvg(svg).pipe(
    Effect.provide(Database.layer(space.db)),
    Effect.mapError((error) => new LoadError(error.message)),
  );
  return yield* ensureCanvas(invoker, space, drawing);
});

/** Fetches a `.dx.svg` by URL; the host must allow this origin by CORS. */
export const fetchDrawing = Effect.fn('fetchDrawing')(function* (url: string) {
  const response = yield* Effect.tryPromise({
    try: () => fetch(url),
    catch: (error) => new LoadError(`Could not fetch ${url}: ${String(error)}`),
  });
  if (!response.ok) {
    return yield* Effect.fail(new LoadError(`Could not fetch ${url}: ${response.status} ${response.statusText}`));
  }
  return yield* Effect.tryPromise({
    try: () => response.text(),
    catch: (error) => new LoadError(`Could not read ${url}: ${String(error)}`),
  });
});

export type OpenDrawingOptions = {
  invoker: Capabilities.OperationInvoker;
  space: Space;
  src?: string;
};

/** The drawing to open: the `?src` file, else the one last open, else a starter compiled from the default DSL. */
export const openDrawing: (options: OpenDrawingOptions) => Effect.Effect<Drawing.Drawing, Error> = Effect.fn(
  'openDrawing',
)(function* ({ invoker, space, src }: OpenDrawingOptions) {
  if (src) {
    return yield* importDrawing(invoker, space, yield* fetchDrawing(src));
  }

  const drawings = yield* Effect.promise(() => space.db.query(Filter.type(Drawing.Drawing)).run());
  const lastId = recall();
  const previous = drawings.find(({ id }) => id === lastId) ?? drawings.at(-1);
  if (previous) {
    return yield* ensureCanvas(invoker, space, previous);
  }

  const { drawing, canvas } = yield* compileDrawing('Untitled', STARTER_SOURCE);
  space.db.add(canvas);
  space.db.add(drawing);
  yield* Effect.promise(() => space.db.flush());
  return yield* ensureCanvas(invoker, space, drawing);
});

// The last-open drawing is a per-browser convenience, so storage that is blocked or cleared just opens the newest one.
const remember = (drawing: Drawing.Drawing) => {
  try {
    localStorage.setItem(LAST_DRAWING_KEY, drawing.id);
  } catch {}
};

const recall = (): string | undefined => {
  try {
    return localStorage.getItem(LAST_DRAWING_KEY) ?? undefined;
  } catch {
    return undefined;
  }
};
