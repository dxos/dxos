//
// Copyright 2020 DXOS.org
//

import { humanize } from '@dxos/crypto';
import { PartyKey, PublicKey } from '@dxos/echo-protocol';

import { InvitationAuthenticator, InvitationOptions } from '../invitations';
import { Database } from '../items/database';
import { ResultSet } from '../result';
import { PartyInternal, PARTY_ITEM_TYPE } from './party-internal';

export interface PartyMember {
  publicKey: PublicKey,
  displayName?: string
}

/**
 * A Party represents a shared dataset containing queryable Items that are constructed from an ordered stream
 * of mutations.
 */
export class Party {
  private readonly _database: Database;

  constructor (
    private readonly _impl: PartyInternal
  ) {
    this._database = new Database(() => this._impl.itemManager);
  }

  toString () {
    return `Party(${JSON.stringify({ key: humanize(this.key), open: this.isOpen })})`;
  }

  get key (): PartyKey {
    return this._impl.key;
  }

  get isOpen (): boolean {
    return this._impl.isOpen;
  }

  get database () {
    return this._database;
  }

  queryMembers (): ResultSet<PartyMember> {
    return new ResultSet(
      this._impl.processor.keyAdded.discardParameter(),
      () => this._impl.processor.memberKeys.map((publicKey: PublicKey) => {
        const displayName = this._impl.processor.getMemberInfo(publicKey)?.displayName;
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
    const timeoutId = setTimeout(() => {
      console.error('Looks like party.open() is taking more then 5 seconds. This is not an error but might mean that something went wrong.');
    }, 5000);
    try {
      await this._impl.open();

      if (this.database.queryItems({ type: PARTY_ITEM_TYPE }).value.length === 0) {
        await this.database.queryItems({ type: PARTY_ITEM_TYPE }).update.waitFor(items => items.length > 0);
      }
    } finally {
      clearTimeout(timeoutId);
    }

    return this;
  }

  /**
   * Closes the pipeline and streams.
   */
  async close () {
    await this._impl.close();

    return this;
  }

  /**
   * Sets a party property.
   * @param {string} key
   * @param value
   */
  async setProperty (key: string, value: any): Promise<this> {
    const item = await this._impl.getPropertiestItem();
    await item.model.setProperty(key, value);
    return this;
  }

  /**
   * Returns a party property value.
   * @param key
   */
  getProperty (key: string): any {
    const item = this._impl.getPropertiestItem();
    return item.model.getProperty(key);
  }

  /**
   * Creates an invition for a remote peer.
   */
  async createInvitation (authenticationDetails: InvitationAuthenticator, options: InvitationOptions = {}) {
    return this._impl.createInvitation(authenticationDetails, options);
  }
}
