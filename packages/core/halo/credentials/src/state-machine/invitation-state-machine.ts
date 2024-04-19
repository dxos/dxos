//
// Copyright 2022 DXOS.org
//

import { PublicKey } from '@dxos/keys';
import { type Credential } from '@dxos/protocols/proto/dxos/halo/credentials';
import { type DelegateSpaceInvitation } from '@dxos/protocols/proto/dxos/halo/invitations';
import { type AsyncCallback, Callback, ComplexMap, ComplexSet } from '@dxos/util';

import { getCredentialAssertion } from '../credentials';

/**
 * Tracks the feed tree for a space.
 * Provides a list of admitted feeds.
 */
export class InvitationStateMachine {
  private readonly _invitations = new ComplexMap<PublicKey, DelegateSpaceInvitation>(PublicKey.hash);
  private readonly _redeemedInvitationCredentialIds = new ComplexSet(PublicKey.hash);
  private readonly _cancelledInvitationCredentialIds = new ComplexSet(PublicKey.hash);

  readonly onOutstandingInvitation = new Callback<AsyncCallback<DelegateSpaceInvitation>>();
  readonly onOutstandingInvitationRemoved = new Callback<AsyncCallback<DelegateSpaceInvitation>>();

  constructor(private readonly _spaceKey: PublicKey) {}

  get invitations(): ReadonlyMap<PublicKey, DelegateSpaceInvitation> {
    return this._invitations;
  }

  async process(credential: Credential): Promise<void> {
    const credentialId = credential.id;
    if (credentialId == null) {
      return;
    }
    const assertion = getCredentialAssertion(credential);
    switch (assertion['@type']) {
      case 'dxos.halo.invitations.CancelDelegatedInvitation': {
        this._cancelledInvitationCredentialIds.add(assertion.credentialId);
        const existingInvitation = this._invitations.get(assertion.credentialId);
        if (existingInvitation != null) {
          this._invitations.delete(assertion.credentialId);
          await this.onOutstandingInvitationRemoved.callIfSet(existingInvitation);
        }
        break;
      }
      case 'dxos.halo.invitations.DelegateSpaceInvitation': {
        if (credential.id) {
          const wasUsed = this._redeemedInvitationCredentialIds.has(credential.id) && !assertion.multiUse;
          const wasCancelled = this._cancelledInvitationCredentialIds.has(credential.id);
          if (wasCancelled || wasUsed) {
            return;
          }
          const invitation: DelegateSpaceInvitation = { ...assertion };
          this._invitations.set(credential.id, invitation);
          await this.onOutstandingInvitation.callIfSet(invitation);
        }
        break;
      }
      case 'dxos.halo.credentials.SpaceMember': {
        if (assertion.invitationCredentialId != null) {
          this._redeemedInvitationCredentialIds.add(assertion.invitationCredentialId);
          const existingInvitation = this._invitations.get(assertion.invitationCredentialId);
          if (existingInvitation != null && !existingInvitation.multiUse) {
            this._invitations.delete(assertion.invitationCredentialId);
            await this.onOutstandingInvitationRemoved.callIfSet(existingInvitation);
          }
        }
        break;
      }
    }
  }
}
