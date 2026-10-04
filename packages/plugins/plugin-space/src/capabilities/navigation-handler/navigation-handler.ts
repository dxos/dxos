//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as SpaceInvitationOperation from '@dxos/app-toolkit/SpaceInvitationOperation';
import { INITIALIZE_TIMEOUT } from '@dxos/client-protocol';
import * as Operation from '@dxos/compute/Operation';
import { Identity } from '@dxos/halo';
import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { HaloServicesLayer } from '@dxos/plugin-client';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import { meta } from '#meta';
import { SpaceOperation } from '#types';

import { JoinByKeyError, NoIdentityError } from '../../errors.ts';
import { readJoinSpaceKey } from './join-space-key.ts';

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
    // identity". Without one the invitation param is ignored rather than forcing identity creation
    // here and bypassing the normal onboarding flow.
    const hasLocalIdentity = Effect.gen(function* () {
      yield* Effect.promise(() => client.waitUntilInitialized({ timeout: INITIALIZE_TIMEOUT }));
      return Option.isSome(yield* Identity.getSnapshot.pipe(Effect.provide(HaloServicesLayer)));
    });

    const reportFailure = (error: unknown) =>
      Effect.gen(function* () {
        log.warn('navigation handler failed', { error });
        yield* Operation.invoke(LayoutOperation.AddToast, {
          id: `${meta.profile.key}/navigation-failed`,
          title: ['navigation-failed-toast.title', { ns: meta.profile.key }],
          description: ['navigation-failed-toast.description', { ns: meta.profile.key }],
          icon: 'ph--warning--regular',
        }).pipe(Effect.catch((toastError) => Effect.sync(() => log.warn('failed to add toast', { toastError }))));
      });

    // The operation reports its own join failures; a missing identity leaves the param for onboarding.
    const joinByKey = (spaceKey: PublicKey) =>
      Operation.invoke(SpaceInvitationOperation.JoinBySpaceKey, { spaceKey: spaceKey.toHex() }).pipe(
        Effect.tap(() => Effect.sync(() => removeQueryParam(joinSpaceKeyProp))),
        Effect.catch((error) =>
          NoIdentityError.is(error) || JoinByKeyError.is(error)
            ? Effect.sync(() => log('join by space key not completed', { error }))
            : reportFailure(error),
        ),
      );

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
