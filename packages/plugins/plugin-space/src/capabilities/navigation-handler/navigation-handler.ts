//
// Copyright 2025 DXOS.org
//

import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { INITIALIZE_TIMEOUT } from '@dxos/client-protocol';
import * as Operation from '@dxos/compute/Operation';
import { Identity } from '@dxos/halo';
import { log } from '@dxos/log';
import { HaloServicesLayer } from '@dxos/plugin-client';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import { meta } from '#meta';
import { SpaceOperation } from '#types';

import { JOIN_BY_KEY_TIMEOUT, readJoinSpaceKey } from './join-space-key.ts';

/** Distinguishes a join-by-key failure so the catch handler can show its own toast copy. */
class JoinByKeyError extends Data.TaggedError('JoinByKeyError')<{ cause: unknown }> {}

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

    const handler: AppCapabilities.NavigationHandler = (url: URL) =>
      Effect.gen(function* () {
        const joinSpaceKey = readJoinSpaceKey(url, joinSpaceKeyProp);
        if (joinSpaceKey) {
          // `getSnapshot` reports `none` both for "no identity" and for "client not initialized", and
          // navigation handlers now dispatch before `client.initialize()` resolves — so the snapshot
          // must not be read until initialization lands or every deep-linked join-by-key URL reads as
          // a definite "no identity".
          yield* Effect.promise(() => client.waitUntilInitialized({ timeout: INITIALIZE_TIMEOUT }));

          // Ignore keys that arrive before a local identity exists rather than forcing identity
          // creation here, bypassing the normal onboarding flow.
          if (Option.isNone(yield* Identity.getSnapshot.pipe(Effect.provide(HaloServicesLayer)))) {
            return;
          }

          log('space join-by-key received via navigation');
          removeQueryParam(joinSpaceKeyProp);
          const existing = client.spaces.get().find((space) => space.key.equals(joinSpaceKey));
          const space =
            existing ??
            (yield* Effect.tryPromise(() => client.spaces.joinBySpaceKey(joinSpaceKey)).pipe(
              Effect.timeout(JOIN_BY_KEY_TIMEOUT),
              Effect.catch((error) => Effect.fail(new JoinByKeyError({ cause: error }))),
            ));
          yield* Operation.invoke(SpaceOperation.Open, { space });
          return;
        }

        const invitationCode = invitationUrlHandler ? url.searchParams.get(invitationProp) : null;
        if (!invitationCode) {
          return;
        }

        // `getSnapshot` reports `none` both for "no identity" and for "client not initialized", and
        // navigation handlers now dispatch before `client.initialize()` resolves — so the snapshot
        // must not be read until initialization lands or every deep-linked invitation reads as a
        // definite "no identity". Blocking is confined to URLs that actually carry an invitation,
        // and such a URL cannot be acted on before the client exists anyway.
        yield* Effect.promise(() => client.waitUntilInitialized({ timeout: INITIALIZE_TIMEOUT }));

        // Ignore invitations that arrive before a local identity exists rather than forcing
        // identity creation here, bypassing the normal onboarding flow.
        if (Option.isNone(yield* Identity.getSnapshot.pipe(Effect.provide(HaloServicesLayer)))) {
          return;
        }

        log('space invitation received via navigation');
        removeQueryParam(invitationProp);
        yield* Operation.invoke(SpaceOperation.Join, { invitationCode });
      }).pipe(
        Effect.catch((error) =>
          Effect.gen(function* () {
            log.warn('navigation handler failed', { error });
            const isJoinByKeyFailure = error instanceof JoinByKeyError;
            const toastKeyPrefix = isJoinByKeyFailure ? 'join-by-key-failed-toast' : 'navigation-failed-toast';
            yield* Operation.invoke(LayoutOperation.AddToast, {
              id: `${meta.profile.key}/navigation-failed`,
              title: [`${toastKeyPrefix}.title`, { ns: meta.profile.key }],
              description: [`${toastKeyPrefix}.description`, { ns: meta.profile.key }],
              icon: 'ph--warning--regular',
            }).pipe(Effect.catch((toastError) => Effect.sync(() => log.warn('failed to add toast', { toastError }))));
          }),
        ),
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
