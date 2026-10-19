//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { Database, Filter } from '@dxos/echo';
import { BaseError } from '@dxos/errors';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as IllustratorModel from '@dxos/plugin-illustrator/IllustratorModel';

import { STARTER_SOURCE, compileDrawing } from './drawing-io.ts';

/** Marks the one space this app keeps its drawings in, so a later visit finds it among the profile's spaces. */
export const SPACE_TAG = 'org.dxos.space.drawingApp';

const LAST_DRAWING_KEY = 'org.dxos.drawing-app.last-drawing';

/** A file or URL could not be loaded as a drawing. */
export class LoadError extends BaseError.extend('LoadError', 'The drawing could not be loaded') {}

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

/**
 * Imports a `.dx.svg` (Composer's export or a drawing.sh render) into the space as it was saved: a laid-out drawing
 * opens in the read view Composer shows, and the user picks an editor from there.
 */
export const importDrawing: (space: Space, svg: string) => Effect.Effect<Drawing.Drawing, Error> = Effect.fn(
  'importDrawing',
)(function* (space: Space, svg: string) {
  const drawing = yield* IllustratorModel.DrawingFile.importDxSvg(svg).pipe(
    Effect.provide(Database.layer(space.db)),
    Effect.mapError((error) => new LoadError({ message: error.message, cause: error })),
  );
  remember(drawing);
  return drawing;
});

/** Fetches a `.dx.svg` by URL; the host must allow this origin by CORS. */
export const fetchDrawing = Effect.fn('fetchDrawing')(function* (url: string) {
  const response = yield* Effect.tryPromise({
    try: () => fetch(url),
    catch: (error) => new LoadError({ message: `Could not fetch ${url}: ${String(error)}`, cause: error }),
  });
  if (!response.ok) {
    return yield* Effect.fail(
      new LoadError({ message: `Could not fetch ${url}: ${response.status} ${response.statusText}` }),
    );
  }
  return yield* Effect.tryPromise({
    try: () => response.text(),
    catch: (error) => new LoadError({ message: `Could not read ${url}: ${String(error)}`, cause: error }),
  });
});

export type OpenDrawingOptions = {
  space: Space;
  src?: string;
};

/** The drawing to open: the `?src` file, else the one last open, else a starter compiled from the default DSL. */
export const openDrawing: (options: OpenDrawingOptions) => Effect.Effect<Drawing.Drawing, Error> = Effect.fn(
  'openDrawing',
)(function* ({ space, src }: OpenDrawingOptions) {
  if (src) {
    return yield* importDrawing(space, yield* fetchDrawing(src));
  }

  const drawings = yield* Effect.promise(() => space.db.query(Filter.type(Drawing.Drawing)).run());
  const lastId = recall();
  const previous = drawings.find(({ id }) => id === lastId) ?? drawings.at(-1);
  if (previous) {
    remember(previous);
    return previous;
  }

  const { drawing, canvas } = yield* compileDrawing('Untitled', STARTER_SOURCE);
  space.db.add(canvas);
  space.db.add(drawing);
  yield* Effect.promise(() => space.db.flush());
  remember(drawing);
  return drawing;
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
