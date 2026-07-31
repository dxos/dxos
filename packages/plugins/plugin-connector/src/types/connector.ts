//
// Copyright 2026 DXOS.org
//

import type * as HttpClient from '@effect/platform/HttpClient';
import type * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import type { Client } from '@dxos/client';
import * as Credential from '@dxos/compute/Credential';
import * as Operation from '@dxos/compute/Operation';
import * as Trigger from '@dxos/compute/Trigger';
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

/** Input accepted by every {@link ConnectorSync.getTargets} operation. */
export const GetSyncTargetsInput = Schema.Struct({
  connection: Ref.Ref(Connection.Connection),
});
export interface GetSyncTargetsInput extends Schema.Schema.Type<typeof GetSyncTargetsInput> {}

/** Output returned by {@link ConnectorSync.getTargets} discovery operations. */
export const GetSyncTargetsOutput = Schema.Struct({
  targets: Schema.Array(RemoteTarget),
});
export interface GetSyncTargetsOutput extends Schema.Schema.Type<typeof GetSyncTargetsOutput> {}

/**
 * Input accepted by every {@link ConnectorSync.materializeTarget} operation.
 * `remoteTarget` is omitted for single-target connectors (e.g. Gmail) that have
 * no remote selection.
 */
export const MaterializeTargetInput = Schema.Struct({
  connection: Ref.Ref(Connection.Connection),
  remoteTarget: RemoteTarget.pipe(Schema.optional),
});
export interface MaterializeTargetInput extends Schema.Schema.Type<typeof MaterializeTargetInput> {}

/**
 * Output returned by {@link ConnectorSync.materializeTarget} operations: a ref
 * to the persisted local root object the binding will reference.
 */
export const MaterializeTargetOutput = Schema.Struct({
  target: Ref.Ref(Obj.Unknown),
});
export interface MaterializeTargetOutput extends Schema.Schema.Type<typeof MaterializeTargetOutput> {}

/** Minimum input for provider {@link ConnectorSync.operation} operations: one cursor to reconcile. */
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
}) => Effect.Effect<void, never, HttpClient.HttpClient | Credential.CredentialsService>;

/**
 * Everything a connector needs to sync: the per-binding sync operation, how targets are discovered
 * and materialized, the per-binding options schema, and — when the connector wants its bindings kept
 * up to date in the background — the trigger spec to schedule that on.
 */
export type ConnectorSync = {
  /** Reconcile one binding's target object with its remote. */
  operation: Operation.Definition<SyncInput, SyncOutput>;
  /** Discover remote targets reachable from a connection (multi-target connectors). */
  getTargets?: Operation.Definition<GetSyncTargetsInput, GetSyncTargetsOutput>;
  /** Create an empty local root object so a binding can be created eagerly. */
  materializeTarget?: Operation.Definition<MaterializeTargetInput, MaterializeTargetOutput>;
  /** Schema describing per-binding `.options`. */
  optionsSchema?: Schema.Schema<any, any>;
  /**
   * Sync a binding as soon as it is created, instead of waiting for the user to ask. Defaults to
   * false: the first sync of a freshly authorized account is unbounded (full history, every bound
   * target at once), so a connector opts in only once that is known to be safe for its service.
   */
  auto?: boolean;
  /**
   * Schedule to keep bindings in sync on — a timer cron, a subscription, whatever the connector
   * wants. Each new binding gets a Routine wrapping a trigger with this spec, and that trigger is
   * also what a manual sync force-runs — creating the Routine first if the binding has none — so
   * scheduled and on-demand syncs share the dispatcher's durable execution. Omit for a connector that
   * should only sync on demand: {@link operation} is then invoked directly.
   */
  trigger?: Trigger.Spec;
};

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
}) => Effect.Effect<void, ConnectionTestError, HttpClient.HttpClient | Credential.CredentialsService>;

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
  /** How this connector syncs; absent for a connector that only authenticates. */
  sync?: ConnectorSync;
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
};

/**
 * Capability registry token for Connector contributions (auth + discovery + sync wiring).
 * Multi: every service-specific connector plugin (Bluesky, Discord, GitHub, …) contributes its
 * own entry array alongside plugin-connector's built-ins.
 */
export const Connector = Capability.make<ConnectorEntry[]>()('org.dxos.plugin.connector.capability.connector');
