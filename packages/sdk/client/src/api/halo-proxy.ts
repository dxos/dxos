//
// Copyright 2021 DXOS.org
//

import assert from 'assert';

import { Event, trigger } from '@dxos/async';
import { throwUnhandledRejection } from '@dxos/debug';
import { Contact, CreateProfileOptions, InvitationDescriptor, InvitationDescriptorType, InvitationOptions, PartyMember, ResultSet } from '@dxos/echo-db';
import { RpcClosedError } from '@dxos/rpc';
import { SubscriptionGroup } from '@dxos/util';

import { ClientServiceProvider } from '../interfaces';
import { InvitationState, Profile, RedeemedInvitation } from '../proto/gen/dxos/client';
import { Invitation, InvitationProxy, InvitationRequest } from './invitations';

export interface CreateInvitationOptions extends InvitationOptions {
  onPinGenerated?: (pin: string) => void
}

export class HaloProxy extends InvitationProxy {
  private _profile?: Profile;
  private _contacts: PartyMember[] = [];

  private readonly _profileChanged = new Event();
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
    await this._serviceProvider.services.SystemService.Reset();
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
    this._profile = await this._serviceProvider.services.ProfileService.RecoverProfile({ seedPhrase });
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
    const stream = await this._serviceProvider.services.ProfileService.CreateInvitation();
    return this.createInvitationRequest({ stream });
  }

  /**
   * Joins an existing identity HALO by invitation.
   * Used to authorize another device of the same user.
   * The Invitation flow requires the inviter device and invitee device to be online at the same time.
   * The invitation flow is protected by a generated pin code.
   *
   * To be used with `client.halo.createHaloInvitation` on the inviter side.
   *
   * @returns An async function to provide secret and finishing the invitation process.
  */
  acceptInvitation (invitationDescriptor: InvitationDescriptor): Invitation {
    const [getInvitationProcess, resolveInvitationProcess] = trigger<RedeemedInvitation>();
    const [waitForFinish, resolveFinish] = trigger<void>();

    const invitationProcessStream = this._serviceProvider.services.ProfileService.AcceptInvitation(invitationDescriptor.toProto());

    invitationProcessStream.subscribe(async process => {
      resolveInvitationProcess(process);

      if (process.state === InvitationState.SUCCESS) {
        assert(process.partyKey);
        await this._profileChanged.waitForCondition(() => !!this.profile?.publicKey);

        resolveFinish();
      } else if (process.state === InvitationState.ERROR) {
        assert(process.error);
        const error = new Error(process.error);
        // TODO(dmaretskyi): Should result in an error inside the returned Invitation, rejecting the promise in Invitation.wait().
        throwUnhandledRejection(error);
      }
    }, error => {
      if (error && !(error instanceof RpcClosedError)) {
        // TODO(dmaretskyi): Should reuslt in an error inside the returned Invitation, rejecting the promise in Invitation.wait().
        throwUnhandledRejection(error);
      }
    });

    const authenticate = async (secret: Uint8Array) => {
      if (invitationDescriptor.type === InvitationDescriptorType.OFFLINE) {
        throw new Error('Cannot authenticate offline invitation.');
      }

      const invitationProcess = await getInvitationProcess();

      await this._serviceProvider.services.ProfileService.AuthenticateInvitation({
        processId: invitationProcess.id,
        secret
      });
    };

    if (invitationDescriptor.secret && invitationDescriptor.type === InvitationDescriptorType.INTERACTIVE) {
      void authenticate(invitationDescriptor.secret);
    }

    return new Invitation(
      invitationDescriptor,
      waitForFinish(),
      authenticate
    );
  }

  /**
   * Allocate resources and set-up internal subscriptions.
   *
   * @internal
   */
  _open () {
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
   * @internal
   */
  _close () {
    this._subscriptions.unsubscribe();
  }
}
