//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as LayerSpec from '@dxos/compute/LayerSpec';
import { failUndefined } from '@dxos/debug';
import { invariant } from '@dxos/invariant';
import { KeyringApiService } from '@dxos/keyring';
import { toPublicKey } from '@dxos/protocols/buf';
import { type Invitation, Invitation_Kind } from '@dxos/protocols/buf/dxos/client/invitation_pb';

import * as IdentityContract from '../../../contracts/identity.ts';
import { type InvitationProtocol } from '../../../contracts/invitation-protocol.ts';
import * as InvitationsContract from '../../../contracts/invitations.ts';
import * as SpacesContract from '../../../contracts/spaces.ts';
import { DeviceInvitationProtocol } from './device-invitation-protocol.ts';
import { SpaceInvitationProtocol } from './space-invitation-protocol.ts';

/**
 * Wires the per-kind invitation protocol factories into the invitations manager. Sits above the
 * data space manager because the space protocol needs it, while the manager itself is below.
 */
export const InvitationFactoriesLayer: Layer.Layer<
  never,
  never,
  | InvitationsContract.ManagerService
  | IdentityContract.ManagerService
  | IdentityContract.LifecycleService
  | KeyringApiService
  | SpacesContract.ManagerService
  | SpacesContract.SigningContextProviderService
> = Layer.effectDiscard(
  Effect.gen(function* () {
    const invitationsManager = yield* InvitationsContract.ManagerService;
    const identityManager = yield* IdentityContract.ManagerService;
    const identityLifecycle = yield* IdentityContract.LifecycleService;
    const keyring = yield* KeyringApiService;
    const dataSpaceManager = yield* SpacesContract.ManagerService;
    const signingContextProvider = yield* SpacesContract.SigningContextProviderService;

    const factories = new Map<Invitation_Kind, (invitation: Partial<Invitation>) => InvitationProtocol>([
      [
        Invitation_Kind.DEVICE,
        () =>
          new DeviceInvitationProtocol(
            keyring,
            () => identityManager.identity ?? failUndefined(),
            (params) => identityLifecycle.acceptIdentity(params),
          ),
      ],
      [
        Invitation_Kind.SPACE,
        (invitation) =>
          new SpaceInvitationProtocol(
            dataSpaceManager,
            signingContextProvider(),
            keyring,
            toPublicKey(invitation.spaceKey),
          ),
      ],
    ]);

    invitationsManager.setInvitationHandlerFactory((invitation) => {
      if (identityManager.identity == null && invitation.kind === Invitation_Kind.SPACE) {
        throw new Error('Identity must be created before joining a space.');
      }
      const factory = factories.get(invitation.kind);
      invariant(factory, `Unknown invitation kind: ${invitation.kind}`);
      return factory(invitation);
    });
  }),
);

/** Eager: it provides no tag, it registers the invitation factories. */
export const InvitationFactoriesSpec = LayerSpec.make(
  {
    affinity: 'application',
    requires: [
      InvitationsContract.ManagerService,
      IdentityContract.ManagerService,
      IdentityContract.LifecycleService,
      KeyringApiService,
      SpacesContract.ManagerService,
      SpacesContract.SigningContextProviderService,
    ],
    provides: [],
    eager: true,
  },
  () => InvitationFactoriesLayer,
);
