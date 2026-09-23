//
// Copyright 2026 DXOS.org
//

import * as EffectContext from 'effect/Context';

import { type Event } from '@dxos/async';
import { type AuthenticatingInvitation, type CancellableInvitation } from '@dxos/client-protocol';
import { type Context } from '@dxos/context';
import { type Invitation } from '@dxos/protocols/buf/dxos/client/invitation_pb';
import { type DeviceProfileDocument } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

import { type InvitationProtocol } from './invitation-protocol.ts';

//
// The invitations subsystem's contract. See `contracts/identity.ts` for why the tags live with the
// interfaces rather than with the implementations.
//

/**
 * Creates and tracks the in-flight invitations, as its consumers use it.
 */
export interface Manager {
  readonly invitationCreated: Event<Invitation>;
  readonly invitationAccepted: Event<Invitation>;
  readonly removedCreated: Event<Invitation>;
  readonly removedAccepted: Event<Invitation>;
  readonly saved: Event<Invitation>;
  getCreatedInvitations(): Invitation[];
  getAcceptedInvitations(): Invitation[];
  loadPersistentInvitations(ctx: Context): Promise<{ invitations: Invitation[] }>;
  onPersistentInvitationsLoaded(ctx: Context, callback: () => void): void;
  authenticate(request: { invitationId: string; authCode: string }): Promise<void>;
  setInvitationHandlerFactory(
    getHandler: (invitation: Partial<Invitation> & Pick<Invitation, 'kind'>) => InvitationProtocol,
  ): void;
  getInvitationHandler(invitation: Partial<Invitation> & Pick<Invitation, 'kind'>): InvitationProtocol;
  createInvitation(
    ctx: Context,
    options: Partial<Invitation> & Pick<Invitation, 'kind'>,
  ): Promise<CancellableInvitation>;
  cancelInvitation(request: { invitationId: string }): Promise<void>;
  acceptInvitation(
    ctx: Context,
    request: {
      invitation: Partial<Invitation> & Pick<Invitation, 'invitationId'>;
      deviceProfile?: DeviceProfileDocument;
    },
  ): AuthenticatingInvitation;
}

/** Effect service tag for {@link Manager}. */
export class ManagerService extends EffectContext.Service<ManagerService, Manager>()(
  '@dxos/client-services/InvitationsManager',
) {}
