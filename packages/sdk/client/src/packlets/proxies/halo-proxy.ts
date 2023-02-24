//
// Copyright 2021 DXOS.org
//

import assert from 'node:assert';
import { inspect } from 'node:util';

import {
  asyncTimeout,
  Event,
  EventSubscriptions,
  observableError,
  ObservableProvider,
  Trigger,
  UnsubscribeCallback
} from '@dxos/async';
import {
  AuthenticatingInvitationObservable,
  CancellableInvitationObservable,
  ClientServicesProvider,
  DeviceInvitationsProxy,
  InvitationsOptions
} from '@dxos/client-services';
import { inspectObject } from '@dxos/debug';
import { ApiError } from '@dxos/errors';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { Contact, Device, DeviceKind, Identity, Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { Credential, Presentation, ProfileDocument } from '@dxos/protocols/proto/dxos/halo/credentials';

/**
 * TODO(burdon): Public API (move comments here).
 */
export interface Halo {
  get identity(): Identity | undefined;
  get device(): Device | undefined;
  get invitations(): CancellableInvitationObservable[];

  createIdentity(options?: ProfileDocument): Promise<Identity>;
  recoverIdentity(recoveryKey: Uint8Array): Promise<Identity>;
  subscribeIdentity(callback: (identity: Identity) => void): UnsubscribeCallback;

  getDevices(): Device[];
  subscribeDevices(callback: (devices: Device[]) => void): UnsubscribeCallback;

  getContacts(): Contact[];
  subscribeContacts(callback: (contacts: Contact[]) => void): UnsubscribeCallback;

  createInvitation(): CancellableInvitationObservable;
  removeInvitation(id: string): void;
  acceptInvitation(invitation: Invitation): AuthenticatingInvitationObservable;
}

const THROW_TIMEOUT_ERROR_AFTER = 3000;

export class HaloProxy implements Halo {
  private readonly _subscriptions = new EventSubscriptions();
  private readonly _devicesChanged = new Event<Device[]>();
  private readonly _contactsChanged = new Event<Contact[]>();
  public readonly invitationsUpdate = new Event<CancellableInvitationObservable | void>();
  public readonly identityChanged = new Event(); // TODO(burdon): Move into Identity object.

  private _invitations: CancellableInvitationObservable[] = [];
  private _invitationProxy?: DeviceInvitationsProxy;

  private _identity?: Identity;
  private _devices: Device[] = [];
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
      key: this._identity?.identityKey.truncate()
    };
  }

  /**
   * User identity info.
   */
  get identity(): Identity | undefined {
    return this._identity;
  }

  get device(): Device | undefined {
    return this._devices.find((device) => device.kind === DeviceKind.CURRENT);
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
    const gotIdentity = this.identityChanged.waitForCount(1);
    // const gotContacts = this._contactsChanged.waitForCount(1);

    assert(this._serviceProvider.services.DeviceInvitationsService, 'DeviceInvitationsService not available');
    this._invitationProxy = new DeviceInvitationsProxy(this._serviceProvider.services.DeviceInvitationsService);

    assert(this._serviceProvider.services.IdentityService, 'IdentityService not available');
    const identityStream = this._serviceProvider.services.IdentityService.queryIdentity();
    identityStream.subscribe((data) => {
      this._identity = data.identity;
      this.identityChanged.emit();
    });

    assert(this._serviceProvider.services.DevicesService, 'DevicesService not available');
    const devicesStream = this._serviceProvider.services.DevicesService.queryDevices();
    devicesStream.subscribe((data) => {
      if (data.devices) {
        this._devices = data.devices;
        this._devicesChanged.emit(this._devices);
      }
    });

    this._subscriptions.add(() => identityStream.close());

    // const contactsStream = this._serviceProvider.services.HaloService.subscribeContacts();
    // contactsStream.subscribe(data => {
    //   this._contacts = data.contacts as SpaceMember[];
    //   this._contactsChanged.emit();
    // });

    // this._subscriptions.add(() => contactsStream.close());

    await Promise.all([gotIdentity]);
  }

  /**
   * Destroy the instance and clean-up subscriptions.
   */
  async close() {
    this._subscriptions.clear();
    this._invitationProxy = undefined;
    this._identity = undefined;
    this._contacts = [];
  }

  /**
   * Create Identity.
   * Then initializes profile with given display name.
   */
  async createIdentity(profile = {}): Promise<Identity> {
    assert(this._serviceProvider.services.IdentityService, 'IdentityService not available');
    this._identity = await this._serviceProvider.services.IdentityService.createIdentity(profile);

    return this._identity;
  }

  async recoverIdentity(recoveryKey: Uint8Array): Promise<Identity> {
    assert(this._serviceProvider.services.IdentityService, 'IdentityService not available');
    this._identity = await this._serviceProvider.services.IdentityService.recoverIdentity({ recoveryKey });

    return this._identity;
  }

  subscribeIdentity(callback: (identity: Identity) => void): () => void {
    return this.identityChanged.on(() => callback(this._identity!));
  }

  getDevices(): Device[] {
    return this._devices;
  }

  subscribeDevices(callback: (devices: Device[]) => void): UnsubscribeCallback {
    return this._devicesChanged.on(callback);
  }

  getContacts(): Contact[] {
    return this._contacts;
  }

  subscribeContacts(callback: (contacts: Contact[]) => void): UnsubscribeCallback {
    return this._contactsChanged.on(callback);
  }

  /**
   * Get Halo credentials for the current user.
   */
  // TODO(wittjosiah): Get/Subscribe.
  queryCredentials({ ids, type }: { ids?: PublicKey[]; type?: string } = {}) {
    if (!this._identity) {
      throw new ApiError('Identity is not available.');
    }
    if (!this._serviceProvider.services.SpacesService) {
      throw new ApiError('SpacesService is not available.');
    }
    const stream = this._serviceProvider.services.SpacesService.queryCredentials({
      spaceKey: this._identity.spaceKey!
    });
    this._subscriptions.add(() => stream.close());

    const observable = new ObservableProvider<
      { onUpdate: (credentials: Credential[]) => void; onError: (error?: Error) => void },
      Credential[]
    >();
    const credentials: Credential[] = [];

    stream.subscribe(
      (credential) => {
        credentials.push(credential);
        const newCredentials = credentials
          .filter((c) => !ids || (c.id && ids.some((id) => id.equals(c.id!))))
          .filter((c) => !type || c.subject.assertion['@type'] === type);
        if (
          newCredentials.length !== observable.value?.length ||
          !newCredentials.every(
            (credential, index) =>
              credential.id && observable.value![index] && credential.id.equals(observable.value![index].id!)
          )
        ) {
          observable.setValue(newCredentials);
          observable.callback.onUpdate(newCredentials);
        }
      },
      (err) => {
        if (err) {
          observableError(observable, err);
        }
      }
    );

    return observable;
  }

  /**
   * Initiates device invitation.
   */
  createInvitation(options?: InvitationsOptions) {
    if (!this.opened) {
      throw new ApiError('Client not open.');
    }

    log('create invitation', options);
    const invitation = this._invitationProxy!.createInvitation(undefined, options);
    this._invitations = [...this._invitations, invitation];

    const unsubscribe = invitation.subscribe({
      onConnecting: () => {
        this.invitationsUpdate.emit(invitation);
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
  removeInvitation(id: string) {
    log('remove invitation', { id });
    const index = this._invitations.findIndex((invitation) => invitation.invitation?.invitationId === id);
    void this._invitations[index]?.cancel();
    this._invitations = [...this._invitations.slice(0, index), ...this._invitations.slice(index + 1)];
    this.invitationsUpdate.emit();
  }

  /**
   * Initiates accepting invitation.
   */
  acceptInvitation(invitation: Invitation, options?: InvitationsOptions) {
    if (!this.opened) {
      throw new ApiError('Client not open.');
    }

    log('accept invitation', options);
    return this._invitationProxy!.acceptInvitation(invitation, options);
  }

  /**
   * Write credentials to halo profile.
   */
  async writeCredentials(credentials: Credential[]) {
    if (!this._identity) {
      throw new ApiError('Identity is not available.');
    }
    if (!this._serviceProvider.services.SpacesService) {
      throw new ApiError('SpacesService is not available.');
    }
    return this._serviceProvider.services.SpacesService.writeCredentials({
      spaceKey: this._identity.spaceKey!,
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
    const trigger = new Trigger<Credential[]>();
    this.queryCredentials({ ids }).subscribe({
      onUpdate: (credentials) => {
        if (
          credentials.every((credential) => ids.some((id) => id.equals(credential.id!))) &&
          ids.every((id) => credentials.some((credential) => id.equals(credential.id!)))
        ) {
          trigger.wake(credentials);
        }
      },
      onError: (err) => {
        log.catch(err);
      }
    });

    const credentials = await asyncTimeout(
      trigger.wait(),
      THROW_TIMEOUT_ERROR_AFTER,
      new ApiError('Timeout while waiting for credentials')
    );
    return this._serviceProvider.services.IdentityService.signPresentation({
      presentation: {
        credentials
      },
      nonce
    });
  }
}
