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
 * Public view of a HALO credential. Replaces direct consumption of the protobuf `Credential`:
 * `type` is the subject assertion's `@type`, `id` its hex-encoded credential id.
 */
export const Credential = Schema.Struct({
  /** Hex-encoded credential id, when assigned. */
  id: Schema.optional(Schema.String),
  /** The subject assertion's `@type` (e.g. `dxos.halo.credentials.IdentityRecovery`). */
  type: Schema.String,
  issuanceDate: Schema.optional(Schema.DateFromSelf),
});
export type Credential = typeof Credential.Type;

/**
 * Options for a self-issued `ServiceAccess` credential granting the identity access to an
 * EDGE/Hub service.
 */
export type ServiceAccessOptions = {
  /** Target server name (e.g. `hub.dxos.network`). */
  readonly serverName: string;
  /** Capabilities to grant (e.g. `['composer:beta']`). */
  readonly capabilities: readonly string[];
};

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
    /**
     * Synchronous snapshot of the local identity (`Option.none` when none exists). For imperative
     * callers (non-React, non-Effect) that need the current value without subscribing.
     */
    readonly getSnapshot: () => Option.Option<Info>;
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
    /** Synchronous snapshot of the local identity's devices, for imperative callers. */
    readonly getDevicesSnapshot: () => readonly DeviceInfo[];
    /** HALO credentials of the local identity; emits the current set immediately. */
    readonly credentials: Stream.Stream<readonly Credential[]>;
    /**
     * Grant this identity access to an EDGE/Hub service by writing a `ServiceAccess` credential
     * (self-issued). Replaces hand-constructing the protobuf credential at the call site.
     */
    readonly grantServiceAccess: (options: ServiceAccessOptions) => Effect.Effect<void, IdentityError>;
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

/** Synchronous snapshot of the local identity (requires {@link Service}). */
export const getSnapshot: Effect.Effect<Option.Option<Info>, never, Service> = Effect.map(Service, (service) =>
  service.getSnapshot(),
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

/** Synchronous snapshot of the local identity's devices (requires {@link Service}). */
export const getDevicesSnapshot: Effect.Effect<readonly DeviceInfo[], never, Service> = Effect.map(Service, (service) =>
  service.getDevicesSnapshot(),
);

/** HALO credentials as a current-value stream (requires {@link Service}). */
export const credentials: Stream.Stream<readonly Credential[], never, Service> = Stream.unwrap(
  Effect.map(Service, (service) => service.credentials),
);

/** Grant the identity access to an EDGE/Hub service (requires {@link Service}). */
export const grantServiceAccess = (options: ServiceAccessOptions): Effect.Effect<void, IdentityError, Service> =>
  Effect.flatMap(Service, (service) => service.grantServiceAccess(options));

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
