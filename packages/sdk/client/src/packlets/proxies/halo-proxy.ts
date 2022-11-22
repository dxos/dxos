//
// Copyright 2021 DXOS.org
//

import { inspect } from 'node:util';

import { Event, EventSubscriptions } from '@dxos/async';
import {
  AuthenticatingInvitationObservable,
  ClientServicesProvider,
  HaloInvitationsProxy,
  InvitationObservable,
  InvitationsOptions
} from '@dxos/client-services';
import { keyPairFromSeedPhrase } from '@dxos/credentials';
import { inspectObject } from '@dxos/debug';
import { ResultSet } from '@dxos/echo-db';
import { PublicKey } from '@dxos/keys';
import { Contact, Profile } from '@dxos/protocols/proto/dxos/client';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { DeviceInfo } from '@dxos/protocols/proto/dxos/halo/credentials/identity';
import { humanize } from '@dxos/util';

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
  get invitations(): InvitationObservable[];
  createProfile(options?: CreateProfileOptions): Promise<Profile>;
  recoverProfile(seedPhrase: string): Promise<Profile>;
  subscribeToProfile(callback: (profile: Profile) => void): void;

  queryDevices(): Promise<DeviceInfo[]>;
  queryContacts(): ResultSet<Contact>;

  createInvitation(): Promise<InvitationObservable>;
  acceptInvitation(invitation: Invitation): Promise<InvitationObservable>;
}

export class HaloProxy implements Halo {
  private readonly _subscriptions = new EventSubscriptions();
  private readonly _contactsChanged = new Event(); // TODO(burdon): Remove (use subscription).
  private readonly _invitationProxy = new HaloInvitationsProxy(this._serviceProvider.services.HaloInvitationsService);
  private readonly _invitations: InvitationObservable[] = [];

  public readonly invitationsUpdate = new Event<InvitationObservable>();
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

  get invitations() {
    return this._invitations;
  }

  /**
   * Allocate resources and set-up internal subscriptions.
   */
  async open() {
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
    //   this._contacts = data.contacts as SpaceMember[];
    //   this._contactsChanged.emit();
    // });

    // this._subscriptions.add(() => contactsStream.close());

    await Promise.all([gotProfile]);
  }

  /**
   * Destroy the instance and clean-up subscriptions.
   */
  async close() {
    this._subscriptions.clear();
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
   * Query for contacts. Contacts represent member keys across all known Spaces.
   */
  queryContacts(): ResultSet<Contact> {
    return new ResultSet(this._contactsChanged, () => this._contacts);
  }

  createInvitation(options?: InvitationsOptions): Promise<InvitationObservable> {
    return new Promise<InvitationObservable>((resolve, reject) => {
      const invitation = this._invitationProxy.createInvitation(undefined, options);

      this._invitations.push(invitation);
      const unsubscribe = invitation.subscribe({
        onConnecting: () => {
          this.invitationsUpdate.emit(invitation);
          resolve(invitation);
          unsubscribe();
        },
        onSuccess: () => {
          unsubscribe();
        },
        onError: function (err: any): void {
          unsubscribe();
          reject(err);
        }
      });
    });
  }

  acceptInvitation(invitation: Invitation, options?: InvitationsOptions): Promise<AuthenticatingInvitationObservable> {
    return new Promise<AuthenticatingInvitationObservable>((resolve, reject) => {
      const acceptedInvitation = this._invitationProxy.acceptInvitation(invitation, options);
      const unsubscribe = acceptedInvitation.subscribe({
        onConnecting: () => {
          resolve(acceptedInvitation);
          unsubscribe();
        },
        onSuccess: () => {
          unsubscribe();
        },
        onError: function (err: any): void {
          unsubscribe();
          reject(err);
        }
      });
    });
  }

  async queryDevices(): Promise<DeviceInfo[]> {
    return new Promise((resolve, reject) => {
      const stream = this._serviceProvider.services.DevicesService.queryDevices();
      stream.subscribe(
        (devices) => {
          resolve(
            devices.devices?.map((device) => ({
              publicKey: device.deviceKey,
              displayName: humanize(device.deviceKey)
            })) ?? []
          );
          stream.close();
        },
        (error) => {
          reject(error);
          stream.close();
        }
      );
    });
  }
}
