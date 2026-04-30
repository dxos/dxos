//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { LayoutOperation, getSpacePath } from '@dxos/app-toolkit';
import { Context as DxContext } from '@dxos/context';
import { type Database, type Key, Obj, Ref } from '@dxos/echo';
import { runAndForwardErrors } from '@dxos/effect';
import { EdgeHttpClient } from '@dxos/edge-client';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client/types';
import { createEdgeIdentity } from '@dxos/client/edge';
import { type OAuthFlowResult } from '@dxos/protocols';
import { AccessToken } from '@dxos/types';

import { meta } from '#meta';

import { OAUTH_PRESETS } from '../defs';
import { IntegrationOperation } from '../operations';
import { Integration } from '../types';

import { IntegrationProvider, type IntegrationProvider as IntegrationProviderType } from './integration-provider';

/**
 * Long-lived coordinator for integration creation + OAuth flows.
 *
 * Owns the `window.message` listener that catches OAuth callbacks (because
 * `useOAuth` was tied to a React component lifetime, the listener died as
 * soon as the user navigated away — including immediately after closing the
 * "create integration" dialog). This capability is mounted at plugin
 * activation and torn down at deactivation, so OAuth callbacks always have
 * somewhere to land regardless of which UI is currently visible.
 *
 * `createIntegration` is the full lifecycle:
 *  1. Build `AccessToken` + `Integration` stubs in memory (NOT yet in the db).
 *  2. Open the OAuth popup; return.
 *  3. When the OAuth callback fires, persist both objects to the db, reparent
 *     the token under the Integration, run the provider's `onTokenCreated`,
 *     and navigate the user to the new Integration's article.
 *
 * Nothing lands in the database until OAuth succeeds — closing the popup or
 * a network failure leaves no stranded objects.
 */
export type IntegrationCoordinator = {
  /**
   * Build in-memory `AccessToken` + `Integration` stubs for the given source,
   * stash them, open the OAuth popup, and return. The stubs are persisted
   * to the database only after the OAuth callback fires successfully.
   */
  createIntegration: (input: {
    db: Database.Database;
    spaceId: Key.SpaceId;
    source: string;
  }) => Effect.Effect<{ integrationId: string }, Error>;
};

export const IntegrationCoordinator = Capability.make<IntegrationCoordinator>(
  `${meta.id}.capability.integration-coordinator`,
);

/** Pending integration awaiting an OAuth callback. */
type Pending = {
  token: AccessToken.AccessToken;
  integration: Integration.Integration;
  db: Database.Database;
};

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* Capability.get(ClientCapabilities.Client);
    const invoker = yield* Capability.get(Capabilities.OperationInvoker);
    const pluginContext = yield* Capability.Service;

    // EDGE config might be missing in dev/test. Build the client lazily on
    // first use rather than at activation, so the coordinator capability
    // still registers and unrelated paths (delete, sync, viewing the
    // article) keep working without OAuth.
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

    // Pending integrations awaiting an OAuth callback. Keyed by `accessToken.id`,
    // round-tripped through `accessTokenId` in the OAuth flow.
    const pending = new Map<string, Pending>();

    // Origin for the OAuth callback `postMessage` event — anything else is
    // dropped. Resolved lazily on first OAuth flow.
    let edgeOrigin: string | undefined;

    const finalizePending = async (entry: Pending): Promise<void> => {
      const { token, integration, db } = entry;
      // Persist both via direct `db.add`. Direct add doesn't drop them into
      // the root collection (which is what `SpaceOperation.AddObject` with
      // `hidden: false` would do); the `Integrations` graph branch finds
      // them via `Filter.type(Integration)` regardless. The token is
      // reparented under the Integration so deletion cascades.
      const persistedToken = db.add(token);
      const persistedIntegration = db.add(integration);
      Obj.setParent(persistedToken, persistedIntegration);

      // Generic notification for non-integration consumers (plugin-script's
      // deployment dialog etc.). Fire-and-forget; a dispatch failure shouldn't
      // strand the integration we just created.
      try {
        await invoker.invokePromise(IntegrationOperation.AccessTokenCreated, { accessToken: persistedToken });
      } catch (error) {
        log.warn('AccessTokenCreated dispatch failed', { error });
      }

      // Run the matching service provider's hook (e.g. fetch `account`
      // from the service's `/me` endpoint). Failures are logged, never
      // thrown — a hook failure shouldn't prevent navigation.
      const providers = pluginContext.getAll(IntegrationProvider).flat() as IntegrationProviderType[];
      const provider = providers.find((p) => p.source === persistedToken.source);
      if (provider?.onTokenCreated) {
        try {
          await runAndForwardErrors(
            provider
              .onTokenCreated(persistedToken)
              .pipe(
                Effect.provide(FetchHttpClient.layer),
                Effect.catchAll((error) =>
                  Effect.sync(() => log.warn('onTokenCreated failed', { source: persistedToken.source, error })),
                ),
              ),
          );
        } catch (error) {
          log.warn('onTokenCreated runner failed', { error });
        }
      }

      // Navigate to the new Integration under its space's `integrations`
      // branch, NOT under the database/collections subtree.
      try {
        await invoker.invokePromise(LayoutOperation.Open, {
          subject: [`${getSpacePath(db.spaceId)}/integrations/${persistedIntegration.id}`],
          navigation: 'immediate',
        });
      } catch (error) {
        log.warn('navigate to new integration failed', { error });
      }
    };

    const handleMessage = (event: MessageEvent): void => {
      // No OAuth flow has been started yet — nothing in `pending` could match.
      if (!edgeOrigin) return;
      if (event.origin !== edgeOrigin) return;

      const data = event.data as OAuthFlowResult;
      if (!data || !data.success) {
        if (data && !data.success) {
          log.warn('oauth flow failed', data);
          // Failure path doesn't carry the accessTokenId — leave the entry
          // in `pending` (it's just an in-memory stub; nothing leaked into
          // the db). It'll be GC'd when the plugin deactivates.
        }
        return;
      }

      const entry = pending.get(data.accessTokenId);
      if (!entry) {
        // Not one of ours — could belong to a stale flow from a prior
        // session, or to another listener.
        return;
      }
      pending.delete(data.accessTokenId);

      // Fill in the token value before we persist. The token is still an
      // in-memory object at this point; `Obj.change` on a non-persisted
      // object is a plain field assignment.
      Obj.change(entry.token, (token) => {
        token.token = data.accessToken;
      });

      void finalizePending(entry).catch((error: unknown) =>
        log.warn('finalize pending integration failed', { error }),
      );
    };

    window.addEventListener('message', handleMessage);

    const createIntegration: IntegrationCoordinator['createIntegration'] = ({ db, spaceId, source }) =>
      Effect.tryPromise({
        try: async () => {
          const preset = OAUTH_PRESETS.find((p) => p.source === source);
          if (!preset) {
            throw new Error(`No OAuth preset registered for source: ${source}`);
          }

          // In-memory stubs only. They get IDs via `Obj.make`, which is what
          // `Ref.make` needs to construct the cross-reference; persistence
          // happens later in `finalizePending` after the OAuth callback.
          const token = Obj.make(AccessToken.AccessToken, {
            source: preset.source,
            note: preset.note ?? preset.label,
            token: '',
          });
          const integration = Obj.make(Integration.Integration, {
            name: preset.label,
            accessToken: Ref.make(token),
            targets: [],
          });

          pending.set(token.id, { token, integration, db });

          const edge = getEdgeClient();
          edgeOrigin = new URL(edge.baseUrl).origin;
          const { authUrl } = await edge.initiateOAuthFlow(DxContext.default(), {
            provider: preset.provider,
            scopes: preset.scopes,
            spaceId,
            accessTokenId: token.id,
          });
          window.open(authUrl, 'oauthPopup', 'width=500,height=600');

          return { integrationId: integration.id };
        },
        catch: (error) => (error instanceof Error ? error : new Error(String(error))),
      });

    return Capability.contributes(
      IntegrationCoordinator,
      { createIntegration },
      () =>
        Effect.sync(() => {
          window.removeEventListener('message', handleMessage);
          pending.clear();
        }),
    );
  }),
);
