//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import { type IdentityDid, type SpaceId } from '@dxos/keys';

import { type InvitationError } from './errors';

/**
 * Whether an invitation admits a device to an identity or a member to a space.
 */
export type Kind = 'device' | 'space';

/**
 * How a guest proves it may redeem the invitation.
 * Mirrors the legacy `Invitation.AuthMethod` protobuf enum.
 */
export type AuthMethod = 'none' | 'shared-secret' | 'known-public-key';

/**
 * Interactive (online host+guest handshake) vs delegated (offline-redeemable) invitation.
 * Mirrors the legacy `Invitation.Type` protobuf enum.
 */
export type Type = 'interactive' | 'delegated' | 'multiuse';

/**
 * Options for initiating an invitation. Passed to {@link Identity.share} / {@link Space.share}.
 */
export type ShareOptions = {
  readonly authMethod?: AuthMethod;
  readonly type?: Type;
  readonly multiUse?: boolean;
  /** Restrict a `known-public-key` invitation to a specific guest (key/DID). */
  readonly target?: string;
};

/**
 * Outcome of a completed invitation flow.
 */
export type Result = {
  readonly spaceId?: SpaceId;
  readonly identityDid?: IdentityDid;
};

/**
 * A lifecycle event emitted by an invitation {@link Flow}. Terminal events are `success`,
 * `cancelled`, and `error`. Replaces polling on the legacy `Invitation.State` enum.
 */
export type Event =
  | { readonly _tag: 'connecting' }
  | { readonly _tag: 'connected' }
  | { readonly _tag: 'readyForAuthentication'; readonly authCode?: string }
  | { readonly _tag: 'authenticating' }
  | { readonly _tag: 'success'; readonly result: Result }
  | { readonly _tag: 'cancelled' }
  | { readonly _tag: 'error'; readonly message: string };

/**
 * An in-flight invitation, host or guest side. Produced by {@link Identity.share}/`join` and
 * {@link Space.share}/`join`; its lifecycle is then driven through this handle and the
 * {@link Service}.
 */
export interface Flow {
  readonly id: string;
  readonly kind: Kind;
  /** Hot stream of lifecycle events; completes after a terminal event. */
  readonly events: Stream.Stream<Event>;
  /** Supply the auth code when the flow reaches `readyForAuthentication`. */
  authenticate(code: string): Effect.Effect<void, InvitationError>;
  /** Abort the flow. */
  cancel(): Effect.Effect<void>;
  /** Encoded, shareable invitation code (host side). */
  readonly code: Effect.Effect<string>;
}

/**
 * Selects which invitations to observe: those admitting devices to the local identity, or those
 * admitting members to a given space.
 */
export type Scope = { readonly device: true } | { readonly spaceId: SpaceId };

/**
 * Manages the invitation lifecycle. Purely lifecycle — it does not initiate invitations; that is
 * {@link Identity.share}/`join` and {@link Space.share}/`join`, which construct and return the
 * {@link Flow} objects this service observes.
 */
export class Service extends Context.Tag('@dxos/halo/Invitation')<
  Service,
  {
    /** Currently-active (host-created) invitation flows for a scope. */
    readonly active: (scope: Scope) => Effect.Effect<readonly Flow[]>;
    /** Reactive stream of the active-flow set for a scope. */
    readonly activeChanges: (scope: Scope) => Stream.Stream<readonly Flow[]>;
  }
>() {}

/** Supply the auth code to a flow awaiting authentication. */
export const authenticate = (flow: Flow, code: string): Effect.Effect<void, InvitationError> => flow.authenticate(code);

/** Abort a flow. */
export const cancel = (flow: Flow): Effect.Effect<void> => flow.cancel();

/** Lifecycle event stream of a flow. */
export const events = (flow: Flow): Stream.Stream<Event> => flow.events;

/** Encoded, shareable code for a flow. */
export const code = (flow: Flow): Effect.Effect<string> => flow.code;

/** Currently-active invitation flows for a scope (requires {@link Service}). */
export const active = (scope: Scope): Effect.Effect<readonly Flow[], never, Service> =>
  Effect.flatMap(Service, (service) => service.active(scope));

/** Reactive stream of the active-flow set for a scope (requires {@link Service}). */
export const activeChanges = (scope: Scope): Stream.Stream<readonly Flow[], never, Service> =>
  Stream.unwrap(Effect.map(Service, (service) => service.activeChanges(scope)));
