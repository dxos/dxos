//
// Copyright 2022 DXOS.org
//

import { PublicKey } from '@dxos/keys';
import { toDate, toPublicKey } from '@dxos/protocols/buf';
import { type Credential } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { type DelegateSpaceInvitation } from '@dxos/protocols/buf/dxos/halo/invitations_pb';
import { type AsyncCallback, Callback, ComplexMap, ComplexSet } from '@dxos/util';

import { getCredentialAssertion } from '../credentials';

export interface DelegateInvitationCredential {
  credentialId: PublicKey;
  invitation: DelegateSpaceInvitation;
}

/**
 * Tracks the feed tree for a space.
 * Provides a list of admitted feeds.
 */
export class InvitationStateMachine {
  private readonly _invitations = new ComplexMap<PublicKey, DelegateSpaceInvitation>(PublicKey.hash);
  private readonly _redeemedInvitationCredentialIds = new ComplexSet(PublicKey.hash);
  private readonly _cancelledInvitationCredentialIds = new ComplexSet(PublicKey.hash);

  readonly onDelegatedInvitation = new Callback<AsyncCallback<DelegateInvitationCredential>>();
  readonly onDelegatedInvitationRemoved = new Callback<AsyncCallback<DelegateInvitationCredential>>();

  get invitations(): ReadonlyMap<PublicKey, DelegateSpaceInvitation> {
    return this._invitations;
  }

  async process(credential: Credential): Promise<void> {
    const credentialId = toPublicKey(credential.id);
    if (credentialId == null) {
      return;
    }
    const assertion = getCredentialAssertion(credential);
    switch (assertion.$typeName) {
      case 'dxos.halo.invitations.CancelDelegatedInvitation': {
        const cancelled = toPublicKey(assertion.credentialId);
        if (cancelled == null) {
          break;
        }
        this._cancelledInvitationCredentialIds.add(cancelled);
        const existingInvitation = this._invitations.get(cancelled);
        if (existingInvitation != null) {
          this._invitations.delete(cancelled);
          await this.onDelegatedInvitationRemoved.callIfSet({
            credentialId: cancelled,
            invitation: existingInvitation,
          });
        }
        break;
      }
      case 'dxos.halo.invitations.DelegateSpaceInvitation': {
        const expiresOn = toDate(assertion.expiresOn);
        const isExpired = expiresOn != null && expiresOn.getTime() < Date.now();
        const wasUsed = this._redeemedInvitationCredentialIds.has(credentialId) && !assertion.multiUse;
        const wasCancelled = this._cancelledInvitationCredentialIds.has(credentialId);
        if (isExpired || wasCancelled || wasUsed) {
          return;
        }
        this._invitations.set(credentialId, assertion);
        await this.onDelegatedInvitation.callIfSet({
          credentialId,
          invitation: assertion,
        });
        break;
      }
      case 'dxos.halo.credentials.SpaceMember': {
        const redeemed = toPublicKey(assertion.invitationCredentialId);
        if (redeemed != null) {
          this._redeemedInvitationCredentialIds.add(redeemed);
          const existingInvitation = this._invitations.get(redeemed);
          if (existingInvitation != null && !existingInvitation.multiUse) {
            this._invitations.delete(redeemed);
            await this.onDelegatedInvitationRemoved.callIfSet({
              credentialId: redeemed,
              invitation: existingInvitation,
            });
          }
        }
        break;
      }
    }
  }
}
