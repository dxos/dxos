//
// Copyright 2025 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';
import React, { useCallback, useMemo, useState } from 'react';

import { useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { runAndForwardErrors } from '@dxos/effect';
import { Filter, Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { useQuery } from '@dxos/react-client/echo';
import { AccessToken } from '@dxos/types';

import { TokensPanel } from '#components';
import { IntegrationOperation } from '#operations';

import { IntegrationProvider } from '../../capabilities';
import { OAUTH_PRESETS } from '../../defs';
import { Integration } from '../../types';
import { IntegrationOnboarding } from '../SyncTargetsChecklist';

export const TokensContainer = ({ space }: AppSurface.SpaceArticleProps) => {
  const { invokePromise } = useOperationInvoker();
  const providers = useCapabilities(IntegrationProvider).flat();
  const db = space.db;
  const tokens = useQuery(db, Filter.type(AccessToken.AccessToken));
  const integrations = useQuery(db, Filter.type(Integration.Integration));
  const [adding, setAdding] = useState(false);
  // Tracks an integration that was just auto-created so we can pop the sync-target
  // checklist for it. Cleared by `IntegrationOnboarding` when the user finishes (or when
  // the provider has no `getSyncTargets` to skip).
  const [onboardingIntegration, setOnboardingIntegration] = useState<Integration.Integration>();

  // Split tokens into "wrapped by an Integration" (hidden — the Integration row represents them)
  // vs "bare" (shown in the Custom tokens section).
  const wrappedTokenDxns = useMemo(() => {
    const set = new Set<string>();
    for (const integration of integrations) {
      const dxn = integration.accessToken.dxn?.toString?.() ?? integration.accessToken.target?.id;
      if (dxn) set.add(dxn);
      // Also index by underlying object id for safety (refs may resolve differently across formats).
      const targetId = integration.accessToken.target?.id;
      if (targetId) set.add(targetId);
    }
    return set;
  }, [integrations]);

  const bareTokens = useMemo(
    () =>
      tokens.filter(
        (token) =>
          !wrappedTokenDxns.has(Obj.getDXN(token).toString()) &&
          !wrappedTokenDxns.has(token.id),
      ),
    [tokens, wrappedTokenDxns],
  );

  const handleNew = useCallback(() => setAdding(true), []);
  const handleCancel = useCallback(() => setAdding(false), []);

  const handleAddAccessToken = useCallback(
    async (token: AccessToken.AccessToken) => {
      const result = await invokePromise(SpaceOperation.AddObject, {
        object: token,
        target: db,
        hidden: true,
      });

      if (!Obj.instanceOf(AccessToken.AccessToken, result.data?.object)) {
        return;
      }
      const persisted = result.data!.object as AccessToken.AccessToken;

      // Generic AccessTokenCreated dispatch — kept around for non-integration
      // consumers (e.g. plugin-script's deployment dialog).
      void invokePromise(IntegrationOperation.AccessTokenCreated, { accessToken: persisted });

      // Integration-provider path: if a provider matches the token's source,
      // auto-create the wrapping Integration (so the token lands in the
      // Integrations section, not Custom tokens) and run the provider's
      // optional `onTokenCreated` hook. Auto-create runs first so a hook
      // failure can't strand the token.
      const provider = providers.find((p) => p.source === persisted.source);
      if (!provider) return;

      const alreadyWrapped = integrations.some(
        (integration) =>
          integration.accessToken.dxn?.toString?.() === Obj.getDXN(persisted).toString() ||
          integration.accessToken.target?.id === persisted.id,
      );
      if (!alreadyWrapped) {
        try {
          // Default `name` to the service label so `Obj.getLabel(integration)`
          // renders a meaningful heading even before any user-set name. Falls
          // back to the source string for sources without a preset.
          const presetLabel = OAUTH_PRESETS.find((preset) => preset.source === persisted.source)?.label;
          const integration = db.add(
            Integration.make({
              name: presetLabel ?? persisted.source,
              accessToken: Ref.make(persisted),
              targets: [],
            }),
          );
          // Reparent the access token under the Integration so deletion
          // cascades — removing the Integration removes the wrapped token.
          Obj.setParent(persisted, integration);
          // Trigger the sync-targets onboarding flow for this integration.
          // The IntegrationOnboarding component will skip itself if the matching
          // provider has no `getSyncTargets`.
          setOnboardingIntegration(integration);
        } catch (error) {
          log.warn('failed to auto-create Integration', { source: persisted.source, error });
        }
      }

      if (provider.onTokenCreated) {
        await runAndForwardErrors(
          provider.onTokenCreated(persisted).pipe(
            Effect.provide(FetchHttpClient.layer),
            Effect.catchAll((error) =>
              Effect.sync(() => log.warn('onTokenCreated failed', { source: persisted.source, error })),
            ),
          ),
        );
      }
    },
    [db, invokePromise, providers, integrations],
  );

  const handleAdd = useCallback(
    async (form: any) => {
      const token = Obj.make(AccessToken.AccessToken, form);
      await handleAddAccessToken(token);
      setAdding(false);
    },
    [handleAddAccessToken],
  );

  const handleDeleteToken = useCallback((token: AccessToken.AccessToken) => db.remove(token), [db]);
  const handleDeleteIntegration = useCallback((integration: Integration.Integration) => db.remove(integration), [db]);

  return (
    <>
      <TokensPanel
        integrations={integrations}
        bareTokens={bareTokens}
        adding={adding}
        spaceId={db.spaceId}
        onNew={handleNew}
        onCancel={handleCancel}
        onAdd={handleAdd}
        onDeleteToken={handleDeleteToken}
        onDeleteIntegration={handleDeleteIntegration}
        onAddAccessToken={handleAddAccessToken}
      />
      {onboardingIntegration && (
        <IntegrationOnboarding
          key={Obj.getDXN(onboardingIntegration).toString()}
          integration={onboardingIntegration}
          onDone={() => setOnboardingIntegration(undefined)}
        />
      )}
    </>
  );
};
