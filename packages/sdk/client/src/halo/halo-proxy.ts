//
// Copyright 2021 DXOS.org
//

import { inspect } from 'node:util';

import { Event, MulticastObservable, SubscriptionList, Trigger, asyncTimeout } from '@dxos/async';
import { AUTH_TIMEOUT, type ClientServicesProvider, type Halo } from '@dxos/client-protocol';
import type { Stream } from '@dxos/codec-protobuf/stream';
import { getCredentialAssertion } from '@dxos/credentials';
import { inspectObject } from '@dxos/debug';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { ApiError, trace as Trace } from '@dxos/protocols';
import { EMPTY, toPublicKey } from '@dxos/protocols/buf';
import { type Invitation, Invitation_Kind } from '@dxos/protocols/buf/dxos/client/invitation_pb';
import {
  type Contact,
  type ContactBook,
  type Device,
  DeviceKind,
  type Identity,
  type QueryDevicesResponse,
  type QueryIdentityResponse,
} from '@dxos/protocols/buf/dxos/client/services_pb';
import {
  type Credential,
  type DeviceProfileDocument,
  type Presentation,
  type ProfileDocument,
} from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { trace } from '@dxos/tracing';

import { RPC_TIMEOUT } from '../common';
import { InvitationsProxy } from '../invitations';

@trace.resource()
export class HaloProxy implements Halo {
  private readonly _instanceId = PublicKey.random().toHex();

  /** Subscriptions for overall lifecycle (reconnected event listener). */
  private readonly _subscriptions = new SubscriptionList();
  /** Subscriptions for RPC streams that need to be re-established on reconnect. */
  private readonly _streamSubscriptions = new SubscriptionList();

  private readonly _identityChanged = new Event<Identity | null>(); // TODO(burdon): Move into Identity object.
  private readonly _devicesChanged = new Event<Device[]>();
  private readonly _contactsChanged = new Event<Contact[]>();
  private readonly _credentialsChanged = new Event<Credential[]>();

  private readonly _identity = MulticastObservable.from(this._identityChanged, null);
  private readonly _devices = MulticastObservable.from(this._devicesChanged, []);
  private readonly _contacts = MulticastObservable.from(this._contactsChanged, []);
  private readonly _credentials = MulticastObservable.from(this._credentialsChanged, []);
  private _invitationProxy?: InvitationsProxy;

  private _haloCredentialStream?: Stream<Credential>;

  constructor(
    private readonly _serviceProvider: ClientServicesProvider,
    /**
     * @internal
     */
    public _traceParent?: string,
  ) {}

  [inspect.custom](): string {
    return inspectObject(this);
  }

  @trace.info({ depth: null })
  toJSON(): { identityKey: string | undefined; deviceKey: string | undefined } {
    const identity = this._identity.get();
    const dev = this.device;
    return {
      identityKey: identity?.identityKey ? toPublicKey(identity.identityKey).truncate() : undefined,
      deviceKey: dev?.deviceKey ? toPublicKey(dev.deviceKey).truncate() : undefined,
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

  get credentials() {
    return this._credentials;
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
  async _open(): Promise<void> {
    log.trace('dxos.sdk.halo-proxy.open', Trace.begin({ id: this._instanceId, parentId: this._traceParent }));
    const gotIdentity = this._identityChanged.waitForCount(1);
    // const gotContacts = this._contactsChanged.waitForCount(1);

    // Register reconnection callback to re-establish streams.
    // This is called before `reconnected` event fires, ensuring streams are ready.
    this._serviceProvider.onReconnect?.(async () => {
      log('reconnected, re-establishing streams');
      await this._setupInvitationProxy();
      this._setupStreams();
    });

    // Set up listener for lazy credential stream creation.
    // This listener persists across reconnects; the stream itself is recreated.
    this._subscriptions.add(
      this._identityChanged.on((identity) => {
        if (identity && !this._haloCredentialStream) {
          this._setupCredentialStream(identity);
        }
      }),
    );

    await this._setupInvitationProxy();
    this._setupStreams();

    log.trace('dxos.sdk.halo-proxy.open', Trace.end({ id: this._instanceId }));
    await Promise.all([gotIdentity]);
  }

  /**
   * Set up the invitation proxy. Called on initial open and reconnect.
   */
  private async _setupInvitationProxy(): Promise<void> {
    await this._invitationProxy?.close();
    invariant(this._serviceProvider.services.InvitationsService, 'InvitationsService not available');
    this._invitationProxy = new InvitationsProxy(
      this._serviceProvider.services.InvitationsService!,
      this._serviceProvider.services.IdentityService,
      () => ({
        kind: Invitation_Kind.DEVICE,
      }),
    );
    await this._invitationProxy.open();
  }

  /**
   * Set up the credential stream for the given identity.
   */
  private _setupCredentialStream(identity: Identity): void {
    invariant(this._serviceProvider.services.SpacesService, 'SpacesService not available');
    this._haloCredentialStream = this._serviceProvider.services.SpacesService.queryCredentials(
      {
        spaceKey: identity.spaceKey!,
      },
      { timeout: RPC_TIMEOUT },
    );
    this._haloCredentialStream!.subscribe((data) => {
      this._credentialsChanged.emit([...this._credentials.get(), data]);
    });
    this._streamSubscriptions.add(() => this._haloCredentialStream?.close());
  }

  /**
   * Set up RPC streams. Called on initial open and reconnect.
   */
  private _setupStreams(): void {
    // Clear existing streams.
    this._streamSubscriptions.clear();
    this._haloCredentialStream = undefined;

    // Re-create credential stream if we have an identity.
    const currentIdentity = this._identity.get();
    if (currentIdentity) {
      this._setupCredentialStream(currentIdentity);
    }

    invariant(this._serviceProvider.services.IdentityService, 'IdentityService not available');
    const identityStream = this._serviceProvider.services.IdentityService.queryIdentity(EMPTY, {
      timeout: RPC_TIMEOUT,
    });
    identityStream.subscribe((data: QueryIdentityResponse) => {
      // Set tracing identity. For early stage debugging.
      data.identity &&
        log.trace('dxos.halo.identity', {
          identityKey: data.identity.identityKey,
          displayName: data.identity.profile?.displayName,
        });
      this._identityChanged.emit(data.identity ?? null);
    });
    this._streamSubscriptions.add(() => identityStream.close());

    const contactsStream = this._serviceProvider.services.ContactsService!.queryContacts(EMPTY, {
      timeout: RPC_TIMEOUT,
    });
    contactsStream.subscribe((data: ContactBook) => {
      this._contactsChanged.emit(data.contacts ?? []);
    });
    this._streamSubscriptions.add(() => contactsStream.close());

    invariant(this._serviceProvider.services.DevicesService, 'DevicesService not available');
    const devicesStream = this._serviceProvider.services.DevicesService.queryDevices(EMPTY, {
      timeout: RPC_TIMEOUT,
    });
    devicesStream.subscribe((data: QueryDevicesResponse) => {
      if (data.devices) {
        this._devicesChanged.emit(data.devices);
        const current = data.devices.find((device: Device) => device.kind === DeviceKind.CURRENT);
        log.trace('dxos.halo.device', {
          deviceKey: current?.deviceKey,
          profile: current?.profile,
        });
      }
    });
    this._streamSubscriptions.add(() => devicesStream.close());
  }

  /**
   * Destroy the instance and clean-up subscriptions.
   *
   * @internal
   */
  async _close(): Promise<void> {
    await this._invitationProxy?.close();
    this._invitationProxy = undefined;
    this._streamSubscriptions.clear();
    this._subscriptions.clear();
    this._identityChanged.emit(null);
    this._devicesChanged.emit([]);
    this._contactsChanged.emit([]);
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
   * @param profile - optional display name
   * @param deviceProfile - optional device profile that will be merged with defaults
   */
  async createIdentity(
    profile: ProfileDocument = {} as ProfileDocument,
    deviceProfile?: DeviceProfileDocument,
  ): Promise<Identity> {
    invariant(this._serviceProvider.services.IdentityService, 'IdentityService not available');
    invariant(!this.identity.get(), 'Identity already exists');
    const deviceProfileWithDefaults = {
      ...deviceProfile,
      ...(deviceProfile?.label ? { label: deviceProfile.label } : { label: 'initial identity device' }),
    } as DeviceProfileDocument;
    const identity = await this._serviceProvider.services.IdentityService.createIdentity(
      {
        profile,
        deviceProfile: deviceProfileWithDefaults,
      },
      { timeout: RPC_TIMEOUT },
    );
    this._identityChanged.emit(identity);
    return identity;
  }

  async recoverIdentity(args: { recoveryCode: string }): Promise<Identity> {
    invariant(this._serviceProvider.services.IdentityService, 'IdentityService not available');
    const identity = await this._serviceProvider.services.IdentityService.recoverIdentity(args, {
      timeout: RPC_TIMEOUT,
    });
    this._identityChanged.emit(identity);
    return identity;
  }

  async updateProfile(profile: ProfileDocument): Promise<Identity> {
    invariant(this._serviceProvider.services.IdentityService, 'IdentityService not available');
    const identity = await this._serviceProvider.services.IdentityService.updateProfile(profile, {
      timeout: RPC_TIMEOUT,
    });
    this._identityChanged.emit(identity);
    return identity;
  }

  /**
   * Get Halo credentials for the current user.
   * Note: Will return an empty result if called before all credentials have been loaded.
   */
  queryCredentials({ ids, type }: { ids?: PublicKey[]; type?: string } = {}): Credential[] {
    return this._credentials.get().filter((credential) => {
      if (ids && !ids.some((id) => id.equals(toPublicKey(credential.id!)))) {
        return false;
      }
      if (type && getCredentialAssertion(credential)['@type'] !== type) {
        return false;
      }
      return true;
    });
  }

  /**
   * Initiates device invitation.
   */
  share(options?: Partial<Invitation>) {
    if (!this.opened) {
      throw new ApiError({ message: 'Client not open.' });
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
      throw new ApiError({ message: 'Client not open.' });
    }

    const deviceProfileWithDefaults = {
      ...deviceProfile,
      ...(deviceProfile?.label ? { label: deviceProfile.label } : { label: 'additional device' }),
    } as DeviceProfileDocument;
    return this._invitationProxy!.join(invitation, deviceProfileWithDefaults);
  }

  /**
   * Write credentials to halo profile.
   */
  async writeCredentials(credentials: Credential[]): Promise<void> {
    const identity = this._identity.get();
    if (!identity) {
      throw new ApiError({ message: 'Identity is not available.' });
    }
    if (!this._serviceProvider.services.SpacesService) {
      throw new ApiError({ message: 'SpacesService is not available.' });
    }

    return this._serviceProvider.services.SpacesService.writeCredentials(
      {
        spaceKey: identity.spaceKey!,
        credentials,
      },
      { timeout: RPC_TIMEOUT },
    );
  }

  /**
   * Present Credentials.
   */
  // TODO(burdon): Rename createPresentation?
  async presentCredentials({ ids, nonce }: { ids: PublicKey[]; nonce?: Uint8Array }): Promise<Presentation> {
    if (!this._serviceProvider.services.IdentityService) {
      throw new ApiError({ message: 'IdentityService is not available.' });
    }
    const trigger = new Trigger<Credential[]>();

    this._credentials.subscribe((credentials) => {
      const credentialsToPresent = credentials.filter((credential) =>
        ids.some((id) => id.equals(toPublicKey(credential.id!))),
      );
      if (credentialsToPresent.length === ids.length) {
        trigger.wake(credentialsToPresent);
      }
    });

    const credentials = await asyncTimeout(
      trigger.wait(),
      AUTH_TIMEOUT,
      new ApiError({ message: 'Timeout while waiting for credentials.' }),
    );
    return this._serviceProvider.services.IdentityService.signPresentation(
      {
        presentation: {
          credentials,
        },
        nonce,
      },
      { timeout: RPC_TIMEOUT },
    );
  }
}
