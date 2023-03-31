//
// Copyright 2021 DXOS.org
//

import assert from 'node:assert';
import { inspect } from 'node:util';

import {
  asyncTimeout,
  Event,
  EventSubscriptions,
  MulticastObservable,
  observableError,
  ObservableProvider,
  Trigger
} from '@dxos/async';
import { inspectObject } from '@dxos/debug';
import { ApiError } from '@dxos/errors';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { trace } from '@dxos/protocols';
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

  createIdentity(options?: ProfileDocument): Promise<Identity>;
  recoverIdentity(recoveryKey: Uint8Array): Promise<Identity>;

  createInvitation(): CancellableInvitationObservable;
  removeInvitation(id: string): void;
  acceptInvitation(invitation: Invitation): AuthenticatingInvitationObservable;
}

const THROW_TIMEOUT_ERROR_AFTER = 3000;

export class HaloProxy implements Halo {
  private readonly _subscriptions = new EventSubscriptions();
  private readonly _devicesChanged = new Event<Device[]>();
  private readonly _contactsChanged = new Event<Contact[]>();
  private readonly _invitationsUpdate = new Event<CancellableInvitationObservable[]>();
  private readonly _identityChanged = new Event<Identity | null>(); // TODO(burdon): Move into Identity object.

  private _invitationProxy?: DeviceInvitationsProxy;

  private _identity = MulticastObservable.from(this._identityChanged, null);
  private _devices = MulticastObservable.from(this._devicesChanged, []);
  private _contacts = MulticastObservable.from(this._contactsChanged, []);
  private _invitations = MulticastObservable.from(this._invitationsUpdate, []);
  private readonly _instanceId = PublicKey.random().toHex();

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
  get identity() {
    return this._identity;
  }

  get devices() {
    return this._devices;
  }

  get device() {
    return this._devices.get().find((device) => device.kind === DeviceKind.CURRENT);
  }

  get contacts() {
    return this._contacts;
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
   *
   * @internal
   */
  async _open() {
    log.trace('dxos.sdk.halo-proxy', trace.begin({ id: this._instanceId }));
    const gotIdentity = this._identityChanged.waitForCount(1);
    // const gotContacts = this._contactsChanged.waitForCount(1);

    assert(this._serviceProvider.services.DeviceInvitationsService, 'DeviceInvitationsService not available');
    this._invitationProxy = new DeviceInvitationsProxy(this._serviceProvider.services.DeviceInvitationsService);

    assert(this._serviceProvider.services.IdentityService, 'IdentityService not available');
    const identityStream = this._serviceProvider.services.IdentityService.queryIdentity();
    identityStream.subscribe((data) => {
      this._identityChanged.emit(data.identity ?? null);
    });

    assert(this._serviceProvider.services.DevicesService, 'DevicesService not available');
    const devicesStream = this._serviceProvider.services.DevicesService.queryDevices();
    devicesStream.subscribe((data) => {
      if (data.devices) {
        this._devicesChanged.emit(data.devices);
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
   *
   * @internal
   */
  async _close() {
    this._subscriptions.clear();
    this._invitationProxy = undefined;
    this._identityChanged.emit(null);
    this._devicesChanged.emit([]);
    this._contactsChanged.emit([]);
    this._invitationsUpdate.emit([]);
    log.trace('dxos.sdk.halo-proxy', trace.end({ id: this._instanceId }));
  }

  /**
   * @internal
   */
  // TODO(wittjosiah): Should `Observable` class support this?
  _waitForIdentity() {
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
   * Get Halo credentials for the current user.
   */
  // TODO(wittjosiah): Get/Subscribe.
  queryCredentials({ ids, type }: { ids?: PublicKey[]; type?: string } = {}) {
    const identity = this._identity.get();
    if (!identity) {
      throw new ApiError('Identity is not available.');
    }
    if (!this._serviceProvider.services.SpacesService) {
      throw new ApiError('SpacesService is not available.');
    }
    const stream = this._serviceProvider.services.SpacesService.queryCredentials({
      spaceKey: identity.spaceKey!
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
    this._invitationsUpdate.emit([...this._invitations.get(), invitation]);

    return invitation;
  }

  /**
   * Removes device invitation.
   */
  removeInvitation(id: string) {
    log('remove invitation', { id });
    const invitations = this._invitations.get();
    const index = invitations.findIndex((invitation) => invitation.get().invitationId === id);
    void invitations[index]?.cancel();
    this._invitationsUpdate.emit([...invitations.slice(0, index), ...invitations.slice(index + 1)]);
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
