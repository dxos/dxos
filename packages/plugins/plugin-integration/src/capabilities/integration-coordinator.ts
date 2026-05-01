//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { LayoutOperation, getSpacePath } from '@dxos/app-toolkit';
import { createEdgeIdentity } from '@dxos/client/edge';
import { Context as DxContext } from '@dxos/context';
import { type Database, type Key, Obj, Ref } from '@dxos/echo';
import { EdgeHttpClient } from '@dxos/edge-client';
import { runAndForwardErrors } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client/types';
import { type OAuthFlowResult } from '@dxos/protocols';
import { AccessToken } from '@dxos/types';

import { meta } from '#meta';
import { IntegrationProvider, type IntegrationProviderEntry, type RemoteTarget } from '#types';

import { CUSTOM_TOKEN_DIALOG, SYNC_TARGETS_DIALOG } from '../constants';
import { IntegrationOperation } from '../operations';
import { Integration } from '../types';

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
   * Entry point for the create-Integration flow. Branches on whether the
   * provider has an OAuth spec:
   *
   *  - **OAuth providers**: builds in-memory `AccessToken` + `Integration`
   *    stubs, stashes them, and opens the OAuth popup. The stubs are
   *    persisted only after the OAuth callback fires successfully.
   *  - **Non-OAuth providers** (e.g. the built-in `custom` token): opens
   *    the `CUSTOM_TOKEN_DIALOG` and returns immediately. The dialog
   *    collects `{ source, account?, token }` from the user and finishes
   *    the flow via {@link createCustomIntegration}.
   *
   * `providerId` selects an entry from the `IntegrationProvider` capability
   * registry. The resulting Integration records `providerId` so subsequent
   * operations (sync, onTokenCreated, etc.) route back to the same provider.
   */
  createIntegration: (input: {
    db: Database.Database;
    spaceId: Key.SpaceId;
    providerId: string;
    /**
     * Existing local object to wire up as the Integration's first target.
     * Set when the auth flow is initiated from a surface that already has
     * the target in scope (e.g. an `InitializeMailbox` button on an existing
     * Mailbox, or a `NewCalendar` button on an existing Calendar). Threaded
     * through to the provider's `onTokenCreated` and to the sync-targets
     * dialog so providers can attach the existing object instead of
     * materializing a fresh one.
     */
    existingTarget?: Ref.Ref<Obj.Unknown>;
  }) => Effect.Effect<{ integrationId: string }, Error>;
  /**
   * Persist a manually-entered access token + Integration. Used by the
   * `CUSTOM_TOKEN_DIALOG` after the user submits — there's no OAuth callback
   * to wait on, so values are written directly. Runs the same finalization
   * path as the OAuth flow (`AccessTokenCreated` dispatch, navigation).
   */
  createCustomIntegration: (input: {
    db: Database.Database;
    providerId: string;
    source: string;
    account?: string;
    token: string;
    name?: string;
  }) => Promise<{ integrationId: string }>;
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
  /** Existing local target object passed through from the auth surface. */
  existingTarget?: Ref.Ref<Obj.Any>;
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
      const { token, integration, db, providerId, existingTarget } = entry;
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
      const providers = pluginContext.getAll(IntegrationProvider).flat() as IntegrationProviderEntry[];
      const provider = providers.find((p) => p.id === providerId);
      if (provider?.onTokenCreated) {
        try {
          await runAndForwardErrors(
            provider
              .onTokenCreated({ accessToken: persistedToken, integration: persistedIntegration, existingTarget })
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
                  existingTarget,
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
      if (!edgeOrigin) {return;}
      if (event.origin !== edgeOrigin) {return;}

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

      void finalizePending(entry).catch((error: unknown) => log.warn('finalize pending integration failed', { error }));
    };

    window.addEventListener('message', handleMessage);

    const createIntegration: IntegrationCoordinator['createIntegration'] = ({
      db,
      spaceId,
      providerId,
      existingTarget,
    }) =>
      Effect.tryPromise({
        try: async () => {
          const providers = pluginContext.getAll(IntegrationProvider).flat() as IntegrationProviderEntry[];
          const provider = providers.find((p) => p.id === providerId);
          if (!provider) {
            throw new Error(`No IntegrationProvider registered with id: ${providerId}`);
          }

          // Non-OAuth provider — open the custom-token dialog and return.
          // Persistence happens once the user submits the dialog via
          // `createCustomIntegration`. No stub is created here because we
          // don't yet have token values to fill in, and the user may cancel
          // — leaving nothing in the database.
          if (!provider.oauth) {
            await invoker.invokePromise(LayoutOperation.UpdateDialog, {
              subject: CUSTOM_TOKEN_DIALOG,
              state: true,
              // Match CreateObjectDialog so the manual-entry dialog appears
              // in the same viewport position the user just clicked through.
              blockAlign: 'start',
              props: {
                db,
                providerId: provider.id,
                providerLabel: provider.label ?? provider.id,
              },
            });
            // Empty id — `createObject` returns `subject: []` so no caller
            // navigates on this id. The dialog handles navigation itself
            // once the user submits.
            return { integrationId: '' };
          }

          const oauth = provider.oauth;
          const label = provider.label ?? provider.id;

          // In-memory stubs only. They get IDs via `Obj.make`, which is what
          // `Ref.make` needs to construct the cross-reference; persistence
          // happens later in `finalizePending` after the OAuth callback.
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

          pending.set(token.id, { token, integration, db, providerId: provider.id, existingTarget });

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

    const createCustomIntegration: IntegrationCoordinator['createCustomIntegration'] = async ({
      db,
      providerId,
      source,
      account,
      token: tokenValue,
      name,
    }) => {
      const providers = pluginContext.getAll(IntegrationProvider).flat() as IntegrationProviderEntry[];
      const provider = providers.find((p) => p.id === providerId);
      if (!provider) {
        throw new Error(`No IntegrationProvider registered with id: ${providerId}`);
      }

      // Build stubs with the user-supplied values, then run the same
      // finalize path as the OAuth flow. No `pending` map entry needed —
      // there's no callback to round-trip through.
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

      await finalizePending({ token: accessToken, integration, db, providerId: provider.id });
      return { integrationId: integration.id };
    };

    return Capability.contributes(IntegrationCoordinator, { createIntegration, createCustomIntegration }, () =>
      Effect.sync(() => {
        window.removeEventListener('message', handleMessage);
        pending.clear();
      }),
    );
  }),
);
