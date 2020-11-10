//
// Copyright 2020 DXOS.org
//

import { humanize } from '@dxos/crypto';
import { PartyKey, PublicKey } from '@dxos/echo-protocol';

import { InvitationAuthenticator, InvitationOptions } from '../invitations';
import { ResultSet } from '../result';
import { PartyInternal, PARTY_ITEM_TYPE, ActivationOptions } from './party-internal';

export interface PartyMember {
  publicKey: PublicKey,
  displayName?: string
}

/**
 * A Party represents a shared dataset containing queryable Items that are constructed from an ordered stream
 * of mutations.
 */
export class Party {
  constructor (
    private readonly _internal: PartyInternal
  ) {}

  toString () {
    return `Party(${JSON.stringify({ key: humanize(this.key), open: this.isOpen })})`;
  }

  get key (): PartyKey {
    return this._internal.key;
  }

  get isOpen (): boolean {
    return this._internal.isOpen;
  }

  get database () {
    return this._internal.database;
  }

  queryMembers (): ResultSet<PartyMember> {
    return new ResultSet(
      this._internal.processor.keyOrInfoAdded.discardParameter(),
      () => this._internal.processor.memberKeys
        .filter(publicKey => Buffer.compare(this._internal.processor.partyKey, publicKey) !== 0)
        .map((publicKey: PublicKey) => {
          const displayName = this._internal.processor.getMemberInfo(publicKey)?.displayName;
          return {
            publicKey,
            displayName
          };
        })
    );
  }

  /**
   * Opens the pipeline and connects the streams.
   */
  async open () {
    await this._internal.open();

    await this.database.waitForItem({ type: PARTY_ITEM_TYPE });
  }

  /**
   * Closes the pipeline and streams.
   */
  async close () {
    await this._internal.close();

    return this;
  }

  /**
   * Sets a party property.
   * @param {string} key
   * @param value
   */
  async setProperty (key: string, value: any): Promise<this> {
    const item = await this._internal.getPropertiestItem();
    await item.model.setProperty(key, value);
    return this;
  }

  /**
   * Returns a party property value.
   * @param key
   */
  getProperty (key: string): any {
    const item = this._internal.getPropertiestItem();
    return item.model.getProperty(key);
  }

  /**
   * Creates an invitation for a remote peer.
   */
  async createInvitation (authenticationDetails: InvitationAuthenticator, options: InvitationOptions = {}) {
    return this._internal.invitationManager.createInvitation(authenticationDetails, options);
  }

  /**
   * Creates an offline invitation for a known remote peer.
   */
  async createOfflineInvitation (publicKey: Uint8Array) {
    return this._internal.invitationManager.createOfflineInvitation(publicKey);
  }

  /**
   * Is this Party eligible for automatic opening, processing, and replication?
   */
  get isActive () {
    return this._internal.isActive;
  }

  /**
   * Activate the Party for automatic opening, processing, and replication.
   * The Party will be opened if it is currently closed.
   * @param options
   */
  async activate (options: ActivationOptions) {
    return this._internal.activate(options);
  }

  /**
   * Deactivate the Party (ie, disable automatic opening, processing, and replication).
   * The Party will be closed if it is currently open.
   * @param options
   */
  async deactivate (options: ActivationOptions) {
    return this._internal.deactivate(options);
  }
}
