//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';

import { IdentityDid } from '@dxos/keys';

import * as Device from './Device';
import { type IdentityError } from './errors';
import * as Invitation from './Invitation';

/**
 * Public view of the local identity. Replaces the legacy `Identity` proxy type; `identityKey`
 * and `spaceKey` (credential plumbing) are dropped in favor of the DID.
 */
export const Info = Schema.Struct({
  did: IdentityDid,
  displayName: Schema.optional(Schema.String),
});
export type Info = typeof Info.Type;

/**
 * Public view of a device belonging to the local identity. Replaces the legacy `Device` proxy
 * type (`deviceKey` → `key`, `DeviceKind` → {@link Device.Kind}).
 */
export const DeviceInfo = Schema.Struct({
  /** Hex-encoded device key. */
  key: Schema.String,
  kind: Schema.optional(Device.Kind),
  label: Schema.optional(Schema.String),
  /** Whether this device is the local (current) device. */
  current: Schema.Boolean,
});
export type DeviceInfo = typeof DeviceInfo.Type;

/**
 * Recovery credential presented to re-admit a device to an existing identity.
 */
export type RecoverArgs =
  | { readonly recoveryCode: string }
  | { readonly token: string }
  | { readonly recoveryProof: string };

/**
 * Identity and device management, plus device-invitation initiation. `share`/`join` construct
 * {@link Invitation.Flow}s whose lifecycle is driven through {@link Invitation.Service}.
 */
export class Service extends Context.Tag('@dxos/halo/Identity')<
  Service,
  {
    /** The local identity, if one exists. */
    readonly current: Effect.Effect<Option.Option<Info>>;
    /** Reactive stream of the local identity. */
    readonly changes: Stream.Stream<Option.Option<Info>>;
    /** Create the local identity (and its first device). */
    readonly create: (options?: { displayName?: string; deviceLabel?: string }) => Effect.Effect<Info, IdentityError>;
    /** Re-admit this device to an existing identity via a recovery credential. */
    readonly recover: (args: RecoverArgs) => Effect.Effect<Info, IdentityError>;
    /** Update the identity profile. */
    readonly updateProfile: (profile: { displayName?: string }) => Effect.Effect<Info, IdentityError>;
    /** Devices belonging to the local identity. */
    readonly devices: Effect.Effect<readonly DeviceInfo[]>;
    /** Reactive stream of the device set. */
    readonly deviceChanges: Stream.Stream<readonly DeviceInfo[]>;
    /** Initiate a device invitation (host side). */
    readonly share: (options?: Invitation.ShareOptions) => Effect.Effect<Invitation.Flow, IdentityError>;
    /** Redeem a device-invitation code on a new device (guest side). */
    readonly join: (code: string) => Effect.Effect<Invitation.Flow, IdentityError>;
  }
>() {}

/** The local identity, if one exists (requires {@link Service}). */
export const current: Effect.Effect<Option.Option<Info>, never, Service> = Effect.flatMap(
  Service,
  (service) => service.current,
);

/** Reactive stream of the local identity (requires {@link Service}). */
export const changes: Stream.Stream<Option.Option<Info>, never, Service> = Stream.unwrap(
  Effect.map(Service, (service) => service.changes),
);

/** Create the local identity (requires {@link Service}). */
export const create = (options?: {
  displayName?: string;
  deviceLabel?: string;
}): Effect.Effect<Info, IdentityError, Service> => Effect.flatMap(Service, (service) => service.create(options));

/** Re-admit this device via a recovery credential (requires {@link Service}). */
export const recover = (args: RecoverArgs): Effect.Effect<Info, IdentityError, Service> =>
  Effect.flatMap(Service, (service) => service.recover(args));

/** Update the identity profile (requires {@link Service}). */
export const updateProfile = (profile: { displayName?: string }): Effect.Effect<Info, IdentityError, Service> =>
  Effect.flatMap(Service, (service) => service.updateProfile(profile));

/** Devices belonging to the local identity (requires {@link Service}). */
export const devices: Effect.Effect<readonly DeviceInfo[], never, Service> = Effect.flatMap(
  Service,
  (service) => service.devices,
);

/** Reactive stream of the device set (requires {@link Service}). */
export const deviceChanges: Stream.Stream<readonly DeviceInfo[], never, Service> = Stream.unwrap(
  Effect.map(Service, (service) => service.deviceChanges),
);

/** Initiate a device invitation (requires {@link Service}). */
export const share = (options?: Invitation.ShareOptions): Effect.Effect<Invitation.Flow, IdentityError, Service> =>
  Effect.flatMap(Service, (service) => service.share(options));

/** Redeem a device-invitation code (requires {@link Service}). */
export const join = (code: string): Effect.Effect<Invitation.Flow, IdentityError, Service> =>
  Effect.flatMap(Service, (service) => service.join(code));
