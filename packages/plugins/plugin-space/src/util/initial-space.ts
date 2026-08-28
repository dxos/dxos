//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import { type Client } from '@dxos/client';
import { type Space, SpaceState } from '@dxos/client/echo';
import { Obj } from '@dxos/echo';

/**
 * How long the designated default space is waited for before any space the user can see will do.
 *
 * It lands late on a login: the settings space carrying the designation replicates and opens on its
 * own schedule, after the spaces it designates. Waiting for it unboundedly is what leaves a profile
 * whose designation never arrives sitting on an empty deck.
 */
const DESIGNATED_SPACE_TIMEOUT = '5 seconds';

/**
 * The space to land on when the app boots with no workspace of its own — a freshly created identity,
 * or a login on a device with no deck state to restore.
 *
 * The designated default is preferred; failing that, any space the user can see beats none, and the
 * first is the one the navtree lists first.
 */
export const resolveInitialSpace = Effect.fnUntraced(function* (client: Client) {
  const designated = yield* awaitSpace(client, getDesignatedSpace).pipe(Effect.timeoutOption(DESIGNATED_SPACE_TIMEOUT));
  return Option.isSome(designated) ? designated.value : yield* awaitSpace(client, getFirstVisibleSpace);
});

/** The designated default space, once it is open enough to have a workspace to navigate to. */
const getDesignatedSpace = (client: Client): Space | undefined => {
  const space = AppSpace.getDefaultSpace(client);
  return space?.state.get() === SpaceState.SPACE_READY ? space : undefined;
};

/** The first space the navtree lists — where the user would have gone by hand. */
const getFirstVisibleSpace = (client: Client): Space | undefined =>
  client.spaces.get().find((space) => space.state.get() === SpaceState.SPACE_READY && AppSpace.isVisibleSpace(space));

/**
 * The first space `select` accepts, waiting for one to arrive.
 *
 * Subscribed before the first check, since a space landing between a miss and the subscription is
 * never signalled again. The space list re-emits on every space's state change as well as its own,
 * so it covers every input `select` reads except the default-space designation, which is a property
 * write on the settings space.
 *
 * Every settings-tagged space is watched, not just the canonical one: while duplicates are
 * converging, which of them `getSettingsSpace` prefers is decided by which already holds the
 * designation — the very thing being waited for.
 */
const awaitSpace = (client: Client, select: (client: Client) => Space | undefined): Effect.Effect<Space> =>
  Effect.callback<Space>((resume) => {
    const propertySubscriptions = new Map<string, () => void>();
    let settled = false;

    const check = () => {
      if (settled) {
        return;
      }
      const space = select(client);
      if (space) {
        settled = true;
        resume(Effect.succeed(space));
      }
    };

    // `subscribe` replays, so this performs the first check as well as watching for later ones.
    const spacesSub = client.spaces.subscribe((spaces) => {
      const settingsSpaces = spaces.filter(
        (space) => AppSpace.isSettingsSpace(space) && space.state.get() === SpaceState.SPACE_READY,
      );
      // Duplicate healing tombstones the spaces it merges away, so a subscription is dropped as its
      // space leaves the list rather than being held against a destroyed proxy until resolution.
      for (const [id, unsubscribe] of propertySubscriptions) {
        if (!settingsSpaces.some((space) => space.id === id)) {
          unsubscribe();
          propertySubscriptions.delete(id);
        }
      }
      for (const space of settingsSpaces) {
        if (!propertySubscriptions.has(space.id)) {
          propertySubscriptions.set(space.id, Obj.subscribe(space.properties, check));
        }
      }

      check();
    });

    return Effect.sync(() => {
      spacesSub.unsubscribe();
      propertySubscriptions.forEach((unsubscribe) => unsubscribe());
      propertySubscriptions.clear();
    });
  });
