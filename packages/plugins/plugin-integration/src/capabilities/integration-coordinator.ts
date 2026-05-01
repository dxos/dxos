//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { LayoutOperation, getSpacePath } from '@dxos/app-toolkit';
import { createEdgeIdentity } from '@dxos/client/edge';
import type { Operation as OperationExports } from '@dxos/compute';
import { Context as DxContext } from '@dxos/context';
import { type Database, type Key, Obj, Ref } from '@dxos/echo';
import { EdgeHttpClient } from '@dxos/edge-client';
import { runAndForwardErrors } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client/types';
import { AccessToken } from '@dxos/types';

import { IntegrationCoordinator, IntegrationProvider, type IntegrationProviderEntry } from '#types';

import { CUSTOM_TOKEN_DIALOG, SYNC_TARGETS_DIALOG } from '../constants';
import { IntegrationProviderNotFoundError } from '../errors';
import { IntegrationOperation } from '../operations';
import { Integration } from '../types';

/** Pending integration awaiting an OAuth callback. */
type Pending = {
  token: AccessToken.AccessToken;
  integration: Integration.Integration;
  db: Database.Database;
  provider: IntegrationProviderEntry;
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

const resolveProvider = (
  getEntries: () => IntegrationProviderEntry[],
  providerId: string,
): Effect.Effect<IntegrationProviderEntry, IntegrationProviderNotFoundError> =>
  Effect.gen(function* () {
    const provider = getEntries().find((p) => p.id === providerId);
    if (!provider) {
      return yield* Effect.fail(new IntegrationProviderNotFoundError(providerId));
    }
    return provider;
  });

const openCustomTokenDialog = (
  invoker: OperationExports.OperationService,
  input: { db: Database.Database; provider: IntegrationProviderEntry },
) =>
  invoker.invoke(LayoutOperation.UpdateDialog, {
    subject: CUSTOM_TOKEN_DIALOG,
    state: true,
    blockAlign: 'start',
    props: {
      db: input.db,
      providerId: input.provider.id,
      providerLabel: input.provider.label ?? input.provider.id,
    },
  });

const dispatchAccessTokenCreated = (
  invoker: OperationExports.OperationService,
  accessToken: AccessToken.AccessToken,
): Effect.Effect<void, never> =>
  invoker
    .invoke(IntegrationOperation.AccessTokenCreated, { accessToken })
    .pipe(Effect.catchAll((error) => Effect.sync(() => log.warn('AccessTokenCreated dispatch failed', { error }))));

const runOnTokenCreated = (
  provider: IntegrationProviderEntry,
  input: {
    accessToken: AccessToken.AccessToken;
    integration: Integration.Integration;
    existingTarget?: Ref.Ref<Obj.Any>;
  },
): Effect.Effect<void, never> => {
  if (!provider.onTokenCreated) {
    return Effect.void;
  }
  return provider.onTokenCreated(input).pipe(
    Effect.provide(FetchHttpClient.layer),
    Effect.catchAll((error) =>
      Effect.sync(() => log.warn('onTokenCreated failed', { source: input.accessToken.source, error })),
    ),
    Effect.catchAllDefect((defect) =>
      Effect.sync(() => log.warn('onTokenCreated defect', { source: input.accessToken.source, defect })),
    ),
  );
};

const navigateToNewIntegration = (
  invoker: OperationExports.OperationService,
  db: Database.Database,
  integrationId: string,
): Effect.Effect<void, never> =>
  invoker
    .invoke(LayoutOperation.Open, {
      subject: [`${getSpacePath(db.spaceId)}/integrations/${integrationId}`],
      navigation: 'immediate',
    })
    .pipe(Effect.catchAll((error) => Effect.sync(() => log.warn('navigate to new integration failed', { error }))));

const openSyncTargetsDialogAfterIntegrationCreated = (
  invoker: OperationExports.OperationService,
  getSyncTargets: NonNullable<IntegrationProviderEntry['getSyncTargets']>,
  persistedIntegration: Integration.Integration,
  existingTarget: Ref.Ref<Obj.Any> | undefined,
): Effect.Effect<void, never> =>
  Effect.gen(function* () {
    const { targets } = yield* invoker.invoke(getSyncTargets, {
      integration: Ref.make(persistedIntegration),
    });
    yield* invoker.invoke(LayoutOperation.UpdateDialog, {
      subject: SYNC_TARGETS_DIALOG,
      state: true,
      props: {
        integration: persistedIntegration,
        availableTargets: targets ?? [],
        existingTarget,
      },
    });
  }).pipe(
    Effect.catchAll((error) => Effect.sync(() => log.warn('open sync-targets dialog after create failed', { error }))),
  );

const finalizePendingEntry = (invoker: OperationExports.OperationService, entry: Pending): Effect.Effect<void, never> =>
  Effect.gen(function* () {
    const { token, integration, db, provider, existingTarget } = entry;
    const persistedToken = db.add(token);
    const persistedIntegration = db.add(integration);
    Obj.setParent(persistedToken, persistedIntegration);

    yield* dispatchAccessTokenCreated(invoker, persistedToken);

    yield* runOnTokenCreated(provider, {
      accessToken: persistedToken,
      integration: persistedIntegration,
      existingTarget,
    });

    yield* Effect.all(
      [
        navigateToNewIntegration(invoker, db, persistedIntegration.id),
        provider.getSyncTargets
          ? openSyncTargetsDialogAfterIntegrationCreated(
              invoker,
              provider.getSyncTargets,
              persistedIntegration,
              existingTarget,
            )
          : Effect.void,
      ],
      { concurrency: 'unbounded' },
    );
  });

const initiateOAuthFlow = (
  edge: EdgeHttpClient,
  spaceId: Key.SpaceId,
  oauth: NonNullable<IntegrationProviderEntry['oauth']>,
  accessTokenId: string,
): Effect.Effect<{ authUrl: string }, Error> =>
  Effect.tryPromise({
    try: () =>
      edge.initiateOAuthFlow(DxContext.default(), {
        provider: oauth.provider,
        scopes: [...oauth.scopes],
        spaceId,
        accessTokenId,
      }),
    catch: (error) => (error instanceof Error ? error : new Error(String(error))),
  });

const openOAuthPopupWindow = (authUrl: string): Effect.Effect<void, never> =>
  Effect.sync(() => {
    window.open(authUrl, 'oauthPopup', 'width=500,height=600');
  });

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

    const getProviderEntries = (): IntegrationProviderEntry[] => pluginContext.getAll(IntegrationProvider).flat();

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
        Obj.change(entry.token, (token) => {
          token.token = decoded.accessToken;
        });
        yield* finalizePendingEntry(invoker, entry);
      });

    const handleMessage = (event: MessageEvent): void => {
      void runAndForwardErrors(handleOAuthPostMessage(event));
    };

    window.addEventListener('message', handleMessage);

    const mapCoordinatorError = (error: unknown): Error => (error instanceof Error ? error : new Error(String(error)));

    const createIntegration: IntegrationCoordinator['createIntegration'] = ({
      db,
      spaceId,
      providerId,
      existingTarget,
    }) =>
      Effect.gen(function* () {
        const provider = yield* resolveProvider(getProviderEntries, providerId);

        if (!provider.oauth) {
          yield* openCustomTokenDialog(invoker, { db, provider });
          return { kind: 'dialog-opened' } as const;
        }

        const oauth = provider.oauth;
        const label = provider.label ?? provider.id;

        const token = Obj.make(AccessToken.AccessToken, {
          source: provider.source,
          scopes: [...oauth.scopes],
          token: '',
        });
        const integration = Obj.make(Integration.Integration, {
          name: label,
          providerId: provider.id,
          accessToken: Ref.make(token),
          targets: [],
        });

        pending.set(token.id, { token, integration, db, provider, existingTarget });

        const edge = getEdgeClient();
        edgeOrigin = new URL(edge.baseUrl).origin;

        const { authUrl } = yield* initiateOAuthFlow(edge, spaceId, oauth, token.id).pipe(
          Effect.tapError(() => Effect.sync(() => pending.delete(token.id))),
        );

        yield* openOAuthPopupWindow(authUrl);

        return { kind: 'oauth-started', draftIntegrationId: integration.id } as const;
      }).pipe(Effect.mapError(mapCoordinatorError));

    const createCustomIntegration: IntegrationCoordinator['createCustomIntegration'] = ({
      db,
      providerId,
      source,
      account,
      token: tokenValue,
      name,
    }) =>
      Effect.gen(function* () {
        const provider = yield* resolveProvider(getProviderEntries, providerId);

        const accessToken = Obj.make(AccessToken.AccessToken, {
          source,
          account,
          token: tokenValue,
        });
        const integration = Obj.make(Integration.Integration, {
          name: name ?? account ?? source,
          providerId: provider.id,
          accessToken: Ref.make(accessToken),
          targets: [],
        });

        yield* finalizePendingEntry(invoker, {
          token: accessToken,
          integration,
          db,
          provider,
        });

        return { kind: 'integration-created', integrationId: integration.id } as const;
      }).pipe(Effect.mapError(mapCoordinatorError));

    return Capability.contributes(IntegrationCoordinator, { createIntegration, createCustomIntegration }, () =>
      Effect.sync(() => {
        window.removeEventListener('message', handleMessage);
        pending.clear();
      }),
    );
  }),
);
