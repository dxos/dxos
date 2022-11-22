//
// Copyright 2021 DXOS.org
//

import { inspect } from 'node:util';

import { Event, EventSubscriptions } from '@dxos/async';
import {
  AuthenticatingInvitationObservable,
  CancellableInvitationObservable,
  ClientServicesProvider,
  HaloInvitationsProxy,
  InvitationsOptions
} from '@dxos/client-services';
import { keyPairFromSeedPhrase } from '@dxos/credentials';
import { inspectObject } from '@dxos/debug';
import { ResultSet } from '@dxos/echo-db';
import { ApiError } from '@dxos/errors';
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
  get invitations(): CancellableInvitationObservable[];
  createProfile(options?: CreateProfileOptions): Promise<Profile>;
  recoverProfile(seedPhrase: string): Promise<Profile>;
  subscribeToProfile(callback: (profile: Profile) => void): void;

  queryDevices(): Promise<DeviceInfo[]>;
  queryContacts(): ResultSet<Contact>;

  createInvitation(): Promise<CancellableInvitationObservable>;
  acceptInvitation(invitation: Invitation): Promise<CancellableInvitationObservable>;
}

export class HaloProxy implements Halo {
  private readonly _subscriptions = new EventSubscriptions();
  private readonly _contactsChanged = new Event(); // TODO(burdon): Remove (use subscription).
  public readonly invitationsUpdate = new Event<CancellableInvitationObservable>();
  public readonly profileChanged = new Event(); // TODO(burdon): Move into Profile object.

  private readonly _invitations: CancellableInvitationObservable[] = [];
  private _invitationProxy?: HaloInvitationsProxy;

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

  // TODO(burdon): Standardize isOpen, etc.
  get opened() {
    return this._invitationProxy !== undefined;
  }

  /**
   * Allocate resources and set-up internal subscriptions.
   */
  async open() {
    const gotProfile = this.profileChanged.waitForCount(1);
    // const gotContacts = this._contactsChanged.waitForCount(1);

    // TODO(burdon): ???
    this._invitationProxy = new HaloInvitationsProxy(this._serviceProvider.services.HaloInvitationsService);

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
    this._invitationProxy = undefined;
  }

  /**
   * @deprecated
   */
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
      throw new ApiError('Seedphrase must not be specified with existing keys');
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

  /**
   * Get set of authenticated devices.
   */
  // TODO(burdon): Standardize Promise vs. stream.
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

  /**
   * Initiates device invitation.
   */
  async createInvitation(options?: InvitationsOptions): Promise<CancellableInvitationObservable> {
    if (!this.opened) {
      throw new ApiError('Client not open.');
    }

    return new Promise<CancellableInvitationObservable>((resolve, reject) => {
      const invitation = this._invitationProxy!.createInvitation(undefined, options);

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

  /**
   * Initiates accepting invitation.
   */
  async acceptInvitation(
    invitation: Invitation,
    options?: InvitationsOptions
  ): Promise<AuthenticatingInvitationObservable> {
    if (!this.opened) {
      throw new ApiError('Client not open.');
    }

    return new Promise<AuthenticatingInvitationObservable>((resolve, reject) => {
      const acceptedInvitation = this._invitationProxy!.acceptInvitation(invitation, options);
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
}
