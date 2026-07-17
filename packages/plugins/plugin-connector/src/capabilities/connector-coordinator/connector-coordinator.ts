//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { LayoutOperation, Paths } from '@dxos/app-toolkit';
import { createEdgeIdentity } from '@dxos/client/edge';
import { type Operation } from '@dxos/compute';
import { Database, DXN, type Key, Obj, Ref } from '@dxos/echo';
import { EdgeHttpClient } from '@dxos/edge-client';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { AccessToken } from '@dxos/link';
import { log } from '@dxos/log';
// Explicit import so the emitted `.d.ts` references the package via its public
// alias instead of a relative `node_modules` path (TS2883).
import type { OperationInvoker } from '@dxos/operation';
import { ClientCapabilities } from '@dxos/plugin-client';

import { Connection, Connector, ConnectorCoordinator, type ConnectorEntry } from '#types';

import { PROVIDER_FORM_DIALOG, SYNC_TARGETS_DIALOG, connectionDeckSubject } from '../../constants';
import { ConnectionNotReauthenticatableError, ConnectorNotFoundError, SpaceUnavailableError } from '../../errors';
import { createSingleCursor } from './create-single-cursor';
import { decodeOAuthMessageData, initiateOAuthFlow, openOAuthPopupWindow, openOAuthRedirectWindow } from './oauth';
import { deletePendingSnapshot, readPendingSnapshot, writePendingSnapshot } from './pending-snapshot';
import { reconcileCursors } from './reconcile-cursors';

/**
 * Pending connection awaiting an OAuth callback.
 *
 * `mode: 'create'` persists a fresh AccessToken + Connection on success;
 * `mode: 'reauth'` updates the value of an already-persisted AccessToken in
 * place, leaving the Connection and its bindings untouched.
 */
type Pending = {
  mode: 'create' | 'reauth';
  token: AccessToken.AccessToken;
  connection: Connection.Connection;
  db: Database.Database;
  connector: ConnectorEntry;
  existingTarget?: Ref.Ref<Obj.Any>;
};

const resolveConnector = (
  getEntries: () => ConnectorEntry[],
  connectorId: string,
): Effect.Effect<ConnectorEntry, ConnectorNotFoundError> =>
  Effect.gen(function* () {
    const connector = getEntries().find((entry) => entry.id === connectorId);
    if (!connector) {
      return yield* Effect.fail(new ConnectorNotFoundError(connectorId));
    }
    return connector;
  });

const openConnectorFormDialog = (
  invoker: Operation.OperationService,
  input: {
    db: Database.Database;
    spaceId: Key.SpaceId;
    connector: ConnectorEntry;
    existingTarget?: Ref.Ref<Obj.Any>;
  },
) =>
  invoker.invoke(LayoutOperation.UpdateDialog, {
    subject: PROVIDER_FORM_DIALOG,
    state: true,
    blockAlign: 'start',
    props: {
      db: input.db,
      spaceId: input.spaceId,
      connectorId: input.connector.id,
      connectorLabel: input.connector.label ?? input.connector.id,
      // Forwarded so the credential-form submit binds this existing object (e.g. an empty Mailbox the
      // user is viewing) instead of materializing a fresh target. Mirrors the OAuth `existingTarget`.
      existingTarget: input.existingTarget,
    },
  });

const runOnTokenCreated = (
  connector: ConnectorEntry,
  input: {
    accessToken: AccessToken.AccessToken;
    connection: Connection.Connection;
    existingTarget?: Ref.Ref<Obj.Any>;
  },
): Effect.Effect<void, never> => {
  if (!connector.onTokenCreated) {
    return Effect.void;
  }
  return connector.onTokenCreated(input).pipe(
    Effect.provide(FetchHttpClient.layer),
    Effect.catchAll((error) =>
      Effect.sync(() => log.warn('onTokenCreated failed', { source: input.accessToken.source, error })),
    ),
    Effect.catchAllDefect((defect) =>
      Effect.sync(() => log.warn('onTokenCreated defect', { source: input.accessToken.source, defect })),
    ),
  );
};

const navigateToNewConnection = (
  invoker: Operation.OperationService,
  db: Database.Database,
  connectionId: string,
): Effect.Effect<void, never> =>
  invoker
    .invoke(LayoutOperation.Open, {
      subject: [connectionDeckSubject(Paths.getSpacePath(db.spaceId), connectionId)],
      navigation: 'immediate',
    })
    .pipe(Effect.catchAll((error) => Effect.sync(() => log.warn('navigate to new connection failed', { error }))));

const openSyncTargetsDialogAfterConnectionCreated = (
  invoker: Operation.OperationService,
  getSyncTargets: NonNullable<ConnectorEntry['getSyncTargets']>,
  persistedConnection: Connection.Connection,
  existingTarget: Ref.Ref<Obj.Any> | undefined,
): Effect.Effect<void, never> =>
  Effect.gen(function* () {
    const { targets } = yield* invoker.invoke(getSyncTargets, {
      connection: Ref.make(persistedConnection),
    });
    yield* invoker.invoke(LayoutOperation.UpdateDialog, {
      subject: SYNC_TARGETS_DIALOG,
      state: true,
      props: {
        connection: persistedConnection,
        availableTargets: targets ?? [],
        existingTarget,
      },
    });
  }).pipe(
    Effect.catchAll((error) => Effect.sync(() => log.warn('open sync-targets dialog after create failed', { error }))),
  );

const finalizePendingEntry = (invoker: Operation.OperationService, entry: Pending): Effect.Effect<void, never> =>
  Effect.gen(function* () {
    const { token, connection, db, connector, existingTarget } = entry;
    const persistedToken = db.add(token);
    const persistedConnection = db.add(connection);
    Obj.setParent(persistedToken, persistedConnection);

    yield* runOnTokenCreated(connector, {
      accessToken: persistedToken,
      connection: persistedConnection,
      existingTarget,
    });

    if (connector.getSyncTargets) {
      // Multi-target: let the user pick which remote targets to bind.
      yield* Effect.all(
        [
          // Skip navigation when the flow began from a pre-existing target (e.g. a
          // Mailbox): the user is already on that surface and expects to stay there.
          existingTarget ? Effect.void : navigateToNewConnection(invoker, db, persistedConnection.id),
          openSyncTargetsDialogAfterConnectionCreated(
            invoker,
            connector.getSyncTargets,
            persistedConnection,
            existingTarget,
          ),
        ],
        { concurrency: 'unbounded' },
      );
    } else {
      // Single-target (e.g. Gmail): materialize/bind one target immediately.
      yield* createSingleCursor(invoker, db, connector, persistedConnection, existingTarget);
      if (!existingTarget) {
        yield* navigateToNewConnection(invoker, db, persistedConnection.id);
      }
    }
  });

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* ClientCapabilities.Client;
    const invoker = yield* Capabilities.OperationInvoker;
    const pluginContext = yield* Capability.Service;

    let cachedEdgeClient: EdgeHttpClient | undefined;
    const getEdgeClient = (): EdgeHttpClient => {
      if (!cachedEdgeClient) {
        const edgeUrl = client.config.values.runtime?.services?.edge?.url;
        invariant(edgeUrl, 'EDGE services not configured.');
        const next = new EdgeHttpClient(edgeUrl);
        next.setIdentity(createEdgeIdentity(client));
        cachedEdgeClient = next;
      }
      return cachedEdgeClient;
    };

    const pending = new Map<string, Pending>();

    let edgeOrigin: string | undefined;

    const getConnectorEntries = (): ConnectorEntry[] => pluginContext.getAll(Connector).flat();

    const takePendingEntry = (accessTokenId: string): Pending | undefined => {
      const entry = pending.get(accessTokenId);
      if (!entry) {
        return undefined;
      }
      pending.delete(accessTokenId);
      return entry;
    };

    const handleOAuthPostMessage = (event: MessageEvent): Effect.Effect<void, never> =>
      Effect.gen(function* () {
        if (!edgeOrigin) {
          return;
        }
        if (event.origin !== edgeOrigin) {
          return;
        }
        const decoded = decodeOAuthMessageData(event.data);
        if (decoded.tag === 'invalid') {
          return;
        }
        if (decoded.tag === 'failure') {
          log.warn('oauth flow failed', { reason: decoded.reason });
          return;
        }
        const entry = takePendingEntry(decoded.accessTokenId);
        if (!entry) {
          return;
        }
        deletePendingSnapshot(decoded.accessTokenId);
        Obj.update(entry.token, (token) => {
          token.token = decoded.accessToken;
        });
        // Reauth refreshes an already-persisted token in place; the Connection
        // and its bindings are untouched, so there is nothing to finalize.
        if (entry.mode === 'reauth') {
          return;
        }
        yield* finalizePendingEntry(invoker, entry);
      });

    const handleMessage = (event: MessageEvent): void => {
      void EffectEx.runAndForwardErrors(handleOAuthPostMessage(event));
    };

    window.addEventListener('message', handleMessage);

    const mapCoordinatorError = (error: unknown): Error => (error instanceof Error ? error : new Error(String(error)));

    const createConnection: ConnectorCoordinator['createConnection'] = ({
      db,
      spaceId,
      connectorId,
      existingTarget,
      loginHint,
    }) =>
      Effect.gen(function* () {
        const connector = yield* resolveConnector(getConnectorEntries, connectorId);

        // Connector has a pre-flight form (atproto handle, IMAP creds, custom
        // token, …) — show it and let the form's submit re-enter via
        // `submitCredentialForm`. OAuth connectors re-enter here with
        // `loginHint`; non-OAuth connectors complete directly in the form.
        if (connector.credentialForm && loginHint === undefined) {
          yield* openConnectorFormDialog(invoker, { db, spaceId, connector, existingTarget });
          return { kind: 'dialog-opened' } as const;
        }

        // Non-OAuth connector with no `credentialForm`: fall back to the
        // generic connector-form dialog (renders the default custom-token
        // schema for backwards compatibility).
        if (!connector.oauth) {
          yield* openConnectorFormDialog(invoker, { db, spaceId, connector, existingTarget });
          return { kind: 'dialog-opened' } as const;
        }

        const oauth = connector.oauth;
        const label = connector.label ?? connector.id;
        // Pre-flight forms (atproto handle, …) supply a `loginHint` that
        // is meaningful as the account label too — store it so the
        // resulting Connection shows e.g. `user.bsky.social` rather than
        // just `bsky.app`.
        const account = loginHint;

        const token = Obj.make(AccessToken.AccessToken, {
          source: connector.source,
          ...(account ? { account } : {}),
          scopes: [...oauth.scopes],
          token: '',
        });
        const connection = Obj.make(Connection.Connection, {
          name: label,
          connectorId: connector.id,
          accessToken: Ref.make(token),
        });

        pending.set(token.id, { mode: 'create', token, connection, db, connector, existingTarget });

        // Written for all connectors: if window.opener is lost during auth, Edge
        // redirects the popup to /redirect/oauth and this snapshot is the only
        // recovery path.
        writePendingSnapshot(token.id, {
          mode: 'create',
          spaceId,
          connectorId: connector.id,
          tokenSnapshot: { source: connector.source, account, scopes: oauth.scopes },
          connectionSnapshot: { name: label, connectorId: connector.id },
          ...(existingTarget ? { existingTargetDxn: existingTarget.uri } : {}),
        });

        const edge = getEdgeClient();
        edgeOrigin = new URL(edge.baseUrl).origin;

        const { authUrl } = yield* initiateOAuthFlow(edge, spaceId, oauth, token.id, loginHint).pipe(
          Effect.tapError(() =>
            Effect.sync(() => {
              pending.delete(token.id);
              deletePendingSnapshot(token.id);
            }),
          ),
        );

        if (oauth.useRedirectFlow) {
          yield* openOAuthRedirectWindow(authUrl);
        } else {
          yield* openOAuthPopupWindow(authUrl);
        }

        return { kind: 'oauth-started', draftConnectionId: connection.id } as const;
      }).pipe(Effect.mapError(mapCoordinatorError));

    const reauthenticate: ConnectorCoordinator['reauthenticate'] = ({ db, connection: connectionRef }) =>
      Effect.gen(function* () {
        const connection = yield* Database.load(connectionRef);
        const connector = yield* resolveConnector(getConnectorEntries, connection.connectorId ?? '');
        if (!connector.oauth) {
          return yield* Effect.fail(new ConnectionNotReauthenticatableError(connector.id));
        }
        const accessToken = yield* Database.load(connection.accessToken);

        const oauth = connector.oauth;
        const spaceId = db.spaceId;
        // Reuse the account (e.g. an atproto handle) as the login hint so providers
        // that key authorization on it re-issue for the same identity.
        const loginHint = accessToken.account;

        // Keyed by the EXISTING token id so Edge routes the callback back to it;
        // `mode: 'reauth'` makes the finalize path update the value in place.
        pending.set(accessToken.id, { mode: 'reauth', token: accessToken, connection, db, connector });

        writePendingSnapshot(accessToken.id, {
          mode: 'reauth',
          spaceId,
          connectorId: connector.id,
          tokenSnapshot: { source: accessToken.source, account: accessToken.account, scopes: oauth.scopes },
          connectionSnapshot: {
            name: connection.name ?? connector.label ?? connector.id,
            connectorId: connector.id,
          },
          reauthAccessTokenDxn: connection.accessToken.uri,
        });

        const edge = getEdgeClient();
        edgeOrigin = new URL(edge.baseUrl).origin;

        const { authUrl } = yield* initiateOAuthFlow(edge, spaceId, oauth, accessToken.id, loginHint).pipe(
          Effect.tapError(() =>
            Effect.sync(() => {
              pending.delete(accessToken.id);
              deletePendingSnapshot(accessToken.id);
            }),
          ),
        );

        if (oauth.useRedirectFlow) {
          yield* openOAuthRedirectWindow(authUrl);
        } else {
          yield* openOAuthPopupWindow(authUrl);
        }
      }).pipe(Effect.provide(Database.layer(db)), Effect.mapError(mapCoordinatorError));

    const finalizeRedirectFlow: ConnectorCoordinator['finalizeRedirectFlow'] = ({
      accessTokenId,
      accessToken: accessTokenValue,
    }) =>
      Effect.gen(function* () {
        // Prefer the in-memory pending entry (same-tab redirect, rare).
        const inMemory = takePendingEntry(accessTokenId);
        if (inMemory) {
          deletePendingSnapshot(accessTokenId);
          Obj.update(inMemory.token, (token) => {
            token.token = accessTokenValue;
          });
          // Reauth refreshes the value in place; no new Connection to finalize.
          if (inMemory.mode === 'reauth') {
            return;
          }
          yield* finalizePendingEntry(invoker, inMemory);
          return;
        }

        // Recover from the persisted snapshot (new-tab redirect, the common case).
        const snapshot = readPendingSnapshot(accessTokenId);
        if (!snapshot) {
          log.warn('finalizeRedirectFlow: no pending snapshot', { accessTokenId });
          return;
        }
        deletePendingSnapshot(accessTokenId);

        const space = client.spaces.get(snapshot.spaceId);
        if (!space) {
          return yield* Effect.fail(new SpaceUnavailableError(snapshot.spaceId));
        }
        yield* Effect.tryPromise({
          try: () => space.waitUntilReady(),
          catch: (error) => new SpaceUnavailableError(snapshot.spaceId, error),
        });

        // Reauth: refresh the existing AccessToken value in place rather than
        // minting a new token + Connection.
        if (snapshot.mode === 'reauth') {
          const dxn = snapshot.reauthAccessTokenDxn ? DXN.tryMake(snapshot.reauthAccessTokenDxn) : undefined;
          if (!dxn) {
            log.warn('finalizeRedirectFlow: reauth snapshot missing access token dxn', { accessTokenId });
            return;
          }
          const tokenRef = space.db.makeRef<AccessToken.AccessToken>(dxn);
          const token = yield* Database.load(tokenRef).pipe(Effect.provide(Database.layer(space.db)));
          Obj.update(token, (token) => {
            token.token = accessTokenValue;
          });
          return;
        }

        const connector = yield* resolveConnector(getConnectorEntries, snapshot.connectorId);

        // Pin the AccessToken's echo id to the original `accessTokenId` so
        // Edge's tokenInfo (keyed by the id passed to /oauth/initiate) can
        // be looked up later by /atproto/proxy. Without this, the
        // snapshot-recovery path mints a fresh id that the proxy doesn't
        // know about and authenticated XRPC calls 500.
        const token = Obj.make(AccessToken.AccessToken, {
          id: accessTokenId,
          source: snapshot.tokenSnapshot.source,
          ...(snapshot.tokenSnapshot.account ? { account: snapshot.tokenSnapshot.account } : {}),
          scopes: [...snapshot.tokenSnapshot.scopes],
          token: accessTokenValue,
        });
        const connection = Obj.make(Connection.Connection, {
          name: snapshot.connectionSnapshot.name,
          connectorId: snapshot.connectionSnapshot.connectorId,
          accessToken: Ref.make(token),
        });

        const existingTarget = snapshot.existingTargetDxn
          ? space.db.makeRef<Obj.Any>(DXN.tryMake(snapshot.existingTargetDxn)!)
          : undefined;

        yield* finalizePendingEntry(invoker, {
          mode: 'create',
          token,
          connection,
          db: space.db,
          connector,
          existingTarget,
        });
      }).pipe(Effect.mapError(mapCoordinatorError));

    const createCustomConnection: ConnectorCoordinator['createCustomConnection'] = ({
      db,
      connectorId,
      source,
      account,
      token: tokenValue,
      name,
    }) =>
      Effect.gen(function* () {
        const connector = yield* resolveConnector(getConnectorEntries, connectorId);

        const accessToken = Obj.make(AccessToken.AccessToken, {
          source,
          account,
          token: tokenValue,
        });
        const connection = Obj.make(Connection.Connection, {
          name: name ?? account ?? source,
          connectorId: connector.id,
          accessToken: Ref.make(accessToken),
        });

        yield* finalizePendingEntry(invoker, {
          mode: 'create',
          token: accessToken,
          connection,
          db,
          connector,
        });

        return { kind: 'connection-created', connectionId: connection.id } as const;
      }).pipe(Effect.mapError(mapCoordinatorError));

    const submitCredentialForm: ConnectorCoordinator['submitCredentialForm'] = ({
      db,
      spaceId,
      connectorId,
      values,
      existingTarget,
    }) =>
      Effect.gen(function* () {
        const connector = yield* resolveConnector(getConnectorEntries, connectorId);
        if (!connector.credentialForm) {
          return yield* Effect.fail(new Error(`Connector ${connectorId} has no credentialForm.`));
        }

        const result = yield* connector.credentialForm.onSubmit({ values, connector, db });

        if (result.kind === 'complete') {
          yield* finalizePendingEntry(invoker, {
            mode: 'create',
            token: result.accessToken,
            connection: result.connection,
            db,
            connector,
            existingTarget,
          });
          return { kind: 'connection-created', connectionId: result.connection.id } as const;
        }

        // OAuth pre-flight: re-enter createConnection with the captured loginHint.
        // Guard against an empty hint — otherwise createConnection would re-open
        // the credential-form dialog and we'd loop.
        const loginHint = result.loginHint?.trim();
        if (!loginHint) {
          return yield* Effect.fail(new Error(`Connector ${connectorId} credentialForm produced an empty loginHint.`));
        }
        return yield* createConnection({ db, spaceId, connectorId, loginHint, existingTarget });
      }).pipe(Effect.mapError(mapCoordinatorError));

    const setCursors: ConnectorCoordinator['setCursors'] = ({
      db,
      connection: connectionRef,
      selected,
      existingTarget,
    }) =>
      Effect.gen(function* () {
        const connection = yield* Database.load(connectionRef);
        const connector = yield* resolveConnector(getConnectorEntries, connection.connectorId ?? '');
        return yield* reconcileCursors({ invoker, db, connection, connector, selected, existingTarget });
      }).pipe(Effect.provide(Database.layer(db)), Effect.mapError(mapCoordinatorError));

    return [
      Capability.provide(
        ConnectorCoordinator,
        {
          createConnection,
          reauthenticate,
          createCustomConnection,
          finalizeRedirectFlow,
          submitCredentialForm,
          setCursors,
        },
        () =>
          Effect.sync(() => {
            window.removeEventListener('message', handleMessage);
            pending.clear();
          }),
      ),
    ];
  }),
);
