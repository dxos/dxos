//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import assert from 'node:assert';

import { PublicKey } from '@dxos/protocols';
import { KeyRecord } from '@dxos/protocols/proto/dxos/halo/keys';
import { SignedMessage } from '@dxos/protocols/proto/dxos/halo/signed';

import { PartyEventType } from './events';
import { PartyState } from './party-state';

const log = debug('dxos:halo:party');

/**
 * A class to manage the lifecycle of invitations which are written to the Party.
 * @package
 */
export class PartyInvitationManager {
  _party: PartyState;
  _activeInvitations: Map<string, SignedMessage>;
  _invitationsByKey: Map<string, Set<string>>;

  constructor (party: PartyState) {
    assert(party);

    this._party = party;
    this._activeInvitations = new Map<string, SignedMessage>();
    this._invitationsByKey = new Map<string, Set<string>>();

    this._party.on(PartyEventType.ADMIT_KEY, (keyRecord: KeyRecord) => {
      const byKey = this._invitationsByKey.get(keyRecord.publicKey.toHex()) || new Set();
      for (const idStr of byKey) {
        log(`${keyRecord.publicKey.toHex()} admitted, deactivating Invitation ${idStr}.`);
        this._activeInvitations.delete(idStr);
      }
      this._invitationsByKey.delete(keyRecord.publicKey.toHex());
    });
  }

  /**
   * Return the Message for `invitationID`, if known.
   */
  getInvitation (invitationID: Buffer) {
    return this._activeInvitations.get(invitationID.toString('hex'));
  }

  /**
   * Record a new PartyInvitation message.
   * @param {SignedMessage} invitationMessage
   */
  recordInvitation (invitationMessage: SignedMessage) {
    assert(invitationMessage);

    const invitation = this._verifyAndParse(invitationMessage);
    const idStr = invitation.id.toString('hex');
    const keyStr = PublicKey.from(invitation.inviteeKey).toHex();

    if (this._party.isMemberKey(invitation.inviteeKey)) {
      log(`Invitation ${idStr} is for existing member ${keyStr}`);
      return;
    }

    if (!this._activeInvitations.has(idStr)) {
      this._activeInvitations.set(idStr, invitationMessage);
      const byKey = this._invitationsByKey.get(keyStr) || new Set();
      byKey.add(idStr);
      this._invitationsByKey.set(keyStr, byKey);
    }
  }

  /**
   * Verify that the PartyInvitation message is properly formed and validly signed.
   * @returns {PartyInvitation}
   * @private
   */
  _verifyAndParse (invitationMessage: SignedMessage) {
    assert(invitationMessage);

    // Verify Message.
    if (!this._party.verifySignatures(invitationMessage)) {
      throw new Error(`Unverifiable message: ${invitationMessage}`);
    }

    const { id } = invitationMessage.signed.payload;
    assert(Buffer.isBuffer(id), 'id is not a buffer in the invitation.');

    const issuerKey = PublicKey.from(invitationMessage.signed.payload.issuerKey);

    if (!this._party.isMemberKey(issuerKey)) {
      throw new Error(`Invalid issuer: ${invitationMessage}`);
    }

    return invitationMessage.signed.payload;
  }
}
