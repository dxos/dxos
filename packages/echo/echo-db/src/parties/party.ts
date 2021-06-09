//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import { PublicKey } from '@dxos/crypto';
import { PartyKey } from '@dxos/echo-protocol';

import { ActivationOptions } from '../halo';
import { InvitationAuthenticator, InvitationOptions } from '../invitations';
import { ResultSet } from '../result';
import { PartyInternal, PartyMember } from './party-internal';

const log = debug('dxos:echo:party');

/**
 * A Party represents a shared dataset (ECHO database) containing queryable items
 * that are constructed from an ordered stream of mutations.
 */
export class Party {
  constructor (
    private readonly _internal: PartyInternal
  ) {}

  toString () {
    return `Party(${JSON.stringify({ key: this.key, open: this.isOpen })})`;
  }

  get update () {
    return this._internal.update;
  }

  get key (): PartyKey {
    return this._internal.key;
  }

  get isOpen (): boolean {
    return this._internal.isOpen;
  }

  /**
   * Is this Party eligible for automatic opening, processing, and replication?
   */
  get isActive () {
    return this._internal.isActive;
  }

  get database () {
    return this._internal.database;
  }

  get title () {
    return this._internal.title;
  }

  async setTitle (title: string) {
    return this._internal.setTitle(title);
  }

  /**
   * Opens the pipeline and connects the streams.
   */
  async open () {
    await this._internal.open();
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
    const item = await this._internal.getPropertiesItem();
    await item.model.setProperty(key, value);
    return this;
  }

  /**
   * Returns a party property value.
   * @param key
   */
  getProperty (key: string) {
    const resultSet = this._internal.getPropertiesSet();
    if (resultSet.value.length) {
      const [item] = resultSet.value;
      return item.model.getProperty(key);
    }

    log(`No properties item to check for ${key}`);
    return undefined;
  }

  /**
   * Get all party members.
   */
  queryMembers (): ResultSet<PartyMember> {
    assert(this.isOpen, 'Party is not open.');
    return new ResultSet(
      this._internal.processor.keyOrInfoAdded.discardParameter(),
      () => this._internal.processor.memberKeys
        .filter(publicKey => !this._internal.processor.partyKey.equals(publicKey))
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
   * Creates an invitation for a remote peer.
   */
  async createInvitation (authenticationDetails: InvitationAuthenticator, options: InvitationOptions = {}) {
    return this._internal.invitationManager.createInvitation(authenticationDetails, options);
  }

  /**
   * Creates an offline invitation for a known remote peer.
   */
  async createOfflineInvitation (publicKey: PublicKey) {
    return this._internal.invitationManager.createOfflineInvitation(publicKey);
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
