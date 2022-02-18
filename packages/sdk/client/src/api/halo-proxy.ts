//
// Copyright 2021 DXOS.org
//

import { Event, ReadOnlyEvent } from '@dxos/async';
import { KeyRecord } from '@dxos/credentials';
import { Contact, CreateProfileOptions, InvitationDescriptor, InvitationOptions, PartyMember, ResultSet } from '@dxos/echo-db';
import { SubscriptionGroup } from '@dxos/util';

import { ClientServiceProvider } from '../interfaces';
import { Profile, SignRequest } from '../proto/gen/dxos/client';
import { Invitation, InvitationProxy, InvitationRequest } from './invitations';

export interface CreateInvitationOptions extends InvitationOptions {
  onPinGenerated?: (pin: string) => void
}

export class HaloProxy extends InvitationProxy {
  private _profile?: Profile;
  private _contacts: PartyMember[] = [];

  public readonly profileChanged = new Event();
  private readonly _contactsChanged = new Event();

  private readonly _subscriptions = new SubscriptionGroup();

  constructor (private readonly _serviceProvider: ClientServiceProvider) {
    super();
  }

  override toString () {
    return `HaloProxy(${this._profile?.publicKey})`;
  }

  /**
   * User profile info.
  */
  get profile (): Profile | undefined {
    return this._profile;
  }

  /**
   * Reset the identity and delete all key records.
  */
  async reset () {
    await this._serviceProvider.services.SystemService.reset();
    this.profileChanged.emit();
  }

  // TODO(burdon): Should be part of profile object. Or use standard Result object.
  subscribeToProfile (cb: () => void): () => void {
    return this.profileChanged.on(cb);
  }

  /**
   * Create Profile. Add Identity key if public and secret key are provided. Then initializes profile with given username.
   * If not public and secret key are provided it relies on keyring to contain an identity key.
   * @returns User profile info.
   */
  async createProfile ({ publicKey, secretKey, username }: CreateProfileOptions = {}): Promise<Profile> {
    this._profile = await this._serviceProvider.services.ProfileService.createProfile({ publicKey, secretKey, username });
    return this._profile;
  }

  /**
   * Query for contacts. Contacts represent member keys across all known Parties.
   */
  queryContacts (): ResultSet<Contact> {
    return new ResultSet(this._contactsChanged, () => this._contacts);
  }

  /**
   * Joins an existing identity HALO from a recovery seed phrase.
   */
  async recoverProfile (seedPhrase: string) {
    this._profile = await this._serviceProvider.services.ProfileService.recoverProfile({ seedPhrase });
    return this._profile;
  }

  /**
   * Creates an invitation to an existing HALO party.
   * Used to authorize another device of the same user.
   * The Invitation flow requires the inviter device and invitee device to be online at the same time.
   * The invitation flow is protected by a generated pin code.
   *
   * To be used with `client.halo.joinHaloInvitation` on the invitee side.
   */
  async createInvitation (): Promise<InvitationRequest> {
    const stream = await this._serviceProvider.services.ProfileService.createInvitation();
    return this.createInvitationRequest({ stream });
  }

  /**
   * Joins an existing identity HALO by invitation.
   * Used to authorize another device of the same user.
   * The Invitation flow requires the inviter device and invitee device to be online at the same time.
   * The invitation flow is protected by a generated pin code.
   *
   * To be used with `client.halo.createHaloInvitation` on the inviter side.
  */
  acceptInvitation (invitationDescriptor: InvitationDescriptor): Invitation {
    const invitationProcessStream = this._serviceProvider.services.ProfileService.acceptInvitation(invitationDescriptor.toProto());
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

    return new Invitation(
      invitationDescriptor,
      waitForHalo(),
      authenticate
    );
  }

  async addKeyRecord (keyRecord: KeyRecord) {
    await this._serviceProvider.services.HaloService.addKeyRecord({ keyRecord });
  }

  async sign (request: SignRequest) {
    return await this._serviceProvider.services.HaloService.sign(request);
  }

  /**
   * Allocate resources and set-up internal subscriptions.
   *
   * @internal
   */
  async _open () {
    const gotProfile = this.profileChanged.waitForCount(1);
    const gotContacts = this._contactsChanged.waitForCount(1);

    const profileStream = this._serviceProvider.services.ProfileService.subscribeProfile();
    profileStream.subscribe(data => {
      this._profile = data.profile;
      this.profileChanged.emit();
    }, () => {});
    this._subscriptions.push(() => profileStream.close());

    const contactsStream = this._serviceProvider.services.HaloService.subscribeContacts();
    contactsStream.subscribe(data => {
      this._contacts = data.contacts as PartyMember[];
      this._contactsChanged.emit();
    }, () => {});
    this._subscriptions.push(() => contactsStream.close());

    await Promise.all([gotProfile, gotContacts]);
  }

  /**
   * Destroy the instance and clean-up subscriptions.
   *
   * @internal
   */
  _close () {
    this._subscriptions.unsubscribe();
  }
}
