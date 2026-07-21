//
// Copyright 2026 DXOS.org
//

import type * as HttpClient from '@effect/platform/HttpClient';
import type * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import type { Client } from '@dxos/client';
import type { Operation } from '@dxos/compute';
import { type Database, Obj, Ref } from '@dxos/echo';
import { AccessToken, Cursor } from '@dxos/link';
import type { OAuthProvider } from '@dxos/protocols';

import { type ConnectionTestError } from '../errors';
import * as Connection from './Connection';

/** Descriptor for one remote target returned by discovery operations. */
export const RemoteTarget = Schema.Struct({
  /** Remote identifier (e.g. Trello board id). */
  id: Schema.String,
  /** User-readable label. */
  name: Schema.String,
  /** Optional secondary line. */
  description: Schema.String.pipe(Schema.optional),
  /** Service-specific extras for display. */
  metadata: Schema.Record({ key: Schema.String, value: Schema.Unknown }).pipe(Schema.optional),
});
export interface RemoteTarget extends Schema.Schema.Type<typeof RemoteTarget> {}

/** Input accepted by every {@link ConnectorEntry.getSyncTargets} operation. */
export const GetSyncTargetsInput = Schema.Struct({
  connection: Ref.Ref(Connection.Connection),
});
export interface GetSyncTargetsInput extends Schema.Schema.Type<typeof GetSyncTargetsInput> {}

/** Output returned by {@link ConnectorEntry.getSyncTargets} discovery operations. */
export const GetSyncTargetsOutput = Schema.Struct({
  targets: Schema.Array(RemoteTarget),
});
export interface GetSyncTargetsOutput extends Schema.Schema.Type<typeof GetSyncTargetsOutput> {}

/**
 * Input accepted by every {@link ConnectorEntry.materializeTarget} operation.
 * `remoteTarget` is omitted for single-target connectors (e.g. Gmail) that have
 * no remote selection.
 */
export const MaterializeTargetInput = Schema.Struct({
  connection: Ref.Ref(Connection.Connection),
  remoteTarget: RemoteTarget.pipe(Schema.optional),
});
export interface MaterializeTargetInput extends Schema.Schema.Type<typeof MaterializeTargetInput> {}

/**
 * Output returned by {@link ConnectorEntry.materializeTarget} operations: a ref
 * to the persisted local root object the binding will reference.
 */
export const MaterializeTargetOutput = Schema.Struct({
  target: Ref.Ref(Obj.Unknown),
});
export interface MaterializeTargetOutput extends Schema.Schema.Type<typeof MaterializeTargetOutput> {}

/** Minimum input for provider {@link ConnectorEntry.sync} operations: one cursor to reconcile. */
export type SyncInput = {
  binding: Ref.Ref<Cursor.Cursor>;
};

/**
 * Result shape for provider sync operations (not consumed by connector UI yet).
 */
export type SyncOutput = any;

/** Hook fired after OAuth creates an AccessToken for this connection. */
export type OnTokenCreated = (input: {
  accessToken: AccessToken.AccessToken;
  connection: Connection.Connection;
  /**
   * Pre-existing local object the caller wants to bind as the connection's
   * first sync target — set when the auth flow was initiated from a surface
   * that already has the target object in scope (e.g. an `InitializeMailbox`
   * button on an existing Mailbox). When omitted, single-target connectors
   * (Gmail) materialize a fresh target object.
   */
  existingTarget?: Ref.Ref<Obj.Unknown>;
}) => Effect.Effect<void, never, HttpClient.HttpClient>;

/**
 * Hook fired after an external-sync {@link Cursor.Cursor} is created for a target — a single-target
 * bind (Gmail, JMAP) or one newly-selected multi-target row (Calendar). Connectors use this to set up
 * recurring background sync (a Routine wrapping a timer Trigger, invoking the same {@link sync}
 * operation `ConnectorOperation.SyncConnection` invokes directly) for the target; unlike
 * {@link OnTokenCreated}, this runs once per bound target rather than once per connection.
 */
export type OnCursorCreated = (input: {
  connection: Connection.Connection;
  cursor: Cursor.ExternalCursor;
  target: Obj.Unknown;
  db: Database.Database;
}) => Effect.Effect<void, never>;

/**
 * Probe whether a connection's stored credential is still valid.
 *
 * Success means the credential authenticates against the live service; a typed
 * `Effect.fail` carries a user-facing reason (e.g. "Google rejected the
 * credential (401)."). Runs when a connection is opened so the UI can offer to
 * reauthenticate a connection whose token has expired or been revoked.
 *
 * `client` is supplied for connectors whose credentials layer resolves through
 * the client/Edge (e.g. atproto proxying); HTTP-only connectors ignore it.
 * Optional on the interface: connectors without it are treated as
 * "cannot test" and never prompt to reauthenticate on open.
 */
export type TestConnection = (input: {
  accessToken: AccessToken.AccessToken;
  connection: Connection.Connection;
  client: Client;
}) => Effect.Effect<void, ConnectionTestError, HttpClient.HttpClient>;

/** OAuth spec for Connector.oauth. */
export type ConnectorOAuthSpec = {
  provider: OAuthProvider;
  scopes: readonly string[];
  /**
   * Use a top-level redirect flow instead of the default popup +
   * `postMessage`. Required for providers that nullify `window.opener`
   * (e.g. atproto / bsky.social). Edge redirects to `/redirect/oauth?...`
   * which a NavigationHandler picks up via persisted localStorage state.
   */
  useRedirectFlow?: boolean;
};

/**
 * Result of a connector credential form submission.
 *
 * `complete` — for non-OAuth flows: the form yields a fully built
 * `AccessToken` + `Connection` and the coordinator persists them.
 *
 * `oauth` — for OAuth flows that need pre-flight input (e.g. atproto
 * handle): the coordinator opens the auth window and forwards
 * `loginHint` to Edge.
 */
export type CredentialFormResult =
  | { kind: 'complete'; accessToken: AccessToken.AccessToken; connection: Connection.Connection }
  | { kind: 'oauth'; loginHint?: string };

/**
 * Per-connector form rendered by the generic connector-form dialog. One
 * shape covers both non-OAuth (custom token, IMAP) and OAuth pre-flight
 * (atproto handle) — the discriminator on `onSubmit`'s result tells the
 * coordinator which path to take next.
 */
export type CredentialForm<Values = any> = {
  /** Schema rendered by the generic connector-form dialog. */
  schema: Schema.Schema<Values, any>;
  /** Optional defaults pre-filled into the form. */
  defaultValues?: Partial<Values>;
  /**
   * Optional async pre-submit validation. Runs before the dialog closes so
   * errors are shown inline. On failure the dialog stays open with the error
   * message; on success `onSubmit` proceeds normally.
   */
  onValidate?: (input: { values: Values; connector: ConnectorEntry }) => Effect.Effect<void, Error>;
  /**
   * Build the next step of the connection flow from form values.
   *
   * Failures (`Effect.fail`) propagate to the coordinator and surface in the dialog's
   * `Effect.catchAll` — use these for user-visible validation messages. Do NOT `Effect.orDie`
   * validation errors; defects bypass the dialog's failure handler and crash the request.
   */
  onSubmit: (input: {
    values: Values;
    connector: ConnectorEntry;
    db: Database.Database;
  }) => Effect.Effect<CredentialFormResult, Error>;
};

/**
 * One Connector capability row — shape of entries contributed via {@link Connector}.
 * A connector is the reusable driver for a service: it knows how to authenticate
 * (oauth / credentialForm), discover and materialize sync targets, and sync them.
 */
export type ConnectorEntry = {
  /** Stable connector id; stored as `Connection.connectorId`. */
  id: string;
  /** Matches `AccessToken.source` (e.g. `'trello.com'`, `'google.com'`). */
  source: string;
  /** User-facing label; defaults to `id` when omitted. */
  label?: string;
  oauth?: ConnectorOAuthSpec;
  /** Discover remote targets reachable from a connection (multi-target connectors). */
  getSyncTargets?: Operation.Definition<GetSyncTargetsInput, GetSyncTargetsOutput>;
  /** Create an empty local root object so a binding can be created eagerly. */
  materializeTarget?: Operation.Definition<MaterializeTargetInput, MaterializeTargetOutput>;
  /** Reconcile one binding's target object with its remote. */
  sync?: Operation.Definition<SyncInput, SyncOutput>;
  /** Schema describing per-binding `.options`. */
  optionsSchema?: Schema.Schema<any, any>;
  /**
   * Renders before authentication. Use for non-OAuth credentials (custom
   * token, IMAP host/port/user/password) or OAuth pre-flight inputs (atproto
   * handle / DID). The submit result decides what runs next — see
   * {@link CredentialFormResult}.
   */
  credentialForm?: CredentialForm<any>;
  onTokenCreated?: OnTokenCreated;
  /**
   * Probe whether the stored credential still works (see {@link TestConnection}).
   * When present, the connection is tested on open and — if the connector also
   * declares {@link oauth} — the user is offered a reauthenticate action on failure.
   */
  testConnection?: TestConnection;
  /** Set up recurring background sync for a newly-bound target (see {@link OnCursorCreated}). */
  onCursorCreated?: OnCursorCreated;
};

/**
 * Capability registry token for Connector contributions (auth + discovery + sync wiring).
 * Multi: every service-specific connector plugin (Bluesky, Discord, GitHub, …) contributes its
 * own entry array alongside plugin-connector's built-ins.
 */
export const Connector = Capability.make<ConnectorEntry[]>()('org.dxos.plugin.connector.capability.connector');
