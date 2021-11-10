//
// Copyright 2021 DXOS.org
//

import { Event } from '@dxos/async';
import { SecretProvider } from '@dxos/credentials';
import { Contact, CreateProfileOptions, InvitationAuthenticator, InvitationDescriptor, InvitationOptions, PartyMember, ResultSet } from '@dxos/echo-db';
import { SubscriptionGroup } from '@dxos/util';

import { ClientServiceProvider } from '../interfaces';
import { Profile } from '../proto/gen/dxos/client';

export class HaloProxy {
  private _profile?: Profile;
  private _contacts: PartyMember[] = [];

  private readonly _profileChanged = new Event();
  private readonly _contactsChanged = new Event();

  private readonly _subscriptions = new SubscriptionGroup();

  constructor (private readonly _serviceProvider: ClientServiceProvider) {}

  toString () {
    return `HaloProxy(${this._profile?.publicKey})`;
  }

  /**
   * User profile info.
  */
  get profile (): Profile | undefined {
    return this._profile;
  }

  /**
   * @deprecated Use `profile` instead.
  */
  getProfile (): Profile | undefined {
    return this._profile;
  }

  hasProfile (): boolean {
    return !!this.profile;
  }

  /**
   * Reset the identity and delete all key records.
  */
  async reset () {
    await this._serviceProvider.services.ProfileService.Reset();
    this._profileChanged.emit();
  }

  // TODO(burdon): Should be part of profile object. Or use standard Result object.
  subscribeToProfile (cb: () => void): () => void {
    return this._profileChanged.on(cb);
  }

  /**
   * Create Profile. Add Identity key if public and secret key are provided. Then initializes profile with given username.
   * If not public and secret key are provided it relies on keyring to contain an identity key.
   * @returns {ProfileInfo} User profile info.
   */
  async createProfile ({ publicKey, secretKey, username }: CreateProfileOptions = {}): Promise<Profile> {
    this._profile = await this._serviceProvider.services.ProfileService.CreateProfile({ publicKey, secretKey, username });
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
    await this._serviceProvider.echo.halo.recover(seedPhrase);
  }

  /**
   * Joins an existing identity HALO by invitation.
   */
  async acceptInvitation (invitationDescriptor: InvitationDescriptor, secretProvider: SecretProvider) {
    return this._serviceProvider.echo.halo.join(invitationDescriptor, secretProvider);
  }

  /**
   * Create an invitation to an exiting identity HALO.
   */
  async createInvitation (authenticationDetails: InvitationAuthenticator, options?: InvitationOptions) {
    return this._serviceProvider.echo.halo.createInvitation(authenticationDetails, options);
  }

  /**
   * Allocate resources and set-up internal subscriptions.
   *
   * @private
   */
  open () {
    const profileStream = this._serviceProvider.services.ProfileService.SubscribeProfile();
    profileStream.subscribe(data => {
      this._profile = data.profile;
      this._profileChanged.emit();
    }, () => {});
    this._subscriptions.push(() => profileStream.close());

    const contactsStream = this._serviceProvider.services.ProfileService.SubscribeContacts();
    contactsStream.subscribe(data => {
      this._contacts = data.contacts as PartyMember[];
      this._contactsChanged.emit();
    }, () => {});
    this._subscriptions.push(() => contactsStream.close());
  }

  /**
   * Destroy the instance and clean-up subscriptions.
   *
   * @private
   */
  close () {
    this._subscriptions.unsubscribe();
  }
}
