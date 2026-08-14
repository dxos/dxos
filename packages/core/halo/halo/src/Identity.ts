//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Equal from 'effect/Equal';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';
import * as Atom from 'effect/unstable/reactivity/Atom';

import { IdentityDid, SpaceId } from '@dxos/keys';
import { type Presentation } from '@dxos/protocols/proto/dxos/halo/credentials';

import { type IdentityError } from './errors';
import * as Invitation from './Invitation';

/**
 * Device kind (platform / host class). Replaces the legacy protobuf `DeviceType` enum;
 * `agent`/`agent-managed` denote EDGE- or Hub-hosted agent devices.
 */
export const DeviceKind = Schema.Literals(['unknown', 'browser', 'native', 'mobile', 'agent', 'agent-managed']);
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
  data: Schema.optional(Schema.Record(Schema.String, Schema.Any)),
});
export type Info = typeof Info.Type;

/**
 * Whether a device is currently reachable. `removed` is terminal — the device was evicted from the
 * identity rather than merely going offline.
 */
export const Presence = Schema.Literals(['online', 'offline', 'removed']);
export type Presence = typeof Presence.Type;

/**
 * Public view of a device belonging to the local identity. Replaces the legacy `Device` proxy
 * type (`deviceKey` → `key`).
 */
export const DeviceInfo = Schema.Struct({
  /** Hex-encoded device key. */
  key: Schema.String,
  kind: Schema.optional(DeviceKind),
  /** User-assigned name, when set. */
  label: Schema.optional(Schema.String),
  /** Operating system reported by the device (e.g. `macOS`), for naming an unlabelled device. */
  os: Schema.optional(Schema.String),
  /** Platform reported by the device (e.g. `Firefox`), for naming an unlabelled device. */
  platform: Schema.optional(Schema.String),
  /** Whether this device is the local (current) device. */
  current: Schema.Boolean,
  /** Whether the device is currently reachable. */
  presence: Schema.optional(Presence),
});
export type DeviceInfo = typeof DeviceInfo.Type;

/** How a recovery key is held. Mirrors `dxos.halo.credentials.IdentityRecovery.Kind`. */
export const RecoveryKind = Schema.Literals(['passkey', 'recovery-code', 'oauth', 'unknown']);
export type RecoveryKind = typeof RecoveryKind.Type;

/**
 * Recovery-specific detail, present only on credentials whose `type` is
 * `dxos.halo.credentials.IdentityRecovery`. Surfaced because a management UI cannot otherwise tell
 * two recovery credentials apart, nor know which of them is still usable.
 */
export const RecoveryInfo = Schema.Struct({
  /** Hex-encoded lookup key — the public handle used to revoke this credential. */
  lookupKey: Schema.optional(Schema.String),
  /** User-visible name assigned at creation. */
  label: Schema.optional(Schema.String),
  kind: RecoveryKind,
  /** Whether an `IdentityRecoveryRevoked` assertion cancels this credential. */
  revoked: Schema.Boolean,
});
export type RecoveryInfo = typeof RecoveryInfo.Type;

/**
 * Public view of a HALO credential. Replaces direct consumption of the protobuf `Credential`:
 * `type` is the subject assertion's `@type`, `id` its hex-encoded credential id.
 */
export const Credential = Schema.Struct({
  /** Hex-encoded credential id, when assigned. */
  id: Schema.optional(Schema.String),
  /** The subject assertion's `@type` (e.g. `dxos.halo.credentials.IdentityRecovery`). */
  type: Schema.String,
  issuanceDate: Schema.optional(Schema.Date),
  recovery: Schema.optional(RecoveryInfo),
});
export type Credential = typeof Credential.Type;

/**
 * The signed-in identity in the form EDGE/Hub HTTP and WebSocket clients authenticate with: a DID,
 * the local device's peer key, and a signer for the verifiable-presentation challenge EDGE answers
 * `401` with. Structurally the `EdgeIdentity` of `@dxos/edge-client`, declared here so consumers can
 * call `setIdentity` without depending on `@dxos/client`.
 */
export type EdgeIdentity = {
  /** Identity DID (`did:halo:…`); EDGE keys connections by it. */
  readonly identityDid: string;
  /** Hex-encoded key of the local device. */
  readonly peerKey: string;
  /** Signs `challenge` into a presentation issued by the identity key. */
  readonly presentCredentials: (options: { challenge: Uint8Array }) => Promise<Presentation>;
};

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
 * A key held outside HALO (a passkey) to register as a recovery credential. The WebAuthn ceremony
 * stays at the call site; only the credential write moves here. `label` and `kind` describe the
 * external key, so they are meaningful only alongside it.
 */
export type ExternalRecoveryKey = {
  /** Hex-encoded public key that will sign the recovery challenge. */
  readonly recoveryKey: string;
  /** Hex-encoded public handle used to look up (and revoke) this credential. */
  readonly lookupKey: string;
  /** Signature algorithm of `recoveryKey` (e.g. `ES256`, `ED25519`). */
  readonly algorithm: string;
  /** User-visible name; without it credentials are told apart only by issuance date. */
  readonly label?: string;
  readonly kind?: RecoveryKind;
};

/**
 * A recovery credential to write. Omit `externalKey` to have HALO generate the key and return a
 * recovery code.
 */
export type RecoveryCredentialOptions = {
  readonly externalKey?: ExternalRecoveryKey;
};

/**
 * Challenge a recovery key must sign to re-admit a device. Held by the caller across the signing
 * ceremony and handed back through {@link RecoverArgs}.
 */
export const RecoveryChallenge = Schema.Struct({
  /** Hex-encoded key of the device being admitted. */
  deviceKey: Schema.String,
  /** Hex-encoded control-feed key the admission is written to. */
  controlFeedKey: Schema.String,
  /** Base64-encoded challenge bytes. */
  challenge: Schema.String,
});
export type RecoveryChallenge = typeof RecoveryChallenge.Type;

/**
 * Recovery credential presented to re-admit a device to an existing identity. The `passkey` variant
 * carries a WebAuthn assertion over a {@link RecoveryChallenge}; `clientDataJson` and
 * `authenticatorData` are required to verify an authenticator signature.
 */
export type RecoverArgs =
  | { readonly recoveryCode: string }
  | { readonly token: string }
  | { readonly recoveryProof: string }
  | {
      readonly passkey: {
        readonly challenge: RecoveryChallenge;
        /** Hex-encoded lookup key of the credential being presented. */
        readonly lookupKey: string;
        readonly signature: Uint8Array;
        readonly clientDataJson?: Uint8Array;
        readonly authenticatorData?: Uint8Array;
      };
    };

/**
 * Identity and device management, plus device invitations. `share`/`join` construct
 * {@link Invitation.Flow}s driven through the {@link Invitation} flow verbs; `invitations`
 * observes the active (host-created) device-invitation flows.
 */
/**
 * The service shape backing {@link Service}. Named (rather than inline in the `Context.Tag`) so
 * consumers referencing it — e.g. a capability typed `Context.Service.Shape<typeof Identity.Service>` —
 * name it portably instead of expanding its structure and leaking the transitive
 * {@link Invitation} types into their declaration emit (TS2883).
 */
export interface ServiceApi {
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
  /**
   * Subscribe to local-identity changes (imperative). Invokes `callback` immediately with the
   * current value, then on each change. Returns an unsubscribe function.
   */
  readonly subscribe: (callback: (identity: Option.Option<Info>) => void) => () => void;
  /** Create the local identity (and its first device). */
  readonly create: (options?: {
    displayName?: string;
    data?: Record<string, unknown>;
    deviceLabel?: string;
  }) => Effect.Effect<Info, IdentityError>;
  /**
   * Id of the identity's personal (HALO) space — where its credentials live. `Option.none` when no
   * identity exists. Derived asynchronously from the identity key, hence a verb rather than a field
   * on {@link Info}.
   */
  readonly personalSpaceId: Effect.Effect<Option.Option<SpaceId>, IdentityError>;
  /** Re-admit this device to an existing identity via a recovery credential. */
  readonly recover: (args: RecoverArgs) => Effect.Effect<Info, IdentityError>;
  /**
   * Write a recovery credential for this identity. Returns the generated recovery code when HALO
   * generated the key; nothing when an external key (passkey) was registered.
   */
  readonly createRecoveryCredential: (
    options?: RecoveryCredentialOptions,
  ) => Effect.Effect<{ recoveryCode?: string }, IdentityError>;
  /** Request the challenge a recovery key must sign to admit this device. */
  readonly requestRecoveryChallenge: Effect.Effect<RecoveryChallenge, IdentityError>;
  /** Revoke a recovery credential by its hex-encoded lookup key. */
  readonly revokeRecoveryCredential: (lookupKey: string) => Effect.Effect<void, IdentityError>;
  /** Update the identity profile. */
  readonly updateProfile: (profile: {
    displayName?: string;
    data?: Record<string, unknown>;
  }) => Effect.Effect<Info, IdentityError>;
  /** Devices belonging to the local identity; emits the current set immediately. */
  readonly devices: Stream.Stream<readonly DeviceInfo[]>;
  /** Synchronous snapshot of the local identity's devices, for imperative callers. */
  readonly getDevicesSnapshot: () => readonly DeviceInfo[];
  /**
   * The signed-in identity as an EDGE/Hub authentication principal (`Option.none` when no identity
   * or local device exists). Synchronous because every consumer attaches it inside a React effect or
   * an identity-change callback; the signing it defers is what is asynchronous.
   */
  readonly getEdgeIdentity: () => Option.Option<EdgeIdentity>;
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

export class Service extends Context.Service<Service, ServiceApi>()('@dxos/halo/Identity') {}

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
  data?: Record<string, unknown>;
  deviceLabel?: string;
}): Effect.Effect<Info, IdentityError, Service> => Effect.flatMap(Service, (service) => service.create(options));

/** Id of the identity's personal (HALO) space (requires {@link Service}). */
export const personalSpaceId: Effect.Effect<Option.Option<SpaceId>, IdentityError, Service> = Effect.flatMap(
  Service,
  (service) => service.personalSpaceId,
);

/** Re-admit this device via a recovery credential (requires {@link Service}). */
export const recover = (args: RecoverArgs): Effect.Effect<Info, IdentityError, Service> =>
  Effect.flatMap(Service, (service) => service.recover(args));

/** Write a recovery credential (requires {@link Service}). */
export const createRecoveryCredential = (
  options?: RecoveryCredentialOptions,
): Effect.Effect<{ recoveryCode?: string }, IdentityError, Service> =>
  Effect.flatMap(Service, (service) => service.createRecoveryCredential(options));

/** Request a recovery challenge for this device (requires {@link Service}). */
export const requestRecoveryChallenge: Effect.Effect<RecoveryChallenge, IdentityError, Service> = Effect.flatMap(
  Service,
  (service) => service.requestRecoveryChallenge,
);

/** Revoke a recovery credential by lookup key (requires {@link Service}). */
export const revokeRecoveryCredential = (lookupKey: string): Effect.Effect<void, IdentityError, Service> =>
  Effect.flatMap(Service, (service) => service.revokeRecoveryCredential(lookupKey));

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

/**
 * The local identity as an `Atom`, for reactive non-React consumers (app-graph builders and other
 * Atom-driven code). Seeded from the synchronous snapshot and updated through `subscribe`, so a
 * reader that evaluates before the first stream tick sees the current identity rather than `none`.
 *
 * Keyed by service reference, not structurally: the shape holds streams whose accessors a
 * structural key would read.
 */
export const atom: (service: ServiceApi) => Atom.Atom<Option.Option<Info>> = (() => {
  const family = Atom.family((service: ServiceApi) =>
    Atom.make<Option.Option<Info>>((get) => {
      get.addFinalizer(service.subscribe((identity) => get.setSelf(identity)));
      return service.getSnapshot();
    }),
  );
  return (service) => family(Equal.byReferenceUnsafe(service));
})();

/** The signed-in identity as an EDGE/Hub authentication principal (requires {@link Service}). */
export const getEdgeIdentity: Effect.Effect<Option.Option<EdgeIdentity>, never, Service> = Effect.map(
  Service,
  (service) => service.getEdgeIdentity(),
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
