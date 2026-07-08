//
// Copyright 2021 DXOS.org
//

import * as Runtime from 'effect/Runtime';
import { inspect } from 'node:util';

import { Event, MulticastObservable, SubscriptionList, Trigger, asyncTimeout } from '@dxos/async';
import { AUTH_TIMEOUT, type ClientServicesProvider, type Halo } from '@dxos/client-protocol';
import { Context } from '@dxos/context';
import { inspectObject } from '@dxos/debug';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { ApiError, runServiceCall, subscribeStream } from '@dxos/protocols';
import {
  type Contact,
  type Device,
  DeviceKind,
  type Identity,
  Invitation,
} from '@dxos/protocols/proto/dxos/client/services';
import {
  type Credential,
  type DeviceProfileDocument,
  type Presentation,
  type ProfileDocument,
} from '@dxos/protocols/proto/dxos/halo/credentials';
import { trace } from '@dxos/tracing';

import { RPC_TIMEOUT } from '../common';
import { InvitationsProxy } from '../invitations';

@trace.resource()
export class HaloProxy implements Halo {
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

  private _haloCredentialStreamCleanup?: () => void;

  constructor(
    private readonly _serviceProvider: ClientServicesProvider,
    private readonly _runtime: Runtime.Runtime<never> = Runtime.defaultRuntime,
  ) {}

  [inspect.custom](): string {
    return inspectObject(this);
  }

  @trace.info({ depth: null })
  toJSON(): { identityKey: string | undefined; deviceKey: string | undefined } {
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
    log('opening halo proxy');
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
        if (identity && !this._haloCredentialStreamCleanup) {
          this._setupCredentialStream(identity);
        }
      }),
    );

    await this._setupInvitationProxy();
    this._setupStreams();

    log('opened halo proxy');
    await Promise.all([gotIdentity]);
  }

  /**
   * Set up the invitation proxy. Called on initial open and reconnect.
   */
  private async _setupInvitationProxy(): Promise<void> {
    await this._invitationProxy?.close();
    invariant(this._serviceProvider.services.InvitationsService, 'InvitationsService not available');
    this._invitationProxy = new InvitationsProxy(
      this._serviceProvider.services.InvitationsService,
      this._serviceProvider.services.IdentityService,
      () => ({
        kind: Invitation.Kind.DEVICE,
      }),
    );
    await this._invitationProxy.open();
  }

  /**
   * Set up the credential stream for the given identity.
   */
  private _setupCredentialStream(identity: Identity): void {
    // A fresh subscription replays the full credential set, so reset to avoid duplicates on reconnect.
    this._credentialsChanged.emit([]);
    const cleanup = subscribeStream(
      this._runtime,
      this._serviceProvider.rpc.SpacesService.queryCredentials({ spaceKey: identity.spaceKey! }),
      {
        onData: (data) => this._credentialsChanged.emit([...this._credentials.get(), data]),
      },
    );
    this._haloCredentialStreamCleanup = cleanup;
    this._streamSubscriptions.add(cleanup);
  }

  /**
   * Set up RPC streams. Called on initial open and reconnect.
   */
  private _setupStreams(): void {
    // Clear existing streams.
    this._streamSubscriptions.clear();
    this._haloCredentialStreamCleanup = undefined;

    // Re-create credential stream if we have an identity.
    const currentIdentity = this._identity.get();
    if (currentIdentity) {
      this._setupCredentialStream(currentIdentity);
    }

    this._streamSubscriptions.add(
      subscribeStream(this._runtime, this._serviceProvider.rpc.IdentityService.queryIdentity(undefined), {
        onData: (data) => {
          // Set tracing identity. For early stage debugging.
          data.identity &&
            log.trace('dxos.halo.identity', {
              identityKey: data.identity.identityKey,
              displayName: data.identity.profile?.displayName,
            });
          this._identityChanged.emit(data.identity ?? null);
        },
      }),
    );

    this._streamSubscriptions.add(
      subscribeStream(this._runtime, this._serviceProvider.rpc.ContactsService.queryContacts(undefined), {
        onData: (data) => this._contactsChanged.emit(data.contacts ?? []),
      }),
    );

    this._streamSubscriptions.add(
      subscribeStream(this._runtime, this._serviceProvider.rpc.DevicesService.queryDevices(undefined), {
        onData: (data) => {
          if (data.devices) {
            this._devicesChanged.emit(data.devices);
            const current = data.devices.find((device) => device.kind === DeviceKind.CURRENT);
            log.trace('dxos.halo.device', {
              deviceKey: current?.deviceKey,
              profile: current?.profile,
            });
          }
        },
      }),
    );
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
    this._haloCredentialStreamCleanup = undefined;
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
  async createIdentity(profile: ProfileDocument = {}, deviceProfile?: DeviceProfileDocument): Promise<Identity> {
    return this._createIdentityInternal(Context.default(), profile, deviceProfile);
  }

  @trace.span({ showInBrowserTimeline: true, op: 'lifecycle' })
  private async _createIdentityInternal(
    ctx: Context,
    profile: ProfileDocument = {},
    deviceProfile?: DeviceProfileDocument,
  ): Promise<Identity> {
    invariant(!this.identity.get(), 'Identity already exists');
    const deviceProfileWithDefaults = {
      ...deviceProfile,
      ...(deviceProfile?.label ? { label: deviceProfile.label } : { label: 'initial identity device' }),
    };
    const identity = await runServiceCall(
      this._runtime,
      this._serviceProvider.rpc.IdentityService.createIdentity({
        profile,
        deviceProfile: deviceProfileWithDefaults,
      }),
      { timeout: RPC_TIMEOUT, label: 'IdentityService.createIdentity' },
    );
    this._identityChanged.emit(identity);
    return identity;
  }

  async recoverIdentity(
    args: { recoveryCode: string } | { recoveryProof: string } | { token: string },
  ): Promise<Identity> {
    const identity = await runServiceCall(
      this._runtime,
      this._serviceProvider.rpc.IdentityService.recoverIdentity(args),
      {
        timeout: RPC_TIMEOUT,
        label: 'IdentityService.recoverIdentity',
      },
    );
    this._identityChanged.emit(identity);
    return identity;
  }

  async updateProfile(profile: ProfileDocument): Promise<Identity> {
    return this._updateProfileInternal(Context.default(), profile);
  }

  @trace.span({ showInBrowserTimeline: true, op: 'lifecycle' })
  private async _updateProfileInternal(ctx: Context, profile: ProfileDocument): Promise<Identity> {
    const identity = await runServiceCall(
      this._runtime,
      this._serviceProvider.rpc.IdentityService.updateProfile(profile),
      {
        timeout: RPC_TIMEOUT,
        label: 'IdentityService.updateProfile',
      },
    );
    this._identityChanged.emit(identity);
    return identity;
  }

  /**
   * Get Halo credentials for the current user.
   * Note: Will return an empty result if called before all credentials have been loaded.
   */
  queryCredentials({ ids, type }: { ids?: PublicKey[]; type?: string } = {}): Credential[] {
    return this._credentials.get().filter((credential) => {
      if (ids && !ids.some((id) => id.equals(credential.id!))) {
        return false;
      }
      if (type && credential.subject.assertion['@type'] !== type) {
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
    };
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

    await runServiceCall(
      this._runtime,
      this._serviceProvider.rpc.SpacesService.writeCredentials({
        spaceKey: identity.spaceKey!,
        credentials,
      }),
      { timeout: RPC_TIMEOUT, label: 'SpacesService.writeCredentials' },
    );
  }

  /**
   * Present Credentials.
   */
  // TODO(burdon): Rename createPresentation?
  async presentCredentials({ ids, nonce }: { ids: PublicKey[]; nonce?: Uint8Array }): Promise<Presentation> {
    const trigger = new Trigger<Credential[]>();

    this._credentials.subscribe((credentials) => {
      const credentialsToPresent = credentials.filter((credential) => ids.some((id) => id.equals(credential.id!)));
      if (credentialsToPresent.length === ids.length) {
        trigger.wake(credentialsToPresent);
      }
    });

    const credentials = await asyncTimeout(
      trigger.wait(),
      AUTH_TIMEOUT,
      new ApiError({ message: 'Timeout while waiting for credentials.' }),
    );
    return runServiceCall(
      this._runtime,
      this._serviceProvider.rpc.IdentityService.signPresentation({
        presentation: {
          credentials,
        },
        nonce,
      }),
      { timeout: RPC_TIMEOUT, label: 'IdentityService.signPresentation' },
    );
  }
}
