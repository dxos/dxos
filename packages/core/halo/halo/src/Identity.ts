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

import { type IdentityError } from './errors';
import * as Invitation from './Invitation';

/**
 * Device kind (platform / host class). Replaces the legacy protobuf `DeviceType` enum;
 * `agent`/`agent-managed` denote EDGE- or Hub-hosted agent devices.
 */
export const DeviceKind = Schema.Literal('unknown', 'browser', 'native', 'mobile', 'agent', 'agent-managed');
export type DeviceKind = typeof DeviceKind.Type;

/**
 * Public view of the local identity. Keyed by the DID; `identityKey` (hex) is retained for
 * consumers that seed deterministic UI (avatar/hue) or address the legacy credential key.
 * `data` carries arbitrary profile metadata (e.g. avatar emoji, hue).
 */
export const Info = Schema.Struct({
  did: IdentityDid,
  /** Hex-encoded identity (credential) key, when known. */
  identityKey: Schema.optional(Schema.String),
  displayName: Schema.optional(Schema.String),
  /** Arbitrary profile metadata. */
  data: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Any })),
});
export type Info = typeof Info.Type;

/**
 * Public view of a device belonging to the local identity. Replaces the legacy `Device` proxy
 * type (`deviceKey` → `key`).
 */
export const DeviceInfo = Schema.Struct({
  /** Hex-encoded device key. */
  key: Schema.String,
  kind: Schema.optional(DeviceKind),
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
 * Identity and device management, plus device invitations. `share`/`join` construct
 * {@link Invitation.Flow}s driven through the {@link Invitation} flow verbs; `invitations`
 * observes the active (host-created) device-invitation flows.
 */
export class Service extends Context.Tag('@dxos/halo/Identity')<
  Service,
  {
    /**
     * The local identity (`Option.none` when none exists) as a stream that emits the current
     * value immediately on subscription. Take the first element for a one-shot read; subscribe
     * for updates.
     */
    readonly identity: Stream.Stream<Option.Option<Info>>;
    /** Create the local identity (and its first device). */
    readonly create: (options?: { displayName?: string; deviceLabel?: string }) => Effect.Effect<Info, IdentityError>;
    /** Re-admit this device to an existing identity via a recovery credential. */
    readonly recover: (args: RecoverArgs) => Effect.Effect<Info, IdentityError>;
    /** Update the identity profile. */
    readonly updateProfile: (profile: {
      displayName?: string;
      data?: Record<string, unknown>;
    }) => Effect.Effect<Info, IdentityError>;
    /** Devices belonging to the local identity; emits the current set immediately. */
    readonly devices: Stream.Stream<readonly DeviceInfo[]>;
    /** Initiate a device invitation (host side). */
    readonly share: (options?: Invitation.ShareOptions) => Effect.Effect<Invitation.Flow, IdentityError>;
    /** Redeem a device-invitation code on a new device (guest side). */
    readonly join: (code: string) => Effect.Effect<Invitation.Flow, IdentityError>;
    /** Active (host-created) device-invitation flows; emits the current set immediately. */
    readonly invitations: Stream.Stream<readonly Invitation.Flow[]>;
  }
>() {}

/** The local identity as a current-value stream (requires {@link Service}). */
export const identity: Stream.Stream<Option.Option<Info>, never, Service> = Stream.unwrap(
  Effect.map(Service, (service) => service.identity),
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
export const updateProfile = (profile: {
  displayName?: string;
  data?: Record<string, unknown>;
}): Effect.Effect<Info, IdentityError, Service> => Effect.flatMap(Service, (service) => service.updateProfile(profile));

/** Devices belonging to the local identity as a current-value stream (requires {@link Service}). */
export const devices: Stream.Stream<readonly DeviceInfo[], never, Service> = Stream.unwrap(
  Effect.map(Service, (service) => service.devices),
);

/** Initiate a device invitation (requires {@link Service}). */
export const share = (options?: Invitation.ShareOptions): Effect.Effect<Invitation.Flow, IdentityError, Service> =>
  Effect.flatMap(Service, (service) => service.share(options));

/** Redeem a device-invitation code (requires {@link Service}). */
export const join = (code: string): Effect.Effect<Invitation.Flow, IdentityError, Service> =>
  Effect.flatMap(Service, (service) => service.join(code));

/** Active device-invitation flows as a current-value stream (requires {@link Service}). */
export const invitations: Stream.Stream<readonly Invitation.Flow[], never, Service> = Stream.unwrap(
  Effect.map(Service, (service) => service.invitations),
);
