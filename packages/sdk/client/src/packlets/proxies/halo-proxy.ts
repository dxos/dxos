//
// Copyright 2021 DXOS.org
//

import { Event, EventSubscriptions } from '@dxos/async';
import { ClientServicesProvider } from '@dxos/client-services';
import { keyPairFromSeedPhrase } from '@dxos/credentials';
import { ResultSet } from '@dxos/echo-db';
import { PublicKey } from '@dxos/keys';
import { Profile } from '@dxos/protocols/proto/dxos/client';
import { DeviceInfo } from '@dxos/protocols/proto/dxos/halo/credentials/identity';

import { Halo } from './halo';
import { InvitationProxy, InvitationWrapper, InvitationChallenge, InvitationRequest } from './invitations';
import { Contact, CreateProfileOptions, PartyMember } from './stubs';

export interface HaloInfo {
  key?: PublicKey;
}

/**
 * Client proxy to local/remote HALO service.
 */
export class HaloProxy implements Halo {
  private readonly _invitationProxy = new InvitationProxy();
  private readonly _subscriptions = new EventSubscriptions();

  private readonly _contactsChanged = new Event();
  public readonly profileChanged = new Event(); // TODO(burdon): Move into Profile object.

  private _profile?: Profile;
  private _contacts: PartyMember[] = [];

  // prettier-ignore
  constructor(
    private readonly _serviceProvider: ClientServicesProvider
  ) {}

  toString() {
    return `HaloProxy(${JSON.stringify(this.info)})`;
  }

  get info(): HaloInfo {
    return {
      key: this._profile?.publicKey
    };
  }

  get invitationProxy() {
    return this._invitationProxy;
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
  // TODO(burdon): Remove and expose event handler?
  subscribeToProfile(callback: (profile: Profile) => void): () => void {
    return this.profileChanged.on(() => callback(this._profile!));
  }

  /**
   * Create Profile.
   * Add Identity key if public and secret key are provided.
   * Then initializes profile with given username.
   * If no public and secret key or seedphrase are provided it relies on keyring to contain an identity key.
   * Seedphrase must not be specified with existing keys.
   * @returns User profile info.
   */
  async createProfile({ publicKey, secretKey, username, seedphrase }: CreateProfileOptions = {}): Promise<Profile> {
    if (seedphrase && (publicKey || secretKey)) {
      throw new Error('Seedphrase must not be specified with existing keys');
    }

    if (seedphrase) {
      const keyPair = keyPairFromSeedPhrase(seedphrase);
      publicKey = keyPair.publicKey;
      secretKey = keyPair.secretKey;
    }

    this._profile = await this._serviceProvider.services.ProfileService.createProfile({
      publicKey,
      secretKey,
      username
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

  /**
   * Creates an invitation to an existing HALO party.
   * Used to authorize another device of the same user.
   * The Invitation flow requires the inviter device and invitee device to be online at the same time.
   * The invitation flow is protected by a generated pin code.
   *
   * To be used with `client.halo.joinHaloInvitation` on the invitee side.
   */
  async createInvitation(): Promise<InvitationRequest> {
    const stream = await this._serviceProvider.services.ProfileService.createInvitation();
    return this._invitationProxy.createInvitationRequest({ stream });
  }

  /**
   * Joins an existing identity HALO by invitation.
   * Used to authorize another device of the same user.
   * The Invitation flow requires the inviter device and invitee device to be online at the same time.
   * The invitation flow is protected by a generated pin code.
   *
   * To be used with `client.halo.createHaloInvitation` on the inviter side.
   */
  acceptInvitation(invitationDescriptor: InvitationWrapper): InvitationChallenge {
    const invitationProcessStream = this._serviceProvider.services.ProfileService.acceptInvitation(
      invitationDescriptor.toProto()
    );

    const { authenticate, waitForFinish } = InvitationProxy.handleInvitationRedemption({
      stream: invitationProcessStream,
      invitationDescriptor,
      onAuthenticate: async (request) => {
        await this._serviceProvider.services.ProfileService.authenticateInvitation(request);
      }
    });

    const waitForHalo = async () => {
      await waitForFinish();
      await this.profileChanged.waitForCondition(() => !!this.profile?.publicKey);
    };

    return new InvitationChallenge(invitationDescriptor, waitForHalo(), authenticate);
  }

  // async sign(request: SignRequest) {
  //   return await this._serviceProvider.services.HaloService.sign(request);
  // }

  // async addKeyRecord(keyRecord: KeyRecord) {
  //   await this._serviceProvider.services.HaloService.addKeyRecord({
  //     keyRecord
  //   });
  // }

  // TODO(burdon): Implement.
  async queryDevices(): Promise<DeviceInfo[]> {
    return [];
  }

  // async setDevicePreference(key: string, value: string): Promise<void> {
  //   await this._serviceProvider.services.HaloService.setDevicePreference({
  //     key,
  //     value
  //   });
  // }

  // async getDevicePreference(key: string): Promise<string | undefined> {
  //   return (
  //     await this._serviceProvider.services.HaloService.getDevicePreference({
  //       key
  //     })
  //   ).value;
  // }

  // async setGlobalPreference(key: string, value: string): Promise<void> {
  //   await this._serviceProvider.services.HaloService.setGlobalPreference({
  //     key,
  //     value
  //   });
  // }

  // async getGlobalPreference(key: string): Promise<string | undefined> {
  //   return (
  //     await this._serviceProvider.services.HaloService.getGlobalPreference({
  //       key
  //     })
  //   ).value;
  // }

  /**
   * Allocate resources and set-up internal subscriptions.
   *
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
   *
   * @internal
   */
  _close() {
    this._subscriptions.clear();
    this._invitationProxy.close();
  }
}
