//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Option from 'effect/Option';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { INITIALIZE_TIMEOUT } from '@dxos/client-protocol';
import * as Operation from '@dxos/compute/Operation';
import { Identity } from '@dxos/halo';
import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { HaloServicesLayer } from '@dxos/plugin-client';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import { meta } from '#meta';
import { SpaceOperation } from '#types';

import { JoinByKeyError } from '../../errors.ts';
import { JOIN_BY_KEY_TIMEOUT, readJoinSpaceKey } from './join-space-key.ts';

export type NavigationHandlerOptions = {
  invitationProp?: string;
  /** Set false when another plugin (e.g. plugin-onboarding) owns the invitation URL param. */
  invitationUrlHandler?: boolean;
  joinSpaceKeyProp?: string;
};

/**
 * NavigationHandler for space invitation URL params.
 * Handles ?spaceInvitationCode=X → join space via invitation.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* ({
    invitationProp = 'spaceInvitationCode',
    invitationUrlHandler = true,
    joinSpaceKeyProp = 'spaceKey',
  }: NavigationHandlerOptions = {}) {
    const capabilities = yield* Capability.Service;
    const operationService = yield* Capabilities.OperationInvoker;
    const client = yield* ClientCapabilities.Client;

    // `getSnapshot` reports `none` both for "no identity" and for "client not initialized", and
    // navigation handlers now dispatch before `client.initialize()` resolves — so the snapshot must
    // not be read until initialization lands or every deep-linked URL reads as a definite "no
    // identity". Shared by both branches below, each of which ignores its URL param rather than
    // forcing identity creation here and bypassing the normal onboarding flow.
    const hasLocalIdentity = Effect.gen(function* () {
      yield* Effect.promise(() => client.waitUntilInitialized({ timeout: INITIALIZE_TIMEOUT }));
      return Option.isSome(yield* Identity.getSnapshot.pipe(Effect.provide(HaloServicesLayer)));
    });

    const reportFailure = (error: unknown) =>
      Effect.gen(function* () {
        log.warn('navigation handler failed', { error });
        const toastKeyPrefix = JoinByKeyError.is(error) ? 'join-by-key-failed-toast' : 'navigation-failed-toast';
        yield* Operation.invoke(LayoutOperation.AddToast, {
          id: `${meta.profile.key}/navigation-failed`,
          title: [`${toastKeyPrefix}.title`, { ns: meta.profile.key }],
          description: [`${toastKeyPrefix}.description`, { ns: meta.profile.key }],
          icon: 'ph--warning--regular',
        }).pipe(Effect.catch((toastError) => Effect.sync(() => log.warn('failed to add toast', { toastError }))));
      });

    const joinByKey = (spaceKey: PublicKey) =>
      Effect.gen(function* () {
        if (!(yield* hasLocalIdentity)) {
          return;
        }

        log('space join-by-key received via navigation');
        const existing = client.spaces.get().find((space) => space.key.equals(spaceKey));
        // Its own fiber so a join that lands after the timeout still opens the space; the param stays
        // until then so a reload can retry.
        const join = yield* Effect.forkDetach(
          (existing ? Effect.succeed(existing) : Effect.tryPromise(() => client.spaces.joinBySpaceKey(spaceKey))).pipe(
            Effect.tap(() => Effect.sync(() => removeQueryParam(joinSpaceKeyProp))),
            Effect.tap((space) => Operation.invoke(SpaceOperation.Open, { space })),
            // `Open` only readies the space's database; switching the workspace is what takes the user there.
            Effect.flatMap((space) =>
              Operation.invoke(LayoutOperation.SwitchWorkspace, { subject: GraphPath.getSpacePath(space.id) }),
            ),
          ),
        );
        const joined = yield* Fiber.join(join).pipe(
          Effect.timeoutOption(JOIN_BY_KEY_TIMEOUT),
          Effect.catch((cause) => Effect.fail(new JoinByKeyError({ cause }))),
        );
        if (Option.isNone(joined)) {
          return yield* Effect.fail(new JoinByKeyError({ context: { timeout: JOIN_BY_KEY_TIMEOUT } }));
        }
      }).pipe(Effect.catch(reportFailure));

    const handler: AppCapabilities.NavigationHandler = (url: URL) =>
      Effect.gen(function* () {
        const joinSpaceKey = readJoinSpaceKey(url, joinSpaceKeyProp);
        if (joinSpaceKey) {
          // Detached because URL projection waits on every handler, and a join waits on a member coming online.
          yield* Effect.forkDetach(joinByKey(joinSpaceKey));
          return;
        }

        const invitationCode = invitationUrlHandler ? url.searchParams.get(invitationProp) : null;
        if (!invitationCode) {
          return;
        }

        if (!(yield* hasLocalIdentity)) {
          return;
        }

        log('space invitation received via navigation');
        removeQueryParam(invitationProp);
        yield* Operation.invoke(SpaceOperation.Join, { invitationCode });
      }).pipe(
        Effect.catch(reportFailure),
        Effect.provideService(Capability.Service, capabilities),
        Effect.provideService(Operation.Service, operationService),
      );

    return Capability.contribute(AppCapabilities.NavigationHandler, handler);
  }),
);

/** Remove a query param from the current browser URL. */
const removeQueryParam = (key: string) => {
  const current = new URL(window.location.href);
  current.searchParams.delete(key);
  history.replaceState(null, '', current.pathname + current.search);
};
