//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';

import { type MulticastObservable } from '@dxos/async';
import { type Client } from '@dxos/client';
import { type CancellableInvitationObservable } from '@dxos/client/invitations';
import { Invitation as HaloInvitation } from '@dxos/halo';

import { makeFlow, streamFromObservable } from './util';

const scopeKind = (scope: HaloInvitation.Scope): HaloInvitation.Kind => ('spaceId' in scope ? 'space' : 'device');

const invitationsObservable = (
  client: Client,
  scope: HaloInvitation.Scope,
): MulticastObservable<CancellableInvitationObservable[]> | undefined => {
  if ('spaceId' in scope) {
    return client.spaces.get(scope.spaceId)?.invitations;
  }
  return client.halo.invitations;
};

/**
 * Builds the {@link HaloInvitation.Service} implementation over the client's invitation
 * observables. Initiation lives on {@link HaloIdentity}/{@link HaloSpace}; this service only
 * observes the active-flow set.
 */
export const makeInvitationService = (client: Client): Context.Tag.Service<HaloInvitation.Service> => ({
  active: (scope) =>
    Effect.sync(() => {
      const kind = scopeKind(scope);
      return (invitationsObservable(client, scope)?.get() ?? []).map((invitation) => makeFlow(invitation, kind));
    }),

  activeChanges: (scope) => {
    const observable = invitationsObservable(client, scope);
    if (!observable) {
      return Stream.succeed<readonly HaloInvitation.Flow[]>([]);
    }
    const kind = scopeKind(scope);
    return streamFromObservable(observable).pipe(
      Stream.map((invitations) => invitations.map((invitation) => makeFlow(invitation, kind))),
    );
  },
});

/**
 * Layer providing {@link HaloInvitation.Service} backed by the given client.
 */
export const layerInvitation = (client: Client): Layer.Layer<HaloInvitation.Service> =>
  Layer.succeed(HaloInvitation.Service, makeInvitationService(client));
