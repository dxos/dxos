//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Option from 'effect/Option';

import * as Capability from '@dxos/app-framework/Capability';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as SpaceInvitationOperation from '@dxos/app-toolkit/SpaceInvitationOperation';
import { INITIALIZE_TIMEOUT } from '@dxos/client-protocol';
import * as Operation from '@dxos/compute/Operation';
import { Identity } from '@dxos/halo';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { HaloServicesLayer } from '@dxos/plugin-client';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import { meta } from '#meta';
import { SpaceOperation } from '#types';

import { JoinByKeyError, NoIdentityError } from '../errors.ts';

/** How long to wait for an online member to hand over the admission credential. */
const JOIN_BY_KEY_TIMEOUT = 60_000;

const joinBySpaceKey = Effect.fnUntraced(function* (spaceKeyHex: string) {
  const client = yield* Capability.get(ClientCapabilities.Client);
  // Deep links dispatch before `client.initialize()` resolves, and an uninitialized client reads as "no identity".
  yield* Effect.promise(() => client.waitUntilInitialized({ timeout: INITIALIZE_TIMEOUT }));
  if (Option.isNone(yield* Identity.getSnapshot.pipe(Effect.provide(HaloServicesLayer)))) {
    return yield* Effect.fail(new NoIdentityError());
  }

  const spaceKey = PublicKey.safeFrom(spaceKeyHex);
  if (!spaceKey) {
    return yield* Effect.fail(new JoinByKeyError({ context: { spaceKey: spaceKeyHex } }));
  }

  log('join by space key', { spaceKey });
  const existing = client.spaces.get().find((space) => space.key.equals(spaceKey));
  // Its own fiber so a join that lands after the timeout still opens the space.
  const join = yield* Effect.forkDetach(
    Effect.gen(function* () {
      const space = existing ?? (yield* Effect.tryPromise(() => client.spaces.joinBySpaceKey(spaceKey)));
      yield* Operation.invoke(SpaceOperation.Open, { space });
      // `Open` only readies the space's database; switching the workspace is what takes the user there.
      yield* Operation.invoke(LayoutOperation.SwitchWorkspace, { subject: GraphPath.getSpacePath(space.id) });
    }),
  );
  const joined = yield* Fiber.join(join).pipe(
    Effect.timeoutOption(JOIN_BY_KEY_TIMEOUT),
    Effect.catch((cause) => Effect.fail(new JoinByKeyError({ cause }))),
  );
  if (Option.isNone(joined)) {
    return yield* Effect.fail(new JoinByKeyError({ context: { timeout: JOIN_BY_KEY_TIMEOUT } }));
  }
});

const reportFailure = (error: unknown) =>
  JoinByKeyError.is(error)
    ? Effect.gen(function* () {
        log.warn('join by space key failed', { error });
        yield* Operation.invoke(LayoutOperation.AddToast, {
          id: `${meta.profile.key}/join-by-key-failed`,
          title: ['join-by-key-failed-toast.title', { ns: meta.profile.key }],
          description: ['join-by-key-failed-toast.description', { ns: meta.profile.key }],
          icon: 'ph--warning--regular',
        }).pipe(Effect.catch((toastError) => Effect.sync(() => log.warn('failed to add toast', { toastError }))));
      })
    : Effect.void;

const handler: Operation.WithHandler<typeof SpaceInvitationOperation.JoinBySpaceKey> =
  SpaceInvitationOperation.JoinBySpaceKey.pipe(
    Operation.withHandler(({ spaceKey }) => joinBySpaceKey(spaceKey).pipe(Effect.tapError(reportFailure))),
  );
export default handler;
