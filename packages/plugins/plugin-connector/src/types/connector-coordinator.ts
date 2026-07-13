//
// Copyright 2026 DXOS.org
//

import type * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import type { Database, Key, Obj, Ref } from '@dxos/echo';
import type { Connection } from '@dxos/types';

import { meta } from '#meta';

/** Result of {@link ConnectorCoordinator.createConnection}: OAuth draft (`oauth-started`), custom dialog or login-hint dialog (`dialog-opened`), or unused sync persist (`connection-created`). */
export type CreateConnectionResult =
  | { kind: 'oauth-started'; draftConnectionId: string }
  | { kind: 'dialog-opened' }
  | { kind: 'connection-created'; connectionId: string };

/** Result of {@link ConnectorCoordinator.createCustomConnection}. */
export type CreateCustomConnectionResult = { kind: 'connection-created'; connectionId: string };

/**
 * Connection creation + OAuth: plugin-scoped `window.message` listener survives UI teardown (unlike hook-only OAuth). OAuth keeps stubs in memory until callback; DB writes only after success.
 */
export type ConnectorCoordinator = {
  /**
   * Create flow entry: OAuth → in-memory stubs + popup, persist on callback; non-OAuth → `PROVIDER_FORM_DIALOG`, then {@link createCustomConnection}. `connectorId` selects the registry entry stored on the Connection.
   * Connectors with `oauth.requiresLoginHint` open `OAUTH_LOGIN_HINT_DIALOG`
   * unless a `loginHint` is supplied. Connectors with
   * `oauth.useRedirectFlow` persist the pending entry to `localStorage`
   * and open the auth URL in a new tab; finalize runs in the new tab via
   * the `/redirect/oauth` NavigationHandler.
   */
  createConnection: (input: {
    db: Database.Database;
    spaceId: Key.SpaceId;
    connectorId: string;
    /** Optional existing local object to bind as the connection's first sync target (e.g. mailbox/calendar); forwarded to `onTokenCreated` and sync-target UI. */
    existingTarget?: Ref.Ref<Obj.Unknown>;
    /** Connector-specific hint forwarded to Edge as `loginHint` (atproto handle / DID). */
    loginHint?: string;
  }) => Effect.Effect<CreateConnectionResult, Error>;
  /** Persist manual token + Connection after `PROVIDER_FORM_DIALOG`; same finalize path as OAuth (navigation). */
  createCustomConnection: (input: {
    db: Database.Database;
    connectorId: string;
    source: string;
    account?: string;
    token: string;
    name?: string;
  }) => Effect.Effect<CreateCustomConnectionResult, Error>;
  /**
   * Form-driven submit dispatched from the generic connector-form dialog.
   * Looks up the connector, runs `connector.credentialForm.onSubmit`, and
   * branches on the result: `complete` finalizes directly (non-OAuth);
   * `oauth` re-enters {@link createConnection} with `loginHint`.
   */
  submitCredentialForm: (input: {
    db: Database.Database;
    spaceId: Key.SpaceId;
    connectorId: string;
    values: unknown;
    /** Existing local object to bind as the connection's sync target (e.g. an empty mailbox); forwarded from the connect dropdown so the form binds it instead of materializing a fresh target. */
    existingTarget?: Ref.Ref<Obj.Unknown>;
  }) => Effect.Effect<CreateConnectionResult, Error>;
  /**
   * Finalize a redirect-flow OAuth callback received via `/redirect/oauth`.
   * Restores the pending entry from `localStorage`, builds the
   * `AccessToken` + `Connection`, and runs the standard finalize path.
   * Called by the plugin NavigationHandler.
   */
  finalizeRedirectFlow: (input: { accessTokenId: string; accessToken: string }) => Effect.Effect<void, Error>;
  /**
   * Reconcile a connection's {@link SyncBinding} relations against the chosen
   * remote targets: materialize + bind newly-selected targets (binding the
   * first to `existingTarget` when supplied), remove deselected bindings. Owns
   * the connector-registry lookup + `materializeTarget` call, so it lives on the
   * coordinator rather than as a standalone operation.
   */
  setSyncBindings: (input: {
    db: Database.Database;
    connection: Ref.Ref<Connection.Connection>;
    selected: ReadonlyArray<{ remoteId: string; name?: string }>;
    existingTarget?: Ref.Ref<Obj.Unknown>;
  }) => Effect.Effect<{ added: number; removed: number }, Error>;
};

export const ConnectorCoordinator = Capability.make<ConnectorCoordinator>(
  `${meta.profile.key}.capability.connector-coordinator`,
);
