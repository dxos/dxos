//
// Copyright 2022 DXOS.org
//

import { PublicKey } from '@dxos/keys';
import { toPublicKey, timestampMs } from '@dxos/protocols/buf';
import { type Credential } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { type DelegateSpaceInvitation } from '@dxos/protocols/buf/dxos/halo/invitations_pb';
import { type AsyncCallback, Callback, ComplexMap, ComplexSet } from '@dxos/util';

import { fromBufPublicKey, getCredentialAssertion } from '../credentials';

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
    const credentialId = fromBufPublicKey(credential.id);
    if (credentialId == null) {
      return;
    }
    const assertion = getCredentialAssertion(credential);
    switch (assertion.$typeName) {
      case 'dxos.halo.invitations.CancelDelegatedInvitation': {
        const cancelCredId = assertion.credentialId ? toPublicKey(assertion.credentialId) : undefined;
        if (cancelCredId) {
          this._cancelledInvitationCredentialIds.add(cancelCredId);
          const existingInvitation = this._invitations.get(cancelCredId);
          if (existingInvitation != null) {
            this._invitations.delete(cancelCredId);
            await this.onDelegatedInvitationRemoved.callIfSet({
              credentialId: cancelCredId,
              invitation: existingInvitation,
            });
          }
        }
        break;
      }
      case 'dxos.halo.invitations.DelegateSpaceInvitation': {
        if (credentialId) {
          // expiresOn is Date from proto codec or buf Timestamp — handle both.
          const expiresOnMs = assertion.expiresOn
            ? assertion.expiresOn instanceof Date
              ? assertion.expiresOn.getTime()
              : Number(timestampMs(assertion.expiresOn))
            : undefined;
          const isExpired = expiresOnMs != null && expiresOnMs < Date.now();
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
        }
        break;
      }
      case 'dxos.halo.credentials.SpaceMember': {
        const invCredId = assertion.invitationCredentialId ? toPublicKey(assertion.invitationCredentialId) : undefined;
        if (invCredId != null) {
          this._redeemedInvitationCredentialIds.add(invCredId);
          const existingInvitation = this._invitations.get(invCredId);
          if (existingInvitation != null && !existingInvitation.multiUse) {
            this._invitations.delete(invCredId);
            await this.onDelegatedInvitationRemoved.callIfSet({
              credentialId: invCredId,
              invitation: existingInvitation,
            });
          }
        }
        break;
      }
    }
  }
}
