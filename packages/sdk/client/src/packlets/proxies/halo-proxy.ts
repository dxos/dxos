//
// Copyright 2021 DXOS.org
//

import { inspect } from 'node:util';

import { Event, EventSubscriptions } from '@dxos/async';
import { ClientServicesProvider, ObservableInvitation } from '@dxos/client-services';
import { keyPairFromSeedPhrase } from '@dxos/credentials';
import { inspectObject } from '@dxos/debug';
import { ResultSet } from '@dxos/echo-db';
import { PublicKey } from '@dxos/keys';
import { Contact, Profile } from '@dxos/protocols/proto/dxos/client';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { DeviceInfo } from '@dxos/protocols/proto/dxos/halo/credentials/identity';

type CreateProfileOptions = {
  publicKey?: PublicKey;
  secretKey?: PublicKey;
  displayName?: string;
  seedphrase?: string;
};

/**
 * TODO(burdon): Public API (move comments here).
 */
export interface Halo {
  get profile(): Profile | undefined;
  createProfile(options?: CreateProfileOptions): Promise<Profile>;
  recoverProfile(seedPhrase: string): Promise<Profile>;
  subscribeToProfile(callback: (profile: Profile) => void): void;

  queryDevices(): Promise<DeviceInfo[]>;
  queryContacts(): ResultSet<Contact>;

  createInvitation(): Promise<ObservableInvitation>;
  acceptInvitation(invitation: Invitation): Promise<ObservableInvitation>;

  // sign(request: SignRequest): Promise<SignResponse>;
  // addKeyRecord(keyRecord: KeyRecord): Promise<void>;

  // setDevicePreference(key: string, value: string): Promise<void>;
  // getDevicePreference(key: string): Promise<string | undefined>;

  // setGlobalPreference(key: string, value: string): Promise<void>;
  // getGlobalPreference(key: string): Promise<string | undefined>;
}

export class HaloProxy implements Halo {
  private readonly _subscriptions = new EventSubscriptions();
  private readonly _contactsChanged = new Event(); // TODO(burdon): Remove (use subscription).

  public readonly profileChanged = new Event(); // TODO(burdon): Move into Profile object.

  private _profile?: Profile;
  private _contacts: Contact[] = [];

  // prettier-ignore
  constructor(
    private readonly _serviceProvider: ClientServicesProvider
  ) {}

  [inspect.custom]() {
    return inspectObject(this);
  }

  // TODO(burdon): Include deviceId.
  toJSON() {
    return {
      key: this._profile?.identityKey
    };
  }

  /**
   * User profile info.
   */
  get profile(): Profile | undefined {
    return this._profile;
  }

  /**
   * @deprecated
   */
  // TODO(burdon): Replaced with query/stream.
  subscribeToProfile(callback: (profile: Profile) => void): () => void {
    return this.profileChanged.on(() => callback(this._profile!));
  }

  /**
   * Create Profile.
   * Add Identity key if public and secret key are provided.
   * Then initializes profile with given display name.
   * If no public and secret key or seedphrase are provided it relies on keyring to contain an identity key.
   * Seedphrase must not be specified with existing keys.
   * @returns User profile info.
   */
  async createProfile({ publicKey, secretKey, displayName, seedphrase }: CreateProfileOptions = {}): Promise<Profile> {
    if (seedphrase && (publicKey || secretKey)) {
      throw new Error('Seedphrase must not be specified with existing keys');
    }

    if (seedphrase) {
      const keyPair = keyPairFromSeedPhrase(seedphrase);
      publicKey = PublicKey.from(keyPair.publicKey);
      secretKey = PublicKey.from(keyPair.secretKey);
    }

    // TODO(burdon): Rename createIdentity?
    this._profile = await this._serviceProvider.services.ProfileService.createProfile({
      publicKey: publicKey?.asUint8Array(),
      secretKey: secretKey?.asUint8Array(),
      displayName
    });

    return this._profile;
  }

  /**
   * Joins an existing identity HALO from a recovery seed phrase.
   */
  async recoverProfile(seedPhrase: string) {
    this._profile = await this._serviceProvider.services.ProfileService.recoverProfile({
      seedPhrase
    });
    return this._profile;
  }

  /**
   * Query for contacts. Contacts represent member keys across all known Parties.
   */
  queryContacts(): ResultSet<Contact> {
    return new ResultSet(this._contactsChanged, () => this._contacts);
  }

  async createInvitation(): Promise<ObservableInvitation> {
    throw new Error('Not implemented.');
  }

  async acceptInvitation(invitation: Invitation): Promise<ObservableInvitation> {
    throw new Error('Not implemented.');
  }

  async queryDevices(): Promise<DeviceInfo[]> {
    return [];
  }

  /**
   * Allocate resources and set-up internal subscriptions.
   * @internal
   */
  async _open() {
    const gotProfile = this.profileChanged.waitForCount(1);
    // const gotContacts = this._contactsChanged.waitForCount(1);

    const profileStream = this._serviceProvider.services.ProfileService.subscribeProfile();
    profileStream.subscribe((data) => {
      this._profile = data.profile;
      this.profileChanged.emit();
    });

    this._subscriptions.add(() => profileStream.close());

    // const contactsStream = this._serviceProvider.services.HaloService.subscribeContacts();
    // contactsStream.subscribe(data => {
    //   this._contacts = data.contacts as PartyMember[];
    //   this._contactsChanged.emit();
    // });

    // this._subscriptions.add(() => contactsStream.close());

    await Promise.all([gotProfile]);
  }

  /**
   * Destroy the instance and clean-up subscriptions.
   * @internal
   */
  _close() {
    this._subscriptions.clear();
  }
}
