//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import { Space } from '@dxos/halo';

// #region create
/** Creates a space called `name`, and waits until it opens. */
export const createSpace = (name: string) =>
  Effect.gen(function* () {
    const space = yield* Space.create({ name });
    yield* Space.waitReady(space.id);
    return space;
  });
// #endregion

// #region list
/** The named spaces that are open, by name, now and after each change. */
export const spaces = Space.spaces.pipe(
  Stream.map((spaces) =>
    spaces
      .filter((space) => space.state === 'ready' && space.name)
      .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')),
  ),
);
// #endregion
