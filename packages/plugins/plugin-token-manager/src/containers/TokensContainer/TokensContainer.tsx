//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { type Database, Filter, Obj } from '@dxos/echo';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { useQuery } from '@dxos/react-client/echo';
import { AccessToken } from '@dxos/types';

import { TokensPanel } from '#components';
import { TokenManagerOperation } from '#operations';

export type TokensContainerProps = {
  db: Database.Database;
};

export const TokensContainer = ({ db }: TokensContainerProps) => {
  const { invokePromise } = useOperationInvoker();
  const tokens = useQuery(db, Filter.type(AccessToken.AccessToken));
  const [adding, setAdding] = useState(false);

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
        void invokePromise(TokenManagerOperation.AccessTokenCreated, { accessToken: result.data?.object });
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

  const handleDelete = useCallback((token: AccessToken.AccessToken) => db.remove(token), [db]);

  return (
    <TokensPanel
      tokens={tokens}
      adding={adding}
      spaceId={db.spaceId}
      onNew={handleNew}
      onCancel={handleCancel}
      onAdd={handleAdd}
      onDelete={handleDelete}
      onAddAccessToken={handleAddAccessToken}
    />
  );
};
