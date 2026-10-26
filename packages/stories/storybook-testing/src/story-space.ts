//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { invariant } from '@dxos/invariant';

/**
 * The space a story seeds and shows: the profile's designated default space, else its first visible one.
 * `SpacesAvailable` fires once spaces are observable, before they open, so the settings space is awaited for its
 * default-space designation to be readable; falling back to an arbitrary first space picked the settings space itself.
 */
export const resolveStorySpace = (client: Client): Effect.Effect<Space> =>
  Effect.gen(function* () {
    const settingsSpace = AppSpace.getSettingsSpace(client);
    if (settingsSpace) {
      yield* Effect.promise(() => settingsSpace.waitUntilReady());
    }
    const space = AppSpace.getDefaultSpace(client) ?? client.spaces.get().find(AppSpace.isVisibleSpace);
    invariant(space, 'No space available after initialization.');
    yield* Effect.promise(() => space.waitUntilReady());
    return space;
  });
