//
// Copyright 2026 DXOS.org
//

import * as EffectContext from 'effect/Context';

import { type Event } from '@dxos/async';
import { type Context } from '@dxos/context';
import { type EchoHost } from '@dxos/echo-host';
import { type PublicKey } from '@dxos/keys';
import { type Device } from '@dxos/protocols/buf/dxos/client/services_pb';
import { type IdentityRecord } from '@dxos/protocols/buf/dxos/echo/metadata_pb';
import {
  type Credential,
  type DeviceProfileDocument,
  type ProfileDocument,
} from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { type Timeframe } from '@dxos/timeframe';

import { type Identity } from '../Identity.ts';

//
// The identity subsystem's contract: the interfaces its consumers depend on and the tags that carry
// them. Nothing here imports an implementation, so depending on the contract cannot drag one in —
// which a tag typed against an implementation class silently does, even through a type-only import.
//

export type JoinIdentityProps = {
  identityKey: PublicKey;
  deviceKey: PublicKey;
  haloSpaceKey: PublicKey;
  haloGenesisFeedKey: PublicKey;
  controlFeedKey: PublicKey;
  dataFeedKey: PublicKey;
  authorizedDeviceCredential: Credential;
  /**
   * Automerge URL of the host's halo space root, when it has one. The joining device adopts it rather
   * than minting a second root over the same space.
   */
  haloSpaceRootUrl?: string;
  /**
   * Latest known timeframe for the control pipeline.
   * We will try to catch up to this timeframe before starting the data pipeline.
   */
  controlTimeframe?: Timeframe;
  /** Custom device profile, merged with defaults, applied once the identity is accepted. */
  deviceProfile?: DeviceProfileDocument;
};

export type CreateIdentityOptions = {
  profile?: ProfileDocument;
  /** Device profile for the device creating the identity. */
  deviceProfile?: DeviceProfileDocument;
};

/**
 * The peer's identity state machine, as its consumers use it.
 */
export interface Manager {
  readonly stateUpdate: Event;
  readonly identity: Identity | undefined;
  open(ctx: Context): Promise<void>;
  close(ctx: Context): Promise<void>;
  deleteIdentity(ctx: Context): Promise<void>;
  updateProfile(profile: ProfileDocument): Promise<ProfileDocument>;
  updateDeviceProfile(profile: DeviceProfileDocument): Promise<Device>;
  setEchoHost(echoHost: EchoHost): Promise<void>;
  createIdentity(options?: CreateIdentityOptions, ctx?: Context): Promise<Identity>;
  prepareIdentity(
    params: JoinIdentityProps,
    ctx?: Context,
  ): Promise<{ identity: Identity; identityRecord: IdentityRecord }>;
  acceptIdentity(identity: Identity, identityRecord: IdentityRecord, profile?: DeviceProfileDocument): Promise<void>;
}

/**
 * Resolves the active identity when it becomes available.
 */
export type Provider = () => Identity;

/**
 * Brings a new identity into the running stack: binds it to the network, joins, and announces it so
 * the identity-bound services open. The persisted identity on boot goes through the same events
 * from the host's open sequence.
 */
export interface Lifecycle {
  /** Creates a fresh identity and resolves once its identity-bound services are open. */
  createIdentity(params?: CreateIdentityOptions, ctx?: Context): Promise<Identity>;
  /** Adopts an identity admitted by another device and resolves once its services are open. */
  acceptIdentity(params: JoinIdentityProps): Promise<Identity>;
}

/** Effect service tag for {@link Manager}. */
export class ManagerService extends EffectContext.Service<ManagerService, Manager>()(
  '@dxos/client-services/IdentityManager',
) {}

/** Effect service tag for {@link Provider}. */
export class ProviderService extends EffectContext.Service<ProviderService, Provider>()(
  '@dxos/client-services/IdentityProvider',
) {}

/** Effect service tag for {@link Lifecycle}. */
export class LifecycleService extends EffectContext.Service<LifecycleService, Lifecycle>()(
  '@dxos/client-services/IdentityLifecycle',
) {}
