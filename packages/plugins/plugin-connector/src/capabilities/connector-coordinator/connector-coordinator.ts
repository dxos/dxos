//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as FetchHttpClient from 'effect/unstable/http/FetchHttpClient';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import type * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Credential from '@dxos/compute/Credential';
import type * as Operation from '@dxos/compute/Operation';
import * as Routine from '@dxos/compute/Routine';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import { Database, EID, type Key, Obj, Ref, Type } from '@dxos/echo';
import { EdgeHttpClient } from '@dxos/edge-client';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { AccessToken, Connection } from '@dxos/link';
import { log } from '@dxos/log';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';

import { meta } from '#meta';
import { ConnectorCoordination, ConnectorSpec } from '#types';

import * as Binding from '../../Binding.ts';
import { PROVIDER_FORM_DIALOG, SYNC_TARGETS_DIALOG, connectionDeckSubject } from '../../constants.ts';
import { ConnectionNotReauthenticatableError, ConnectorNotFoundError, SpaceUnavailableError } from '../../errors.ts';
import * as SyncTemplate from '../../SyncTemplate.ts';
import { autoSyncConnection } from './auto-sync.ts';
import { createSingleCursor } from './create-single-cursor.ts';
import { beginOAuthFlow, decodeOAuthMessageData, isOAuthShapedMessage } from './oauth.ts';
import { deletePendingSnapshot, readPendingSnapshot, writePendingSnapshot } from './pending-snapshot.ts';
import { reconcileCursors } from './reconcile-cursors.ts';

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
  connector: ConnectorSpec.ConnectorEntry;
  existingTarget?: Ref.Ref<Obj.Any>;
};

const resolveConnector = (
  getEntries: () => ConnectorSpec.ConnectorEntry[],
  connectorId: string,
): Effect.Effect<ConnectorSpec.ConnectorEntry, ConnectorNotFoundError> =>
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
    connector: ConnectorSpec.ConnectorEntry;
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
  connector: ConnectorSpec.ConnectorEntry,
  serviceResolver: ServiceResolver.ServiceResolver,
  db: Database.Database,
  input: {
    accessToken: AccessToken.AccessToken;
    connection: Connection.Connection;
    existingTarget?: Ref.Ref<Obj.Any>;
  },
): Effect.Effect<void, never> => {
  const onTokenCreated = connector.onTokenCreated;
  if (!onTokenCreated) {
    return Effect.void;
  }
  return onTokenCreated(input).pipe(
    Effect.provide(FetchHttpClient.layer),
    // Resolved through the process manager so the connector reads its credential from the same
    // space-scoped `CredentialsService` operations use.
    Effect.provide(
      ServiceResolver.provide({ space: db.spaceId }, Credential.CredentialsService).pipe(
        Layer.provide(Layer.succeed(ServiceResolver.ServiceResolver, serviceResolver)),
      ),
    ),
    Effect.catch((error) =>
      Effect.sync(() => log.warn('onTokenCreated failed', { source: input.accessToken.source, error })),
    ),
    Effect.catchDefect((defect) =>
      Effect.sync(() => log.warn('onTokenCreated defect', { source: input.accessToken.source, defect })),
    ),
  );
};

/**
 * Tell the user a sign-in was discarded.
 *
 * The provider's reply arrives on a channel the user cannot see, so a rejected one leaves the flow
 * looking merely unfinished — they completed the popup and the app shows the same Connect button as
 * before. The log records the reason; this is the part they can act on.
 */
const reportOAuthRejected = (invoker: Operation.OperationService, descriptionKey: string): Effect.Effect<void, never> =>
  Effect.ignore(
    invoker.invoke(LayoutOperation.AddToast, {
      id: `${meta.profile.key}.oauth-rejected`,
      icon: 'ph--warning--regular',
      title: ['oauth-rejected.title', { ns: meta.profile.key }],
      description: [descriptionKey, { ns: meta.profile.key }],
    }),
  );

/** Report a sign-in the provider itself rejected, carrying its reason verbatim. */
const reportOAuthFailed = (invoker: Operation.OperationService, reason: string): Effect.Effect<void, never> =>
  Effect.ignore(
    invoker.invoke(LayoutOperation.AddToast, {
      id: `${meta.profile.key}.oauth-failed`,
      icon: 'ph--warning--regular',
      title: ['oauth-failed.title', { ns: meta.profile.key }],
      description: reason,
    }),
  );

const navigateToNewConnection = (
  invoker: Operation.OperationService,
  db: Database.Database,
  connectionId: string,
): Effect.Effect<void, never> =>
  invoker
    .invoke(LayoutOperation.Open, {
      subject: [connectionDeckSubject(GraphPath.getSpacePath(db.spaceId), connectionId)],
      navigation: 'immediate',
    })
    .pipe(Effect.catch((error) => Effect.sync(() => log.warn('navigate to new connection failed', { error }))));

/**
 * Offer the recurring sync routine through the seeded create-routine form, so nothing is persisted
 * without the user seeing it; saving runs the first sync through the saved trigger (the dispatcher
 * drives `Operation.runAgain()` continuation for a capped first sync), cancelling runs nothing.
 */
const openCreateSyncRoutineDialog = (
  invoker: Operation.OperationService,
  capabilities: CapabilityManager.CapabilityManager,
  db: Database.Database,
  connector: ConnectorSpec.ConnectorEntry,
  connection: Connection.Connection,
  subject: Obj.Unknown,
): Effect.Effect<void, never> =>
  Effect.gen(function* () {
    const result = yield* invoker.invoke(SpaceOperation.OpenObjectForm, {
      target: db,
      typename: Type.getTypename(Routine.Routine),
      // `subject` may be the connection or a bound target — the template resolves either to the account.
      defaults: { templateId: SyncTemplate.ID, subject },
      navigable: false,
    });
    // The trigger is read off the saved routine — a `findTrigger` lookup here would race the
    // reverse-ref index — and the user's save is the ask, so `sync.auto` does not gate it.
    const created = result?.target;
    if (created) {
      Effect.runFork(
        Binding.syncCreatedRoutine({ created, connector, spaceId: db.spaceId }).pipe(
          Effect.provideService(Capability.Service, capabilities),
          Effect.catch((error) => Effect.sync(() => log.warn('first sync after routine created failed', { error }))),
          // An EDGE force-run that outlives its replication backoff arrives as a defect
          // (`Effect.orDie`), which the typed catch above would let escape unreported.
          Effect.catchDefect((defect) =>
            Effect.sync(() => log.warn('first sync after routine created died', { defect })),
          ),
        ),
      );
    }
  }).pipe(Effect.catch((error) => Effect.sync(() => log.warn('open create sync routine dialog failed', { error }))));

const openSyncTargetsDialogAfterConnectionCreated = (
  invoker: Operation.OperationService,
  getTargets: NonNullable<NonNullable<ConnectorSpec.ConnectorEntry['sync']>['getTargets']>,
  persistedConnection: Connection.Connection,
  existingTarget: Ref.Ref<Obj.Any> | undefined,
): Effect.Effect<void, never> =>
  Effect.gen(function* () {
    const { targets } = yield* invoker.invoke(getTargets, {
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
    Effect.catch((error) => Effect.sync(() => log.warn('open sync-targets dialog after create failed', { error }))),
  );

const finalizePendingEntry = (
  invoker: Operation.OperationService,
  capabilities: CapabilityManager.CapabilityManager,
  serviceResolver: ServiceResolver.ServiceResolver,
  entry: Pending,
): Effect.Effect<void, never> =>
  Effect.gen(function* () {
    const { token, connection, db, connector, existingTarget } = entry;
    const persistedToken = db.add(token);
    const persistedConnection = db.add(connection);
    Obj.setParent(persistedToken, persistedConnection);

    yield* runOnTokenCreated(connector, serviceResolver, db, {
      accessToken: persistedToken,
      connection: persistedConnection,
      existingTarget,
    });

    if (connector.sync?.getTargets) {
      // Multi-target: let the user pick which remote targets to bind.
      yield* Effect.all(
        [
          // Skip navigation when the flow began from a pre-existing target (e.g. a
          // Mailbox): the user is already on that surface and expects to stay there.
          existingTarget ? Effect.void : navigateToNewConnection(invoker, db, persistedConnection.id),
          openSyncTargetsDialogAfterConnectionCreated(
            invoker,
            connector.sync.getTargets,
            persistedConnection,
            existingTarget,
          ),
        ],
        { concurrency: 'unbounded' },
      );
    } else {
      // Single-target (e.g. Gmail): materialize/bind one target immediately.
      const bound = yield* createSingleCursor(invoker, db, connector, persistedConnection, existingTarget);
      if (!existingTarget) {
        yield* navigateToNewConnection(invoker, db, persistedConnection.id);
      }
      if (bound?.needsSyncRoutine) {
        // Ordered after navigation so the dialog opens over the surface the user lands on.
        yield* openCreateSyncRoutineDialog(invoker, capabilities, db, connector, persistedConnection, bound.target);
      } else {
        // Ordered after navigation so the user lands on the target while the first sync fills it in.
        yield* autoSyncConnection(invoker, capabilities, db, connector, persistedConnection);
      }
    }
  });

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* ClientCapabilities.Client;
    const identityService = yield* ClientCapabilities.IdentityService;
    const invoker = yield* Capabilities.OperationInvoker;
    const serviceResolver = yield* Capabilities.ServiceResolver;
    const pluginContext = yield* Capability.Service;

    let cachedEdgeClient: EdgeHttpClient | undefined;
    const getEdgeClient = (): EdgeHttpClient => {
      if (!cachedEdgeClient) {
        const edgeUrl = client.config.values.runtime?.services?.edge?.url;
        invariant(edgeUrl, 'EDGE services not configured.');
        const next = new EdgeHttpClient(edgeUrl);
        const edgeIdentity = identityService.getEdgeIdentity();
        invariant(Option.isSome(edgeIdentity), 'Identity not available.');
        next.setIdentity(edgeIdentity.value);
        cachedEdgeClient = next;
      }
      return cachedEdgeClient;
    };

    const pending = new Map<string, Pending>();

    let edgeOrigin: string | undefined;

    const getConnectorEntries = (): ConnectorSpec.ConnectorEntry[] =>
      pluginContext.getAll(ConnectorSpec.Connector).flat();

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
        // The window receives unrelated `postMessage` traffic (HMR, embeds), so these rejections are
        // reported only for payloads shaped like an OAuth reply — enough to tell "the relay answered
        // and we discarded it" from "the relay never answered", which silence cannot.
        if (!edgeOrigin) {
          if (isOAuthShapedMessage(event.data)) {
            log.warn('oauth message before any flow started', { origin: event.origin });
          }
          return;
        }
        if (event.origin !== edgeOrigin) {
          if (isOAuthShapedMessage(event.data)) {
            log.warn('oauth message from an unexpected origin', { origin: event.origin, expected: edgeOrigin });
            yield* reportOAuthRejected(invoker, 'oauth-rejected.description');
          }
          return;
        }
        const decoded = decodeOAuthMessageData(event.data);
        if (decoded.tag === 'invalid') {
          log.warn('oauth message could not be decoded', {
            origin: event.origin,
            keys: event.data && typeof event.data === 'object' ? Object.keys(event.data) : typeof event.data,
          });
          yield* reportOAuthRejected(invoker, 'oauth-undecodable.description');
          return;
        }
        if (decoded.tag === 'failure') {
          log.warn('oauth flow failed', { reason: decoded.reason });
          // The provider's own reason, not one of ours: it is the only account of what went wrong.
          yield* reportOAuthFailed(invoker, decoded.reason);
          return;
        }
        const entry = takePendingEntry(decoded.accessTokenId);
        if (!entry) {
          // The in-memory map is per page load, so a reload mid-flow empties it. The persisted
          // snapshot is the recovery path (`finalizeRedirectFlow`); leave it in place for that and
          // say so, because returning silently here is indistinguishable from a completed flow.
          log.warn('oauth message has no pending entry — leaving snapshot for redirect recovery', {
            accessTokenId: decoded.accessTokenId,
            hasSnapshot: !!readPendingSnapshot(decoded.accessTokenId),
          });
          return;
        }
        log.info('oauth message accepted', { accessTokenId: decoded.accessTokenId, mode: entry.mode });
        deletePendingSnapshot(decoded.accessTokenId);
        Obj.update(entry.token, (token) => {
          token.token = decoded.accessToken;
        });
        // Reauth refreshes an already-persisted token in place; the Connection
        // and its bindings are untouched, so there is nothing to finalize.
        if (entry.mode === 'reauth') {
          return;
        }
        yield* finalizePendingEntry(invoker, pluginContext, serviceResolver, entry);
      });

    const handleMessage = (event: MessageEvent): void => {
      void EffectEx.runAndForwardErrors(handleOAuthPostMessage(event));
    };

    window.addEventListener('message', handleMessage);

    const mapCoordinatorError = (error: unknown): Error => (error instanceof Error ? error : new Error(String(error)));

    const createConnection: ConnectorCoordination.ConnectorCoordinator['createConnection'] = ({
      db,
      spaceId,
      connectorId,
      existingTarget,
      loginHint,
    }) =>
      Effect.gen(function* () {
        const connector = yield* resolveConnector(getConnectorEntries, connectorId);

        // ConnectorSpec.Connector has a pre-flight form (atproto handle, IMAP creds, custom
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
          ...(existingTarget ? { existingTargetUri: existingTarget.uri } : {}),
        });

        const edge = getEdgeClient();
        edgeOrigin = new URL(edge.baseUrl).origin;

        yield* beginOAuthFlow(edge, spaceId, oauth, token.id, loginHint).pipe(
          Effect.tapError(() =>
            Effect.sync(() => {
              pending.delete(token.id);
              deletePendingSnapshot(token.id);
            }),
          ),
        );

        return { kind: 'oauth-started', draftConnectionId: connection.id } as const;
      }).pipe(Effect.mapError(mapCoordinatorError));

    const reauthenticate: ConnectorCoordination.ConnectorCoordinator['reauthenticate'] = ({
      db,
      connection: connectionRef,
    }) =>
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
          reauthAccessTokenUri: connection.accessToken.uri,
        });

        const edge = getEdgeClient();
        edgeOrigin = new URL(edge.baseUrl).origin;

        yield* beginOAuthFlow(edge, spaceId, oauth, accessToken.id, loginHint).pipe(
          Effect.tapError(() =>
            Effect.sync(() => {
              pending.delete(accessToken.id);
              deletePendingSnapshot(accessToken.id);
            }),
          ),
        );
      }).pipe(Effect.provide(Database.layer(db)), Effect.mapError(mapCoordinatorError));

    const finalizeRedirectFlow: ConnectorCoordination.ConnectorCoordinator['finalizeRedirectFlow'] = ({
      accessTokenId,
      accessToken: accessTokenValue,
    }) =>
      Effect.gen(function* () {
        log.info('finalizeRedirectFlow', { accessTokenId });
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
          yield* finalizePendingEntry(invoker, pluginContext, serviceResolver, inMemory);
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
          const tokenUri = snapshot.reauthAccessTokenUri ? EID.tryParse(snapshot.reauthAccessTokenUri) : undefined;
          if (!tokenUri) {
            log.warn('finalizeRedirectFlow: reauth snapshot missing access token uri', {
              accessTokenId,
              uri: snapshot.reauthAccessTokenUri,
            });
            return;
          }
          const tokenRef = space.db.makeRef<AccessToken.AccessToken>(tokenUri);
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

        // A snapshot that names a target but cannot be parsed must not fall through as "no target":
        // `createSingleCursor` would then materialize a second root and bind that instead, leaving the
        // object the user started from unbound with its Connect action still showing.
        const existingTargetUri = snapshot.existingTargetUri ? EID.tryParse(snapshot.existingTargetUri) : undefined;
        if (snapshot.existingTargetUri && !existingTargetUri) {
          log.warn('finalizeRedirectFlow: unparseable existing target uri', {
            accessTokenId,
            uri: snapshot.existingTargetUri,
          });
          return;
        }
        const existingTarget = existingTargetUri ? space.db.makeRef<Obj.Any>(existingTargetUri) : undefined;

        yield* finalizePendingEntry(invoker, pluginContext, serviceResolver, {
          mode: 'create',
          token,
          connection,
          db: space.db,
          connector,
          existingTarget,
        });
      }).pipe(Effect.mapError(mapCoordinatorError));

    const createCustomConnection: ConnectorCoordination.ConnectorCoordinator['createCustomConnection'] = ({
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

        yield* finalizePendingEntry(invoker, pluginContext, serviceResolver, {
          mode: 'create',
          token: accessToken,
          connection,
          db,
          connector,
        });

        return { kind: 'connection-created', connectionId: connection.id } as const;
      }).pipe(Effect.mapError(mapCoordinatorError));

    const submitCredentialForm: ConnectorCoordination.ConnectorCoordinator['submitCredentialForm'] = ({
      db,
      spaceId,
      connectorId,
      values,
      existingTarget,
    }) =>
      Effect.gen(function* () {
        const connector = yield* resolveConnector(getConnectorEntries, connectorId);
        if (!connector.credentialForm) {
          return yield* Effect.fail(new Error(`ConnectorSpec.Connector ${connectorId} has no credentialForm.`));
        }

        const result = yield* connector.credentialForm.onSubmit({ values, connector, db });

        if (result.kind === 'complete') {
          yield* finalizePendingEntry(invoker, pluginContext, serviceResolver, {
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
          return yield* Effect.fail(
            new Error(`ConnectorSpec.Connector ${connectorId} credentialForm produced an empty loginHint.`),
          );
        }
        return yield* createConnection({ db, spaceId, connectorId, loginHint, existingTarget });
      }).pipe(Effect.mapError(mapCoordinatorError));

    const setCursors: ConnectorCoordination.ConnectorCoordinator['setCursors'] = ({
      db,
      connection: connectionRef,
      selected,
      existingTarget,
    }) =>
      Effect.gen(function* () {
        const connection = yield* Database.load(connectionRef);
        const connector = yield* resolveConnector(getConnectorEntries, connection.connectorId ?? '');
        const { added, removed, existing } = yield* reconcileCursors({
          invoker,
          db,
          connection,
          connector,
          selected,
          existingTarget,
        });
        // Initial setup of a multi-target connector: the connection had no bindings until this
        // submit, so this is the routine-offer / first-sync moment. A later change of targets is
        // left to the user — new bindings are covered by the account routine's fan-out.
        if (existing === 0 && added > 0) {
          const trigger = connector.sync?.trigger ? yield* Binding.findTrigger(connection) : undefined;
          if (connector.sync?.trigger && !trigger) {
            // One form for the whole account, regardless of how many targets were picked; saving
            // runs the first sync.
            yield* openCreateSyncRoutineDialog(invoker, pluginContext, db, connector, connection, connection);
          } else {
            yield* autoSyncConnection(invoker, pluginContext, db, connector, connection);
          }
        }
        return { added, removed };
      }).pipe(Effect.provide(Database.layer(db)), Effect.mapError(mapCoordinatorError));

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        window.removeEventListener('message', handleMessage);
        pending.clear();
      }),
    );
    return Capability.contribute(ConnectorCoordination.ConnectorCoordinator, {
      createConnection,
      reauthenticate,
      createCustomConnection,
      finalizeRedirectFlow,
      submitCredentialForm,
      setCursors,
    });
  }),
);
