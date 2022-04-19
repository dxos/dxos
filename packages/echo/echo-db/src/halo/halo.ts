//
// Copyright 2021 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import { synchronized } from '@dxos/async';
import { KeyRecord, Keyring, KeyType, SecretProvider } from '@dxos/credentials';
import { createKeyPair, KeyPair, PublicKey } from '@dxos/crypto';
import { NetworkManager } from '@dxos/network-manager';

import { ResultSet } from '../api';
import { InvitationAuthenticator, InvitationDescriptor, InvitationOptions } from '../invitations';
import { MetadataStore } from '../metadata';
import { PartyFactory, OpenProgress, PartyManager } from '../parties';
import { Contact } from './contact-manager';
import { HaloFactory } from './halo-factory';
import { IdentityManager } from './identity-manager';
import type { CreateProfileOptions } from './types';

const log = debug('dxos:echo');

export interface ProfileInfo {
  publicKey: PublicKey,
  username: string | undefined
}

export interface HaloConfiguration {
  keyring: Keyring,
  partyFactory: PartyFactory,
  networkManager: NetworkManager,
  partyManager: PartyManager,
  metadataStore: MetadataStore
}

/**
 * Manages user's identity and devices.
 */
export class HALO {
  private readonly _keyring: Keyring;
  private readonly _partyManager: PartyManager;
  private readonly _identityManager: IdentityManager;

  constructor ({
    keyring,
    partyManager,
    partyFactory,
    networkManager,
    metadataStore
  }: HaloConfiguration) {
    this._keyring = keyring;
    this._partyManager = partyManager;

    const haloFactory = new HaloFactory(
      partyFactory,
      networkManager,
      this._keyring
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
    return this._identityManager.initialized;
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
    return this.identity.identityKey;
  }

  /**
   * User's identity display name.
   */
  // TODO(burdon): Rename username (here and in data structure).
  get identityDisplayName (): string | undefined {
    return this.identity.displayName;
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
  async open (onProgressCallback?: ((progress: OpenProgress) => void) | undefined) {
    // TODO(burdon): Replace with events.
    onProgressCallback?.({ haloOpened: false });

    // Open the HALO first (if present).
    await this._identityManager.loadFromStorage();

    onProgressCallback?.({ haloOpened: true });
  }

  /**
   * Closes HALO. Automatically called when client is destroyed.
   */
  async close () {
    // TODO(marik-d): Should be `_identityManager.close()`.
    await this.identity.halo?.close();
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
  // TODO(burdon): Why is this separate from createHalo?
  async createIdentity (keyPair: KeyPair) {
    const { publicKey, secretKey } = keyPair;
    assert(publicKey, 'Invalid publicKey');
    assert(secretKey, 'Invalid secretKey');

    if (this.identity.identityKey) {
      // TODO(burdon): Bad API: Semantics change based on options.
      // TODO(burdon): `createProfile` isn't part of this package.
      throw new Error('Identity key already exists. Call createProfile without a keypair to only create a halo party.');
    }

    await this._keyring.addKeyRecord({ secretKey, publicKey: PublicKey.from(publicKey), type: KeyType.IDENTITY });
  }

  /**
   * Creates the initial HALO party.
   */
  // TODO(burdon): Return Halo API object?
  async create (displayName?: string) {
    // TODO(burdon): Why not assert?
    if (this.identity.halo) {
      throw new Error('HALO party already exists');
    }
    if (!this.identity.identityKey) {
      throw new Error('Cannot create HALO. Identity key not found.');
    }

    await this._identityManager.createHalo({
      identityDisplayName: displayName || this.identity.identityKey.publicKey.humanize()
    });
  }

  /**
   * Joins an existing identity HALO from a recovery seed phrase.
   */
  async recover (seedPhrase: string) {
    assert(this._partyManager.isOpen, 'ECHO not open.');
    assert(!this.identity.halo, 'HALO already exists.');
    assert(!this.identity.identityKey, 'Identity key already exists.');

    return this._identityManager.recoverHalo(seedPhrase);
  }

  /**
   * Joins an existing identity HALO by invitation.
   */
  async join (invitationDescriptor: InvitationDescriptor, secretProvider: SecretProvider) {
    assert(this._partyManager.isOpen, 'ECHO not open.');
    assert(!this.identity.halo, 'HALO already exists.');

    return this._identityManager.joinHalo(invitationDescriptor, secretProvider);
  }

  /**
   * Create an invitation to an exiting identity HALO.
   */
  async createInvitation (authenticationDetails: InvitationAuthenticator, options?: InvitationOptions) {
    assert(this.identity.halo, 'HALO not initialized.');

    return this.identity.halo.invitationManager.createInvitation(authenticationDetails, options);
  }

  /**
   * Query for contacts. Contacts represent member keys across all known Parties.
   */
  // TODO(burdon): Expose ContactManager directly.
  queryContacts (): ResultSet<Contact> {
    assert(this.identity.contacts, 'HALO not initialized.');

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
    await this.createIdentity(keyPair);
    await this.create(username);

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
