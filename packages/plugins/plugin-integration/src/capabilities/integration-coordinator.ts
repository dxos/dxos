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

import { SYNC_TARGETS_DIALOG } from '../constants';
import { IntegrationOperation } from '../operations';
import { Integration } from '../types';

import {
  IntegrationProvider,
  type IntegrationProvider as IntegrationProviderType,
  type RemoteTarget,
} from './integration-provider';

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
   * Build in-memory `AccessToken` + `Integration` stubs for the given
   * provider, stash them, open the OAuth popup, and return. The stubs are
   * persisted to the database only after the OAuth callback fires
   * successfully. `providerId` selects an entry from the `IntegrationProvider`
   * capability registry — its `oauth` spec drives the popup, and the
   * resulting Integration records `providerId` so subsequent operations
   * (sync, onTokenCreated, etc.) route back to the same provider.
   */
  createIntegration: (input: {
    db: Database.Database;
    spaceId: Key.SpaceId;
    providerId: string;
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
  /** The provider id that initiated this flow — used at finalize time to
   *  dispatch to the correct `onTokenCreated`. Source alone isn't enough
   *  when multiple providers share an OAuth domain (Gmail/Calendar). */
  providerId: string;
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
      const { token, integration, db, providerId } = entry;
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
      // from the service's `/me` endpoint). Routes by `providerId` because
      // multiple providers may share the same `source` (e.g. Gmail and
      // Google Calendar both `'google.com'` with different scopes).
      const providers = pluginContext.getAll(IntegrationProvider).flat() as IntegrationProviderType[];
      const provider = providers.find((p) => p.id === providerId);
      if (provider?.onTokenCreated) {
        try {
          await runAndForwardErrors(
            provider
              .onTokenCreated({ accessToken: persistedToken, integration: persistedIntegration })
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
      // branch, NOT under the database/collections subtree. Run navigation
      // and the (optional) sync-targets dialog in parallel — both are
      // independent UI dispatches and the user shouldn't have to wait for
      // navigation to finish before the dialog appears.
      const navigatePromise = invoker
        .invokePromise(LayoutOperation.Open, {
          subject: [`${getSpacePath(db.spaceId)}/integrations/${persistedIntegration.id}`],
          navigation: 'immediate',
        })
        .catch((error: unknown) => log.warn('navigate to new integration failed', { error }));

      const dialogPromise = provider?.getSyncTargets
        ? (async () => {
            try {
              const result = await invoker.invokePromise(provider.getSyncTargets as any, {
                integration: Ref.make(persistedIntegration),
              });
              if (result.error) {
                throw result.error;
              }
              const targets = (result.data as { targets: readonly RemoteTarget[] } | undefined)?.targets ?? [];
              await invoker.invokePromise(LayoutOperation.UpdateDialog, {
                subject: SYNC_TARGETS_DIALOG,
                state: true,
                props: {
                  integration: persistedIntegration,
                  availableTargets: targets,
                },
              });
            } catch (error) {
              log.warn('open sync-targets dialog after create failed', { error });
            }
          })()
        : Promise.resolve();

      await Promise.all([navigatePromise, dialogPromise]);
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

    const createIntegration: IntegrationCoordinator['createIntegration'] = ({ db, spaceId, providerId }) =>
      Effect.tryPromise({
        try: async () => {
          const providers = pluginContext.getAll(IntegrationProvider).flat() as IntegrationProviderType[];
          const provider = providers.find((p) => p.id === providerId);
          if (!provider) {
            throw new Error(`No IntegrationProvider registered with id: ${providerId}`);
          }
          if (!provider.oauth) {
            throw new Error(`Provider '${providerId}' has no OAuth flow configured.`);
          }
          const oauth = provider.oauth;
          const label = provider.label ?? provider.id;

          // In-memory stubs only. They get IDs via `Obj.make`, which is what
          // `Ref.make` needs to construct the cross-reference; persistence
          // happens later in `finalizePending` after the OAuth callback.
          const token = Obj.make(AccessToken.AccessToken, {
            source: provider.source,
            note: oauth.note ?? label,
            scopes: [...oauth.scopes],
            token: '',
          });
          const integration = Obj.make(Integration.Integration, {
            name: label,
            providerId: provider.id,
            accessToken: Ref.make(token),
            targets: [],
          });

          pending.set(token.id, { token, integration, db, providerId: provider.id });

          const edge = getEdgeClient();
          edgeOrigin = new URL(edge.baseUrl).origin;
          const { authUrl } = await edge.initiateOAuthFlow(DxContext.default(), {
            provider: oauth.provider,
            scopes: [...oauth.scopes],
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
