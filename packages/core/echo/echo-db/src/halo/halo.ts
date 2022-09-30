//
// Copyright 2021 DXOS.org
//

import debug from 'debug';
import assert from 'node:assert';

import { synchronized } from '@dxos/async';
import { Keyring, SecretProvider } from '@dxos/credentials';
import { createKeyPair, KeyPair } from '@dxos/crypto';
import { raise } from '@dxos/debug';
import { IdentityRecord } from '@dxos/halo-protocol';
import { PublicKey } from '@dxos/keys';
import { ModelFactory } from '@dxos/model-factory';
import { NetworkManager } from '@dxos/network-manager';
import { KeyRecord, KeyType } from '@dxos/protocols/proto/dxos/halo/keys';
import { humanize } from '@dxos/util';

import { ResultSet } from '../api';
import { InvitationAuthenticator, InvitationDescriptor, InvitationOptions } from '../invitations';
import { OpenProgress } from '../parties';
import { MetadataStore, PipelineOptions, PartyFeedProvider } from '../pipeline';
import { SnapshotStore } from '../snapshots';
import { Contact } from './contact-manager';
import { HaloFactory } from './halo-factory';
import { IdentityManager } from './identity-manager';
import type { CreateProfileOptions } from './types';

const log = debug('dxos:echo');

export interface ProfileInfo {
  publicKey: PublicKey
  username: string | undefined
}

export interface HaloConfiguration {
  keyring: Keyring
  networkManager: NetworkManager
  metadataStore: MetadataStore
  modelFactory: ModelFactory
  snapshotStore: SnapshotStore
  feedProviderFactory: (partyKey: PublicKey) => PartyFeedProvider
  options: PipelineOptions
}

/**
 * Manages user's identity and devices.
 */
export class HALO {
  private readonly _keyring: Keyring;
  private readonly _identityManager: IdentityManager;

  private _isOpen = false;

  constructor ({
    keyring,
    networkManager,
    metadataStore,
    modelFactory,
    snapshotStore,
    feedProviderFactory,
    options
  }: HaloConfiguration) {
    this._keyring = keyring;

    const haloFactory = new HaloFactory(
      networkManager,
      modelFactory,
      snapshotStore,
      feedProviderFactory,
      keyring,
      options
    );

    this._identityManager = new IdentityManager(this._keyring, haloFactory, metadataStore);
  }

  toString () {
    return `HALO(${JSON.stringify(this.info())})`;
  }

  info () {
    return {
      initialized: this.isInitialized,
      identityKey: this.identityKey?.publicKey.toHex(),
      displayName: this.identityDisplayName
    };
  }

  /**
   * Whether the current identity manager has been initialized.
   */
  get isInitialized (): boolean {
    return this._isOpen;
  }

  /**
   * Get user's identity.
   */
  get identity () {
    return this._identityManager.identity;
  }

  /**
   * Event that is fired when the user's identity has been initialized.
   */
  get identityReady () {
    return this._identityManager.ready;
  }

  /**
   * User's IDENTITY keypair.
   */
  get identityKey (): KeyRecord | undefined {
    return this.identity?.identityKey;
  }

  /**
   * User's identity display name.
   */
  // TODO(burdon): Rename username (here and in data structure).
  get identityDisplayName (): string | undefined {
    return this.identity?.displayName;
  }

  /**
   * Local keyring. Stores locally known keypairs.
   */
  get keyring (): Keyring {
    return this._keyring;
  }

  /**
   * @internal
   *
   * Loads the saved identity from disk. Is called by client.
   */
  @synchronized
  async open (onProgressCallback?: ((progress: OpenProgress) => void) | undefined) {
    // TODO(burdon): Replace with events.
    onProgressCallback?.({ haloOpened: false });

    // Open the HALO first (if present).
    await this._identityManager.loadFromStorage();

    onProgressCallback?.({ haloOpened: true });

    this._isOpen = true;
  }

  /**
   * Closes HALO. Automatically called when client is destroyed.
   */
  @synchronized
  async close () {
    this._isOpen = false;
    await this._identityManager.close();
  }

  /**
   * Reset the identity and delete all key records.
   */
  async reset () {
    try {
      await this._keyring.deleteAllKeyRecords();
    } catch (err: any) {
      log('Error clearing keyring:', err);
    }
  }

  /**
   * Create Profile. Add Identity key if public and secret key are provided.
   *
   * NOTE: This method does not initialize the HALO party.
   */
  private async _createIdentityKeypair (keyPair: KeyPair) {
    const { publicKey, secretKey } = keyPair;
    assert(publicKey, 'Invalid publicKey');
    assert(secretKey, 'Invalid secretKey');

    if (this.identity?.identityKey) {
      // TODO(burdon): Bad API: Semantics change based on options.
      // TODO(burdon): `createProfile` isn't part of this package.
      throw new Error('Identity key already exists. Call createProfile without a keypair to only create a halo party.');
    }

    await this._keyring.addKeyRecord({ secretKey, publicKey: PublicKey.from(publicKey), type: KeyType.IDENTITY });
  }

  /**
   * Creates the initial HALO party.
   */
  private async _createHaloParty (displayName?: string) {
    // TODO(burdon): Why not assert?
    if (this.identity) {
      throw new Error('Identity already initialized');
    }

    const identityKey = this._identityManager.getIdentityKey() ?? raise(new Error('Cannot create HALO. Identity key not found.'));
    await this._identityManager.createHalo({
      identityDisplayName: displayName || humanize(identityKey.publicKey)
    });
  }

  /**
   * Joins an existing identity HALO from a recovery seed phrase.
   */
  // TODO(dmaretskyi): Do not return HALO party here.
  async recover (seedPhrase: string) {
    assert(!this.identity?.halo, 'HALO already exists.');
    assert(!this.identity?.identityKey, 'Identity key already exists.');

    return this._identityManager.recoverHalo(seedPhrase);
  }

  /**
   * Initializes the current agent as a new device with the provided identity.
   *
   * Expects the device key to exist in the keyring.
   * Expects the new device to be admitted to the HALO.
   */
  async manuallyJoin (identity: IdentityRecord) {
    await this._identityManager.manuallyJoin(identity);
  }

  /**
   * Joins an existing identity HALO by invitation.
   */
  // TODO(dmaretskyi): Do not return HALO party here.
  async join (invitationDescriptor: InvitationDescriptor, secretProvider: SecretProvider) {
    assert(!this.identity?.halo, 'HALO already exists.');

    return this._identityManager.joinHalo(invitationDescriptor, secretProvider);
  }

  /**
   * Create an invitation to an exiting identity HALO.
   */
  async createInvitation (authenticationDetails: InvitationAuthenticator, options?: InvitationOptions) {
    assert(this.identity?.halo, 'HALO not initialized.');

    return this.identity.halo.createInvitation(authenticationDetails, options);
  }

  /**
   * Query for contacts. Contacts represent member keys across all known Parties.
   */
  // TODO(burdon): Expose ContactManager directly.
  queryContacts (): ResultSet<Contact> {
    assert(this.identity?.contacts, 'HALO not initialized.');

    return this.identity.contacts.queryContacts();
  }

  /**
   * Create Profile. Add Identity key if public and secret key are provided. Then initializes profile with given username.
   * If not public and secret key are provided it relies on keyring to contain an identity key.
   * @returns User profile info.
   */
  // TODO(burdon): Breaks if profile already exists.
  @synchronized
  async createProfile ({ publicKey, secretKey, username }: CreateProfileOptions = {}): Promise<ProfileInfo> {
    if (this.getProfile()) {
      throw new Error('Profile already exists.');
    }

    if (!!publicKey !== !!secretKey) {
      throw new Error('Both publicKey and secretKey must be provided or neither.');
    }

    const keyPair = publicKey ? { publicKey: Buffer.from(publicKey), secretKey: Buffer.from(secretKey!) } : createKeyPair();
    await this._createIdentityKeypair(keyPair);
    await this._createHaloParty(username);

    const profile = this.getProfile();
    assert(profile);
    return profile;
  }

  /**
   * @returns User profile info.
   */
  // TODO(burdon): Change to property (currently returns a new object each time).
  getProfile (): ProfileInfo | undefined {
    if (!this.identityKey) {
      return;
    }

    return {
      username: this.identityDisplayName,
      publicKey: this.identityKey.publicKey
    };
  }

  // TODO(burdon): Should be part of profile object. Or use standard Result object.
  subscribeToProfile (callback: () => void): () => void {
    return this.identityReady.on(callback);
  }
}
