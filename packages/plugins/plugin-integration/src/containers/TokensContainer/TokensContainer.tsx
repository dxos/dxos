//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj } from '@dxos/echo';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { useQuery } from '@dxos/react-client/echo';
import { AccessToken } from '@dxos/types';

import { TokensPanel } from '#components';
import { IntegrationOperation } from '#operations';

import { Integration } from '../../types';

export const TokensContainer = ({ space }: AppSurface.SpaceArticleProps) => {
  const { invokePromise } = useOperationInvoker();
  const db = space.db;
  const tokens = useQuery(db, Filter.type(AccessToken.AccessToken));
  const integrations = useQuery(db, Filter.type(Integration.Integration));
  const [adding, setAdding] = useState(false);

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

      if (Obj.instanceOf(AccessToken.AccessToken, result.data?.object)) {
        void invokePromise(IntegrationOperation.AccessTokenCreated, { accessToken: result.data?.object });
      }
    },
    [db, invokePromise],
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
  );
};
