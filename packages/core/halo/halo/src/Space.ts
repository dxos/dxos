//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';

import { IdentityDid, SpaceId } from '@dxos/keys';

import { type SpaceError } from './errors';
import * as Group from './Group';
import * as Invitation from './Invitation';

/**
 * Lifecycle state of a space. Replaces the legacy `SpaceState` protobuf enum (subset relevant to
 * consumers).
 */
export const State = Schema.Literal('inactive', 'closed', 'ready');
export type State = typeof State.Type;

/**
 * A space membership entry. Membership (HALO) only — liveness/presence is a separate concern
 * (see API_AUDIT.md §3.6).
 */
export const Member = Schema.Struct({
  /** DID of the member identity, when known. */
  did: Schema.optional(IdentityDid),
  role: Group.Access,
  /** Whether the member is currently online. */
  online: Schema.Boolean,
});
export type Member = typeof Member.Type;

/**
 * Public view of a space. A plain snapshot — database access stays on the ECHO `Database`
 * service keyed by {@link SpaceId}, not on this value.
 */
export const Info = Schema.Struct({
  id: SpaceId,
  name: Schema.optional(Schema.String),
  state: State,
});
export type Info = typeof Info.Type;

/**
 * A serialized space archive (export/import payload).
 */
export type Archive = {
  readonly filename: string;
  readonly contents: Uint8Array;
};

export type CreateOptions = {
  readonly name?: string;
};

/** Re-exported for convenience: a space member's access level. */
export type Access = Group.Access;

/**
 * Space management and membership, plus space-invitation initiation. `share`/`join` construct
 * {@link Invitation.Flow}s whose lifecycle is driven through {@link Invitation.Service}.
 */
export class Service extends Context.Tag('@dxos/halo/Space')<
  Service,
  {
    /** All spaces known to the local identity. */
    readonly list: Effect.Effect<readonly Info[]>;
    /** Reactive stream of the space set. */
    readonly changes: Stream.Stream<readonly Info[]>;
    /** Resolve a space by id. */
    readonly get: (id: SpaceId) => Effect.Effect<Option.Option<Info>>;
    /** Create a new space. */
    readonly create: (options?: CreateOptions) => Effect.Effect<Info, SpaceError>;
    /** Resolve once the space has reached the `ready` state. */
    readonly waitReady: (id: SpaceId) => Effect.Effect<void, SpaceError>;
    /** Members of a space. */
    readonly members: (id: SpaceId) => Effect.Effect<readonly Member[], SpaceError>;
    /** Reactive stream of a space's membership. */
    readonly memberChanges: (id: SpaceId) => Stream.Stream<readonly Member[]>;
    /** Change a member's access level (Keyhive delegation). */
    readonly updateMemberRole: (
      id: SpaceId,
      subject: IdentityDid,
      role: Group.Access,
    ) => Effect.Effect<void, SpaceError>;
    /** Remove a member (Keyhive revocation). */
    readonly removeMember: (id: SpaceId, subject: IdentityDid) => Effect.Effect<void, SpaceError>;
    /** Initiate a space invitation (host side). */
    readonly share: (id: SpaceId, options?: Invitation.ShareOptions) => Effect.Effect<Invitation.Flow, SpaceError>;
    /** Redeem a space-invitation code (guest side). */
    readonly join: (code: string) => Effect.Effect<Invitation.Flow, SpaceError>;
    /** Export a space to an archive. */
    readonly export: (id: SpaceId) => Effect.Effect<Archive, SpaceError>;
    /** Import a space from an archive. */
    readonly import: (archive: Archive, options?: { tags?: readonly string[] }) => Effect.Effect<Info, SpaceError>;
  }
>() {}

/** All spaces known to the local identity (requires {@link Service}). */
export const list: Effect.Effect<readonly Info[], never, Service> = Effect.flatMap(Service, (service) => service.list);

/** Reactive stream of the space set (requires {@link Service}). */
export const changes: Stream.Stream<readonly Info[], never, Service> = Stream.unwrap(
  Effect.map(Service, (service) => service.changes),
);

/** Resolve a space by id (requires {@link Service}). */
export const get = (id: SpaceId): Effect.Effect<Option.Option<Info>, never, Service> =>
  Effect.flatMap(Service, (service) => service.get(id));

/** Create a new space (requires {@link Service}). */
export const create = (options?: CreateOptions): Effect.Effect<Info, SpaceError, Service> =>
  Effect.flatMap(Service, (service) => service.create(options));

/** Resolve once the space is ready (requires {@link Service}). */
export const waitReady = (id: SpaceId): Effect.Effect<void, SpaceError, Service> =>
  Effect.flatMap(Service, (service) => service.waitReady(id));

/** Members of a space (requires {@link Service}). */
export const members = (id: SpaceId): Effect.Effect<readonly Member[], SpaceError, Service> =>
  Effect.flatMap(Service, (service) => service.members(id));

/** Reactive stream of a space's membership (requires {@link Service}). */
export const memberChanges = (id: SpaceId): Stream.Stream<readonly Member[], never, Service> =>
  Stream.unwrap(Effect.map(Service, (service) => service.memberChanges(id)));

/** Change a member's access level (requires {@link Service}). */
export const updateMemberRole = (
  id: SpaceId,
  subject: IdentityDid,
  role: Group.Access,
): Effect.Effect<void, SpaceError, Service> =>
  Effect.flatMap(Service, (service) => service.updateMemberRole(id, subject, role));

/** Remove a member (requires {@link Service}). */
export const removeMember = (id: SpaceId, subject: IdentityDid): Effect.Effect<void, SpaceError, Service> =>
  Effect.flatMap(Service, (service) => service.removeMember(id, subject));

/** Initiate a space invitation (requires {@link Service}). */
export const share = (
  id: SpaceId,
  options?: Invitation.ShareOptions,
): Effect.Effect<Invitation.Flow, SpaceError, Service> =>
  Effect.flatMap(Service, (service) => service.share(id, options));

/** Redeem a space-invitation code (requires {@link Service}). */
export const join = (code: string): Effect.Effect<Invitation.Flow, SpaceError, Service> =>
  Effect.flatMap(Service, (service) => service.join(code));

/** Export a space to an archive (requires {@link Service}). */
export const exportSpace = (id: SpaceId): Effect.Effect<Archive, SpaceError, Service> =>
  Effect.flatMap(Service, (service) => service.export(id));

/** Import a space from an archive (requires {@link Service}). */
export const importSpace = (
  archive: Archive,
  options?: { tags?: readonly string[] },
): Effect.Effect<Info, SpaceError, Service> => Effect.flatMap(Service, (service) => service.import(archive, options));
