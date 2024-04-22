//
// Copyright 2024 DXOS.org
//

import { Event } from '@dxos/async';
import type { AuthenticatingInvitation, CancellableInvitation } from '@dxos/client-protocol';
import { type Context } from '@dxos/context';
import { hasInvitationExpired, type MetadataStore } from '@dxos/echo-pipeline';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import {
  type AcceptInvitationRequest,
  type Invitation,
  type AuthenticationRequest,
} from '@dxos/protocols/proto/dxos/client/services';

import type { InvitationProtocol } from './invitation-protocol';
import type { InvitationsHandler } from './invitations-handler';

/**
 * Entry point for creating and accepting invitations, keeps track of existing invitation set and
 * emits events when the set changes.
 */
export class InvitationsManager {
  private readonly _createInvitations = new Map<string, CancellableInvitation>();
  private readonly _acceptInvitations = new Map<string, AuthenticatingInvitation>();

  public readonly invitationCreated = new Event<Invitation>();
  public readonly invitationAccepted = new Event<Invitation>();
  public readonly removedCreated = new Event<Invitation>();
  public readonly removedAccepted = new Event<Invitation>();
  public readonly saved = new Event<Invitation>();

  private readonly _persistentInvitationsLoadedEvent = new Event();
  private _persistentInvitationsLoaded = false;

  constructor(
    private readonly _invitationsHandler: InvitationsHandler,
    private readonly _getHandler: (invitation: Partial<Invitation> & Pick<Invitation, 'kind'>) => InvitationProtocol,
    private readonly _metadataStore: MetadataStore,
  ) {}

  createInvitation(options: Partial<Invitation> & Pick<Invitation, 'invitationId' | 'kind'>): CancellableInvitation {
    const existingInvitation = this._createInvitations.get(options.invitationId);
    if (existingInvitation) {
      return existingInvitation;
    }

    const handler = this._getHandler(options);
    const invitation = this._invitationsHandler.createInvitation(handler, options);
    this._createInvitations.set(invitation.get().invitationId, invitation);
    this.invitationCreated.emit(invitation.get());

    const saveInvitationTask = invitation.get().persistent
      ? this._safePersistInBackground(invitation)
      : Promise.resolve();

    // onComplete is called on cancel, expiration, or redemption of a single-use invitation
    this._onInvitationComplete(invitation, async () => {
      this._createInvitations.delete(invitation.get().invitationId);
      this.removedCreated.emit(invitation.get());
      if (invitation.get().persistent) {
        await saveInvitationTask;
        await this._safeDeleteInvitation(invitation.get());
      }
    });

    return invitation;
  }

  async loadPersistentInvitations(): Promise<{ invitations: Invitation[] }> {
    if (this._persistentInvitationsLoaded) {
      const invitations = this.getCreatedInvitations().filter((i) => i.persistent);
      return { invitations };
    }
    try {
      const persistentInvitations = this._metadataStore.getInvitations();
      // get saved persistent invitations, filter and remove from storage those that have expired.
      const freshInvitations = persistentInvitations.filter((invitation) => !hasInvitationExpired(invitation));

      const cInvitations = freshInvitations.map((persistentInvitation) => {
        invariant(!this._createInvitations.get(persistentInvitation.invitationId), 'invitation already exists');
        return this.createInvitation({ ...persistentInvitation, persistent: false }).get();
      });

      return { invitations: cInvitations };
    } catch (err) {
      log.catch(err);
      return { invitations: [] };
    } finally {
      this._persistentInvitationsLoadedEvent.emit();
      this._persistentInvitationsLoaded = true;
    }
  }

  acceptInvitation(request: AcceptInvitationRequest): AuthenticatingInvitation {
    const options = request.invitation;
    const existingInvitation = this._acceptInvitations.get(options.invitationId);
    if (existingInvitation) {
      return existingInvitation;
    }

    const handler = this._getHandler(options);
    const invitation = this._invitationsHandler.acceptInvitation(handler, options, request.deviceProfile);
    this._acceptInvitations.set(invitation.get().invitationId, invitation);
    this.invitationAccepted.emit(invitation.get());

    this._onInvitationComplete(invitation, () => {
      this._acceptInvitations.delete(invitation.get().invitationId);
      this.removedAccepted.emit(invitation.get());
    });

    return invitation;
  }

  async authenticate({ invitationId, authCode }: AuthenticationRequest): Promise<void> {
    log('authenticating...');
    invariant(invitationId);
    const observable = this._acceptInvitations.get(invitationId);
    if (!observable) {
      log.warn('invalid invitation', { invitationId });
    } else {
      await observable.authenticate(authCode);
    }
  }

  async cancelInvitation({ invitationId }: { invitationId: string }): Promise<void> {
    log('cancelInvitation...', { invitationId });
    invariant(invitationId);
    const created = this._createInvitations.get(invitationId);
    if (created) {
      // remove from storage before modifying in-memory state, higher chance of failing
      if (created.get().persistent) {
        await this._metadataStore.removeInvitation(invitationId);
      }
      await created.cancel();
      this._createInvitations.delete(invitationId);
      this.removedCreated.emit(created.get());
      return;
    }

    const accepted = this._acceptInvitations.get(invitationId);
    if (accepted) {
      await accepted.cancel();
      this._acceptInvitations.delete(invitationId);
      this.removedAccepted.emit(accepted.get());
    }
  }

  getCreatedInvitations(): Invitation[] {
    return [...this._createInvitations.values()].map((i) => i.get());
  }

  getAcceptedInvitations(): Invitation[] {
    return [...this._acceptInvitations.values()].map((i) => i.get());
  }

  onPersistentInvitationsLoaded(ctx: Context, callback: () => void) {
    if (this._persistentInvitationsLoaded) {
      callback();
    } else {
      this._persistentInvitationsLoadedEvent.once(ctx, () => callback());
    }
  }

  private _safePersistInBackground(invitation: CancellableInvitation): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(async () => {
        try {
          await this._metadataStore.addInvitation(invitation.get());
          this.saved.emit(invitation.get());
        } catch (err: any) {
          log.catch(err);
          await invitation.cancel();
        } finally {
          resolve();
        }
      });
    });
  }

  private async _safeDeleteInvitation(invitation: Invitation): Promise<void> {
    try {
      await this._metadataStore.removeInvitation(invitation.invitationId);
    } catch (err) {
      log.catch(err);
    }
  }

  private _onInvitationComplete(invitation: CancellableInvitation, callback: () => void) {
    invitation.subscribe(
      () => {},
      () => {},
      callback,
    );
  }
}
