//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import { PublicKey } from '@dxos/crypto';
import { PartyKey } from '@dxos/echo-protocol';

import { ActivationOptions } from '../halo';
import { InvitationAuthenticator, InvitationOptions, defaultInvitationAuthenticator } from '../invitations';
import { ResultSet } from '../result';
import { PartyInternal, PartyMember } from './party-internal';
import { CONTACT_DEBOUNCE_INTERVAL } from './party-manager';

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

  /**
   * Event that is emitted when party state changes or metadata is updated.
   */
  get update () {
    return this._internal.update;
  }

  /**
   * Party key. Each party is identified by it's key.
   */
  get key (): PartyKey {
    return this._internal.key;
  }

  /**
   * Whether party is currently open.
   *
   * Party needs to be open to be able to query data from it, make mutations, or replicate with other peers.
   */
  get isOpen (): boolean {
    return this._internal.isOpen;
  }

  /**
   * Is this Party eligible for automatic opening, processing, and replication?
   */
  get isActive () {
    return this._internal.isActive;
  }

  /**
   * Database instance of the current party.
   */
  get database () {
    return this._internal.database;
  }

  /**
   * Party preferences.
   */
  get preferences () {
    return this._internal.preferences;
  }

  /**
   * Party title.
   */
  get title () {
    return this._internal.title;
  }

  /**
   * Sets party title.
   */
  async setTitle (title: string) {
    return this._internal.setTitle(title);
  }

  /**
   * Opens the pipeline and connects the streams.
   *
   * Party needs to be open to be able to query data from it, make mutations, or replicate with other peers.
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
   * Sets a party metadata property.
   * @param {string} key
   * @param value
   */
  async setProperty (key: string, value: any): Promise<this> {
    const item = await this._internal.getPropertiesItem();
    await item.model.setProperty(key, value);
    return this;
  }

  /**
   * Returns a party metadata property value.
   * @param key
   */
  getProperty (key: string) {
    const resultSet = this._internal.getPropertiesSet();
    if (resultSet.getValue().length) {
      const [item] = resultSet.getValue();
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
      this._internal.processor.keyOrInfoAdded.debounce(CONTACT_DEBOUNCE_INTERVAL).discardParameter(),
      () => this._internal.processor.memberKeys
        .filter(publicKey => !this._internal.processor.partyKey.equals(publicKey))
        .map((publicKey: PublicKey): PartyMember => {
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
   *
   * @param authenticationDetails Authenticator for a shared secret (usually a PIN code) to validate the peer accepting the invitation. When not providing it, use `0000` as pinCode.
   */
  async createInvitation (authenticationDetails: InvitationAuthenticator = defaultInvitationAuthenticator, options: InvitationOptions = {}) {
    return this._internal.invitationManager.createInvitation(authenticationDetails, options);
  }

  /**
   * Creates an offline invitation for a known remote peer.
   *
   * The peer's key should already be known to the current peer. E.g. they have been in the same party before.
   *
   * This invitation does not require a shared secret (PIN code) because the peer's identity is known beforehand.
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
