//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { LayoutOperation, Paths } from '@dxos/app-toolkit';
import { createEdgeIdentity } from '@dxos/client/edge';
import { type Operation } from '@dxos/compute';
import { Context as DxContext } from '@dxos/context';
import { Database, DXN, type Key, Obj, Ref, Relation } from '@dxos/echo';
import { EdgeHttpClient } from '@dxos/edge-client';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client';
import { AccessToken } from '@dxos/types';

import { Connection, Connector, ConnectorCoordinator, type ConnectorEntry, SyncBinding } from '#types';

import {
  PROVIDER_FORM_DIALOG,
  SYNC_TARGETS_DIALOG,
  connectionDeckSubject,
  pendingConnectionStorageKey,
} from '../constants';
import { ConnectorNotFoundError, SpaceUnavailableError } from '../errors';
import { reconcileSyncBindings } from '../operations/reconcile-sync-bindings';

/** Pending connection awaiting an OAuth callback. */
type Pending = {
  token: AccessToken.AccessToken;
  connection: Connection.Connection;
  db: Database.Database;
  connector: ConnectorEntry;
  existingTarget?: Ref.Ref<Obj.Any>;
};

/**
 * Parses `postMessage` payload from the OAuth relay into a narrow result.
 * Unknown shapes are ignored so arbitrary messages do not reach domain logic.
 */
const decodeOAuthMessageData = (
  data: unknown,
):
  | { tag: 'success'; accessTokenId: string; accessToken: string }
  | { tag: 'failure'; reason: string }
  | { tag: 'invalid' } => {
  if (data === null || data === undefined || typeof data !== 'object') {
    return { tag: 'invalid' };
  }
  const record = data as Record<string, unknown>;
  if (record.success === true) {
    const accessTokenId = record.accessTokenId;
    const accessToken = record.accessToken;
    if (typeof accessTokenId === 'string' && typeof accessToken === 'string') {
      return { tag: 'success', accessTokenId, accessToken };
    }
    return { tag: 'invalid' };
  }
  if (record.success === false && typeof record.reason === 'string') {
    return { tag: 'failure', reason: record.reason };
  }
  return { tag: 'invalid' };
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
  input: { db: Database.Database; spaceId: Key.SpaceId; connector: ConnectorEntry },
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

/**
 * Create exactly one binding for a single-target connector (no `getSyncTargets`):
 * bind a supplied `existingTarget` or materialize a fresh local root. Replaces
 * the old `onTokenCreated`-creates-the-target path (e.g. Gmail's Mailbox).
 */
const createSingleBinding = (
  invoker: Operation.OperationService,
  db: Database.Database,
  connector: ConnectorEntry,
  connection: Connection.Connection,
  existingTarget: Ref.Ref<Obj.Any> | undefined,
): Effect.Effect<void, never> =>
  Effect.gen(function* () {
    let target: Obj.Unknown | undefined;
    if (existingTarget) {
      target = yield* Database.load(existingTarget);
    } else if (connector.materializeTarget) {
      const { target: materialized } = yield* invoker.invoke(
        connector.materializeTarget,
        { connection: Ref.make(connection) },
        { spaceId: db.spaceId },
      );
      target = yield* Database.load(materialized);
    }
    if (!target) {
      log.warn('single-target connector cannot create a binding', { connectorId: connection.connectorId });
      return;
    }
    yield* Database.add(SyncBinding.make({ [Relation.Source]: connection, [Relation.Target]: target }));
  }).pipe(
    Effect.provide(Database.layer(db)),
    Effect.catchAll((error) => Effect.sync(() => log.warn('create single binding failed', { error }))),
    Effect.catchAllDefect((defect) => Effect.sync(() => log.warn('create single binding defect', { defect }))),
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
      yield* createSingleBinding(invoker, db, connector, persistedConnection, existingTarget);
      if (!existingTarget) {
        yield* navigateToNewConnection(invoker, db, persistedConnection.id);
      }
    }
  });

const initiateOAuthFlow = (
  edge: EdgeHttpClient,
  spaceId: Key.SpaceId,
  oauth: NonNullable<ConnectorEntry['oauth']>,
  accessTokenId: string,
  loginHint: string | undefined,
): Effect.Effect<{ authUrl: string }, Error> =>
  Effect.tryPromise({
    try: () =>
      edge.initiateOAuthFlow(DxContext.default(), {
        provider: oauth.provider,
        scopes: [...oauth.scopes],
        spaceId,
        accessTokenId,
        ...(loginHint ? { loginHint } : {}),
      }),
    catch: (error) => (error instanceof Error ? error : new Error(String(error))),
  });

const openOAuthPopupWindow = (authUrl: string): Effect.Effect<void, never> =>
  Effect.sync(() => {
    window.open(authUrl, 'oauthPopup', 'width=500,height=600');
  });

/**
 * Open the auth URL in a new top-level browser tab. Used for
 * `useRedirectFlow` connectors (e.g. atproto) where the auth server
 * nullifies `window.opener` and rejects popups.
 */
const openOAuthRedirectWindow = (authUrl: string): Effect.Effect<void, never> =>
  Effect.sync(() => {
    window.open(authUrl, '_blank');
  });

/** Snapshot of an in-flight OAuth flow persisted in `localStorage` for redirect-flow connectors. */
type PendingSnapshot = {
  spaceId: Key.SpaceId;
  connectorId: string;
  tokenSnapshot: { source: string; account?: string; scopes: readonly string[] };
  connectionSnapshot: { name: string; connectorId: string };
  /** Serialized DXN of the existing target to bind the first new selection to. */
  existingTargetDxn?: string;
};

const writePendingSnapshot = (accessTokenId: string, snapshot: PendingSnapshot): void => {
  try {
    localStorage.setItem(pendingConnectionStorageKey(accessTokenId), JSON.stringify(snapshot));
  } catch (error) {
    log.warn('failed to persist pending connection snapshot', { error });
  }
};

const readPendingSnapshot = (accessTokenId: string): PendingSnapshot | undefined => {
  const raw = localStorage.getItem(pendingConnectionStorageKey(accessTokenId));
  if (!raw) {
    return undefined;
  }
  try {
    return JSON.parse(raw) as PendingSnapshot;
  } catch (error) {
    log.warn('failed to parse pending connection snapshot', { error });
    return undefined;
  }
};

const deletePendingSnapshot = (accessTokenId: string): void => {
  localStorage.removeItem(pendingConnectionStorageKey(accessTokenId));
};

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* Capability.get(ClientCapabilities.Client);
    const invoker = yield* Capability.get(Capabilities.OperationInvoker);
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
          yield* openConnectorFormDialog(invoker, { db, spaceId, connector });
          return { kind: 'dialog-opened' } as const;
        }

        // Non-OAuth connector with no `credentialForm`: fall back to the
        // generic connector-form dialog (renders the default custom-token
        // schema for backwards compatibility).
        if (!connector.oauth) {
          yield* openConnectorFormDialog(invoker, { db, spaceId, connector });
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

        pending.set(token.id, { token, connection, db, connector, existingTarget });

        // Written for all connectors: if window.opener is lost during auth, Edge
        // redirects the popup to /redirect/oauth and this snapshot is the only
        // recovery path.
        writePendingSnapshot(token.id, {
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

        yield* finalizePendingEntry(invoker, { token, connection, db: space.db, connector, existingTarget });
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
          token: accessToken,
          connection,
          db,
          connector,
        });

        return { kind: 'connection-created', connectionId: connection.id } as const;
      }).pipe(Effect.mapError(mapCoordinatorError));

    const submitCredentialForm: ConnectorCoordinator['submitCredentialForm'] = ({ db, spaceId, connectorId, values }) =>
      Effect.gen(function* () {
        const connector = yield* resolveConnector(getConnectorEntries, connectorId);
        if (!connector.credentialForm) {
          return yield* Effect.fail(new Error(`Connector ${connectorId} has no credentialForm.`));
        }

        const result = yield* connector.credentialForm.onSubmit({ values, connector, db });

        if (result.kind === 'complete') {
          yield* finalizePendingEntry(invoker, {
            token: result.accessToken,
            connection: result.connection,
            db,
            connector,
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
        return yield* createConnection({ db, spaceId, connectorId, loginHint });
      }).pipe(Effect.mapError(mapCoordinatorError));

    const setSyncBindings: ConnectorCoordinator['setSyncBindings'] = ({
      db,
      connection: connectionRef,
      selected,
      existingTarget,
    }) =>
      Effect.gen(function* () {
        const connection = yield* Database.load(connectionRef);
        const connector = yield* resolveConnector(getConnectorEntries, connection.connectorId ?? '');
        return yield* reconcileSyncBindings({ invoker, db, connection, connector, selected, existingTarget });
      }).pipe(Effect.provide(Database.layer(db)), Effect.mapError(mapCoordinatorError));

    return Capability.contributes(
      ConnectorCoordinator,
      { createConnection, createCustomConnection, finalizeRedirectFlow, submitCredentialForm, setSyncBindings },
      () =>
        Effect.sync(() => {
          window.removeEventListener('message', handleMessage);
          pending.clear();
        }),
    );
  }),
);
