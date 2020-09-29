//
// Copyright 2020 DXOS.org
//

import { humanize } from '@dxos/crypto';
import { PartyKey } from '@dxos/echo-protocol';

import { InvitationDetails } from '../invitations';
import { Database } from '../items/database';
import { PartyInternal } from './party-internal';

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

  /**
   * Opens the pipeline and connects the streams.
   */
  async open () {
    await this._impl.open();
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
  async getProperty (key: string): Promise<any> {
    const item = await this._impl.getPropertiestItem();
    return item.model.getProperty(key);
  }

  /**
   * Creates an invition for a remote peer.
   */
  async createInvitation (inviteDetails: InvitationDetails) {
    return this._impl.createInvitation(inviteDetails);
  }
}
