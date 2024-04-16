//
// Copyright 2021 DXOS.org
//

import { inspect } from 'node:util';

import {
  asyncTimeout,
  Event,
  EventSubscriptions,
  MulticastObservable,
  observableError,
  ObservableProvider,
  Trigger,
} from '@dxos/async';
import { AUTH_TIMEOUT, type ClientServicesProvider, type Halo } from '@dxos/client-protocol';
import { inspectObject } from '@dxos/debug';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { ApiError, trace as Trace } from '@dxos/protocols';
import {
  type Contact,
  type Device,
  DeviceKind,
  type Identity,
  Invitation,
} from '@dxos/protocols/proto/dxos/client/services';
import {
  type Credential,
  type Presentation,
  type ProfileDocument,
  type DeviceProfileDocument,
} from '@dxos/protocols/proto/dxos/halo/credentials';
import { trace } from '@dxos/tracing';

import { InvitationsProxy } from '../invitations';

@trace.resource()
export class HaloProxy implements Halo {
  private readonly _instanceId = PublicKey.random().toHex();

  private readonly _subscriptions = new EventSubscriptions();
  private readonly _identityChanged = new Event<Identity | null>(); // TODO(burdon): Move into Identity object.
  private readonly _devicesChanged = new Event<Device[]>();
  private readonly _contactsChanged = new Event<Contact[]>();

  private readonly _identity = MulticastObservable.from(this._identityChanged, null);
  private readonly _devices = MulticastObservable.from(this._devicesChanged, []);
  private readonly _contacts = MulticastObservable.from(this._contactsChanged, []);
  private _invitationProxy?: InvitationsProxy;

  constructor(
    private readonly _serviceProvider: ClientServicesProvider,
    /**
     * @internal
     */
    public _traceParent?: string,
  ) {}

  [inspect.custom]() {
    return inspectObject(this);
  }

  @trace.info({ depth: null })
  toJSON() {
    return {
      identityKey: this._identity.get()?.identityKey.truncate(),
      deviceKey: this.device?.deviceKey.truncate(),
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
    invariant(this._invitationProxy, 'HaloProxy not opened');
    return this._invitationProxy.created;
  }

  // TODO(burdon): Standardize isOpen, etc.
  @trace.info()
  get opened() {
    return this._invitationProxy !== undefined;
  }

  /**
   * Allocate resources and set-up internal subscriptions.
   *
   * @internal
   */
  async _open() {
    log.trace('dxos.sdk.halo-proxy.open', Trace.begin({ id: this._instanceId, parentId: this._traceParent }));
    const gotIdentity = this._identityChanged.waitForCount(1);
    // const gotContacts = this._contactsChanged.waitForCount(1);

    invariant(this._serviceProvider.services.InvitationsService, 'InvitationsService not available');
    this._invitationProxy = new InvitationsProxy(
      this._serviceProvider.services.InvitationsService,
      this._serviceProvider.services.IdentityService,
      () => ({
        kind: Invitation.Kind.DEVICE,
      }),
    );
    await this._invitationProxy.open();

    invariant(this._serviceProvider.services.IdentityService, 'IdentityService not available');
    const identityStream = this._serviceProvider.services.IdentityService.queryIdentity();
    identityStream.subscribe((data) => {
      // Set tracing identity. For early stage debugging.
      data.identity &&
        log.trace('dxos.halo.identity', {
          identityKey: data.identity.identityKey,
          displayName: data.identity.profile?.displayName,
        });
      this._identityChanged.emit(data.identity ?? null);
    });
    this._subscriptions.add(() => identityStream.close());

    invariant(this._serviceProvider.services.DevicesService, 'DevicesService not available');
    const devicesStream = this._serviceProvider.services.DevicesService.queryDevices();
    devicesStream.subscribe((data) => {
      if (data.devices) {
        this._devicesChanged.emit(data.devices);
        const current = data.devices.find((device) => device.kind === DeviceKind.CURRENT);
        log.trace('dxos.halo.device', {
          deviceKey: current?.deviceKey,
          profile: current?.profile,
        });
      }
    });
    this._subscriptions.add(() => devicesStream.close());

    // const contactsStream = this._serviceProvider.services.HaloService.subscribeContacts();
    // contactsStream.subscribe(data => {
    //   this._contacts = data.contacts as SpaceMember[];
    //   this._contactsChanged.emit();
    // });
    // this._subscriptions.add(() => contactsStream.close());
    // TODO(nf): trigger automatically? feedback on how many were resumed?

    log.trace('dxos.sdk.halo-proxy.open', Trace.end({ id: this._instanceId }));
    await Promise.all([gotIdentity]);
  }

  /**
   * Destroy the instance and clean-up subscriptions.
   *
   * @internal
   */
  async _close() {
    await this._invitationProxy?.close();
    this._invitationProxy = undefined;
    this._subscriptions.clear();
    this._identityChanged.emit(null);
    this._devicesChanged.emit([]);
    this._contactsChanged.emit([]);
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
   * @param profile - optional display name
   * @param deviceProfile - optional device profile that will be merged with defaults
   */
  async createIdentity(profile: ProfileDocument = {}, deviceProfile?: DeviceProfileDocument): Promise<Identity> {
    invariant(this._serviceProvider.services.IdentityService, 'IdentityService not available');
    const deviceProfileWithDefaults = {
      ...deviceProfile,
      ...(deviceProfile?.label ? { label: deviceProfile.label } : { label: 'initial identity device' }),
    };
    const identity = await this._serviceProvider.services.IdentityService.createIdentity({
      profile,
      deviceProfile: deviceProfileWithDefaults,
    });
    this._identityChanged.emit(identity);
    return identity;
  }

  async recoverIdentity(recoveryKey: Uint8Array): Promise<Identity> {
    invariant(this._serviceProvider.services.IdentityService, 'IdentityService not available');
    const identity = await this._serviceProvider.services.IdentityService.recoverIdentity({ recoveryKey });
    this._identityChanged.emit(identity);
    return identity;
  }

  async updateProfile(profile: ProfileDocument): Promise<Identity> {
    invariant(this._serviceProvider.services.IdentityService, 'IdentityService not available');
    const identity = await this._serviceProvider.services.IdentityService.updateProfile(profile);
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
      spaceKey: identity.spaceKey!,
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
              credential.id && observable.value![index] && credential.id.equals(observable.value![index].id!),
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
      },
    );

    return observable;
  }

  /**
   * Initiates device invitation.
   */
  share(options?: Partial<Invitation>) {
    if (!this.opened) {
      throw new ApiError('Client not open.');
    }

    log('create invitation', { options });
    const invitation = this._invitationProxy!.share(options);
    return invitation;
  }

  /**
   * Initiates accepting invitation.
   * @param invitation
   * @param deviceProfile - optional device profile that will be merged with defaults
   */
  join(invitation: Invitation | string, deviceProfile?: DeviceProfileDocument) {
    if (!this.opened) {
      throw new ApiError('Client not open.');
    }

    const deviceProfileWithDefaults = {
      ...deviceProfile,
      ...(deviceProfile?.label ? { label: deviceProfile.label } : { label: 'additional device' }),
    };
    return this._invitationProxy!.join(invitation, deviceProfileWithDefaults);
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
      credentials,
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
      },
    });

    const credentials = await asyncTimeout(
      trigger.wait(),
      AUTH_TIMEOUT,
      new ApiError('Timeout while waiting for credentials'),
    );
    return this._serviceProvider.services.IdentityService.signPresentation({
      presentation: {
        credentials,
      },
      nonce,
    });
  }
}
