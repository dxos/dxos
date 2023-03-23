//
// Copyright 2021 DXOS.org
//

import assert from 'node:assert';
import { inspect } from 'node:util';

import { Event, EventSubscriptions, MulticastObservable } from '@dxos/async';
import { inspectObject } from '@dxos/debug';
import { ApiError } from '@dxos/errors';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { Contact, Device, DeviceKind, Identity, Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { Credential, Presentation, ProfileDocument } from '@dxos/protocols/proto/dxos/halo/credentials';

import { ClientServicesProvider } from '../client';
import {
  AuthenticatingInvitationObservable,
  CancellableInvitationObservable,
  DeviceInvitationsProxy,
  InvitationsOptions
} from '../invitations';

/**
 * TODO(burdon): Public API (move comments here).
 */
export interface Halo {
  get identity(): MulticastObservable<Identity | null>;
  get devices(): MulticastObservable<Device[]>;
  get device(): Device | undefined;
  get contacts(): MulticastObservable<Contact[]>;
  get invitations(): MulticastObservable<CancellableInvitationObservable[]>;
  get credentials(): MulticastObservable<Credential[]>;

  createIdentity(options?: ProfileDocument): Promise<Identity>;
  recoverIdentity(recoveryKey: Uint8Array): Promise<Identity>;

  createInvitation(): CancellableInvitationObservable;
  removeInvitation(id: string): void;
  acceptInvitation(invitation: Invitation): AuthenticatingInvitationObservable;

  writeCredentials(credentials: Credential[]): Promise<void>;
  presentCredentials({ ids, nonce }: { ids: PublicKey[]; nonce?: Uint8Array }): Promise<Presentation>;
}

export class HaloProxy implements Halo {
  private readonly _subscriptions = new EventSubscriptions();
  private readonly _devicesChanged = new Event<Device[]>();
  private readonly _contactsChanged = new Event<Contact[]>();
  private readonly _invitationsUpdate = new Event<CancellableInvitationObservable[]>();
  private readonly _identityChanged = new Event<Identity | null>(); // TODO(burdon): Move into Identity object.
  private readonly _credentialsChanged = new Event<Credential[]>();

  private _invitationProxy?: DeviceInvitationsProxy;

  private _identity = MulticastObservable.from(this._identityChanged, null);
  private _devices = MulticastObservable.from(this._devicesChanged, []);
  private _contacts = MulticastObservable.from(this._contactsChanged, []);
  private _invitations = MulticastObservable.from(this._invitationsUpdate, []);
  private _credentials = MulticastObservable.from(this._credentialsChanged, []);

  // prettier-ignore
  constructor(
    private readonly _serviceProvider: ClientServicesProvider
  ) {}

  [inspect.custom]() {
    return inspectObject(this);
  }

  toJSON() {
    return {
      identityKey: this._identity.get()?.identityKey.truncate(),
      deviceKey: this.device?.deviceKey.truncate()
    };
  }

  /**
   * User identity info.
   */
  get identity(): MulticastObservable<Identity | null> {
    return this._identity;
  }

  get devices(): MulticastObservable<Device[]> {
    return this._devices;
  }

  get device(): Device | undefined {
    return this._devices.get().find((device) => device.kind === DeviceKind.CURRENT);
  }

  get contacts(): MulticastObservable<Contact[]> {
    return this._contacts;
  }

  get invitations(): MulticastObservable<CancellableInvitationObservable[]> {
    return this._invitations;
  }

  get credentials(): MulticastObservable<Credential[]> {
    return this._credentials;
  }

  // TODO(burdon): Standardize isOpen, etc.
  get opened(): boolean {
    return this._invitationProxy !== undefined;
  }

  /**
   * Allocate resources and set-up internal subscriptions.
   *
   * @internal
   */
  async _open(): Promise<void> {
    const gotIdentity = this._identityChanged.waitForCount(1);
    // const gotContacts = this._contactsChanged.waitForCount(1);

    assert(this._serviceProvider.services.DeviceInvitationsService, 'DeviceInvitationsService not available');
    this._invitationProxy = new DeviceInvitationsProxy(this._serviceProvider.services.DeviceInvitationsService);

    assert(this._serviceProvider.services.IdentityService, 'IdentityService not available');
    const identityStream = this._serviceProvider.services.IdentityService.queryIdentity();
    this._subscriptions.add(() => identityStream.close());
    identityStream.subscribe((data) => {
      this._identityChanged.emit(data.identity ?? null);

      if (data.identity?.spaceKey) {
        assert(this._serviceProvider.services.SpacesService, 'SpacesService not available');
        const credentialsStream = this._serviceProvider.services.SpacesService.queryCredentials({
          spaceKey: data.identity.spaceKey
        });
        this._subscriptions.add(() => credentialsStream.close());
        credentialsStream.subscribe((credential) => {
          const newCredentials = [...this._credentials.get(), credential];
          this._credentialsChanged.emit(newCredentials);
        });
      }
    });

    assert(this._serviceProvider.services.DevicesService, 'DevicesService not available');
    const devicesStream = this._serviceProvider.services.DevicesService.queryDevices();
    this._subscriptions.add(() => devicesStream.close());
    devicesStream.subscribe((data) => {
      if (data.devices) {
        this._devicesChanged.emit(data.devices);
      }
    });

    // const contactsStream = this._serviceProvider.services.HaloService.subscribeContacts();
    // this._subscriptions.add(() => contactsStream.close());
    // contactsStream.subscribe(data => {
    //   this._contacts = data.contacts as SpaceMember[];
    //   this._contactsChanged.emit();
    // });

    await Promise.all([gotIdentity]);
  }

  /**
   * Destroy the instance and clean-up subscriptions.
   *
   * @internal
   */
  async _close(): Promise<void> {
    this._subscriptions.clear();
    this._invitationProxy = undefined;
    this._identityChanged.emit(null);
    this._devicesChanged.emit([]);
    this._contactsChanged.emit([]);
    this._invitationsUpdate.emit([]);
  }

  /**
   * @internal
   */
  // TODO(wittjosiah): Should `Observable` class support this?
  _waitForIdentity(): Promise<void> {
    return this._identityChanged.waitForCondition(() => !!this._identity.get());
  }

  /**
   * Create Identity.
   * Then initializes profile with given display name.
   */
  async createIdentity(profile = {}): Promise<Identity> {
    assert(this._serviceProvider.services.IdentityService, 'IdentityService not available');
    const identity = await this._serviceProvider.services.IdentityService.createIdentity(profile);
    this._identityChanged.emit(identity);

    return identity;
  }

  async recoverIdentity(recoveryKey: Uint8Array): Promise<Identity> {
    assert(this._serviceProvider.services.IdentityService, 'IdentityService not available');
    const identity = await this._serviceProvider.services.IdentityService.recoverIdentity({ recoveryKey });
    this._identityChanged.emit(identity);

    return identity;
  }

  /**
   * Initiates device invitation.
   */
  createInvitation(options?: InvitationsOptions): CancellableInvitationObservable {
    if (!this.opened) {
      throw new ApiError('Client not open.');
    }

    log('create invitation', options);
    const invitation = this._invitationProxy!.createInvitation(undefined, options);

    const unsubscribe = invitation.subscribe({
      onConnecting: () => {
        this._invitationsUpdate.emit([...this._invitations.get(), invitation]);
        unsubscribe();
      },
      onCancelled: () => {
        unsubscribe();
      },
      onSuccess: () => {
        unsubscribe();
      },
      onError: function (err: any): void {
        unsubscribe();
      }
    });

    return invitation;
  }

  /**
   * Removes device invitation.
   */
  removeInvitation(id: string): void {
    log('remove invitation', { id });
    const invitations = this._invitations.get();
    const index = invitations.findIndex((invitation) => invitation.invitation?.invitationId === id);
    void invitations[index]?.cancel();
    this._invitationsUpdate.emit([...invitations.slice(0, index), ...invitations.slice(index + 1)]);
  }

  /**
   * Initiates accepting invitation.
   */
  acceptInvitation(invitation: Invitation, options?: InvitationsOptions): AuthenticatingInvitationObservable {
    if (!this.opened) {
      throw new ApiError('Client not open.');
    }

    log('accept invitation', options);
    return this._invitationProxy!.acceptInvitation(invitation, options);
  }

  /**
   * Write credentials to halo profile.
   */
  async writeCredentials(credentials: Credential[]): Promise<void> {
    const identity = this._identity.get();
    if (!identity) {
      throw new ApiError('Identity is not available.');
    }
    if (!this._serviceProvider.services.SpacesService) {
      throw new ApiError('SpacesService is not available.');
    }

    return this._serviceProvider.services.SpacesService.writeCredentials({
      spaceKey: identity.spaceKey!,
      credentials
    });
  }

  /**
   * Present Credentials.
   */
  async presentCredentials({ ids, nonce }: { ids: PublicKey[]; nonce?: Uint8Array }): Promise<Presentation> {
    if (!this._serviceProvider.services.IdentityService) {
      throw new ApiError('IdentityService is not available.');
    }
    const credentials = this._credentials.get().filter((credential) => ids.some((id) => id.equals(credential.id!)));

    return this._serviceProvider.services.IdentityService.signPresentation({
      presentation: {
        credentials
      },
      nonce
    });
  }
}
