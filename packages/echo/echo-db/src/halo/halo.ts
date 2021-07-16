//
// Copyright 2021 DXOS.org
//

import assert from 'assert';
import debug from 'debug';
import memdown from 'memdown';

import { synchronized } from '@dxos/async';
import { KeyRecord, Keyring, KeyStore, KeyType } from '@dxos/credentials';
import { KeyPair, PublicKey } from '@dxos/crypto';
import { NetworkManager } from '@dxos/network-manager';
import { SubscriptionGroup } from '@dxos/util';

import {
  InvitationAuthenticator, InvitationDescriptor, InvitationOptions, SecretProvider
} from '../invitations';
import { PartyFactory, OpenProgress, Party, PartyManager } from '../parties';
import { ResultSet } from '../result';
import { Contact } from './contact-manager';
import { HaloFactory } from './halo-factory';
import { IdentityManager } from './identity-manager';
import { autoPartyOpener } from './party-opener';
import type { CreateProfileOptions } from './types';

const log = debug('dxos:echo');

export interface HaloConfiguration {
  keyStorage?: any,
  partyFactory: PartyFactory,
  networkManager: NetworkManager,
  partyManager: PartyManager,
  subscriptionGroup: SubscriptionGroup
}

export class HALO {
  private readonly _identityManager: IdentityManager;
  private readonly _keyring: Keyring;
  private readonly _partyManager: PartyManager;
  private readonly _subs: SubscriptionGroup;

  constructor ({
    keyStorage = memdown(),
    partyFactory,
    networkManager,
    partyManager,
    subscriptionGroup
  }: HaloConfiguration) {
    this._keyring = new Keyring(new KeyStore(keyStorage));
    this._subs = subscriptionGroup;

    const haloFactory = new HaloFactory(
      partyFactory,
      networkManager,
      this._keyring
    );

    this._identityManager = new IdentityManager(this._keyring, haloFactory);
    this._partyManager = partyManager;

    this._identityManager.ready.once(() => {
      // It might be the case that halo gets closed before this has a chance to execute.
      if (this._identityManager.identity.halo?.isOpen) {
        this._subs.push(autoPartyOpener(this._identityManager.identity.halo!, this._partyManager));
      }
    });
  }

  get identity () {
    return this._identityManager.identity;
  }

  get isInitialized (): boolean {
    return this.identity.halo !== undefined;
  }

  get identityReady () {
    return this._identityManager.ready;
  }

  get identityKey (): KeyRecord | undefined {
    return this.identity.identityKey;
  }

  get identityDisplayName (): string | undefined {
    return this.identity.displayName;
  }

  get keyring (): Keyring {
    return this._keyring;
  }

  async open (onProgressCallback?: ((progress: OpenProgress) => void) | undefined) {
    await this._keyring.load();

    // TODO(burdon): Replace with events.
    onProgressCallback?.({ haloOpened: false });

    // Open the HALO first (if present).
    await this._identityManager.loadFromStorage();

    onProgressCallback?.({ haloOpened: true });
  }

  async close () {
    // TODO(marik-d): Should be _identityManager.close().
    await this.identity.halo?.close();
  }

  async reset () {
    try {
      await this._keyring.deleteAllKeyRecords();
    } catch (err) {
      log('Error clearing keyring:', err);
    }
  }

  /**
   * Create Profile. Add Identity key if public and secret key are provided.
   */
  // TODO(burdon): Why is this separate from createHalo?
  async createIdentity (keyPair: KeyPair) {
    const { publicKey, secretKey } = keyPair;
    assert(publicKey, 'Invalid publicKey');
    assert(secretKey, 'Invalid secretKey');

    if (this.identity.identityKey) {
      // TODO(burdon): Bad API: Semantics change based on options.
      // TODO(burdon): createProfile isn't part of this package.
      throw new Error('Identity key already exists. Call createProfile without a keypair to only create a halo party.');
    }

    await this._keyring.addKeyRecord({ secretKey, publicKey: PublicKey.from(publicKey), type: KeyType.IDENTITY });
  }

  /**
   * Creates the initial HALO party.
   * @param displayName
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

    const impl = await this._identityManager.recoverHalo(seedPhrase);
    return new Party(impl);
  }

  /**
   * Joins an existing identity HALO by invitation.
   */
  async join (invitationDescriptor: InvitationDescriptor, secretProvider: SecretProvider) {
    assert(this._partyManager.isOpen, 'ECHO not open.');
    assert(!this.identity.halo, 'HALO already exists.');

    const impl = await this._identityManager.joinHalo(invitationDescriptor, secretProvider);
    return new Party(impl);
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
    assert(this.identity.halo, 'Invalid HALO.');

    return this.identity.halo.contacts.queryContacts();
  }

  /**
   * Create Profile. Add Identity key if public and secret key are provided. Then initializes profile with given username.
   * If not public and secret key are provided it relies on keyring to contain an identity key.
   * @returns {ProfileInfo} User profile info.
   */
  // TODO(burdon): Breaks if profile already exists.
  // TODO(burdon): ProfileInfo is not imported or defined.
  @synchronized
  async createProfile ({ publicKey, secretKey, username }: CreateProfileOptions = {}) {
    if (this.getProfile()) {
      throw new Error('Profile already exists.');
    }

    // TODO(burdon): What if not set?
    if (publicKey && secretKey) {
      await this.createIdentity({ publicKey, secretKey });
    }

    await this.create(username);

    return this.getProfile();
  }

  /**
   * @returns true if the profile exists.
   * @deprecated Use getProfile.
   */
  // TODO(burdon): Remove?
  hasProfile () {
    return this.identityKey;
  }

  /**
   * @returns {ProfileInfo} User profile info.
   */
  // TODO(burdon): Change to property (currently returns a new object each time).
  getProfile () {
    if (!this.identityKey) {
      return;
    }

    return {
      username: this.identityDisplayName,
      // TODO(burdon): Why convert to string?
      publicKey: this.identityKey.publicKey
    };
  }

  // TODO(burdon): Should be part of profile object. Or use standard Result object.
  subscribeToProfile (cb: () => void): () => void {
    return this.identityReady.on(cb);
  }
}
