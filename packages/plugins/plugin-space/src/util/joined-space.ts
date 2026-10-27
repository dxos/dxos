//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type Space } from '@dxos/client/echo';

/**
 * Resolves once this client has joined the space: one listed from a share link's cache before the join (provisional)
 * is joined when its services list it, which brings its members.
 */
export const waitUntilJoined = (space: Space): Effect.Effect<void> =>
  Effect.callback<void>((resume) => {
    if (!space.internal.provisional) {
      resume(Effect.void);
      return;
    }
    const check = () => {
      if (!space.internal.provisional) {
        resume(Effect.void);
      }
    };
    const subscriptions = [space.state.subscribe(check), space.members.subscribe(check)];
    return Effect.sync(() => subscriptions.forEach((subscription) => subscription.unsubscribe()));
  });
