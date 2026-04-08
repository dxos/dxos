//
// Copyright 2023 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { type AppSurface } from '@dxos/app-toolkit';
import { type Filter } from '@dxos/echo';
import { type View } from '@dxos/echo';
import { QueryBuilder } from '@dxos/echo-query';
import { useGlobalSearch } from '@dxos/plugin-search';
import { getSpace, useObject } from '@dxos/react-client/echo';
import { Panel, Toolbar } from '@dxos/react-ui';
import { QueryEditor, type QueryEditorProps } from '@dxos/react-ui-components';

import { D3ForceGraph } from '#components';
import { useGraphModel } from '#hooks';

export type ExplorerContainerProps = AppSurface.AttendableObjectProps<View.View>;

export const ExplorerContainer = ({ role, subject: view, attendableId: _attendableId }: ExplorerContainerProps) => {
  useObject(view);
  const space = view && getSpace(view);
  const [filter, setFilter] = useState<Filter.Any>();
  const model = useGraphModel(space, filter);
  const { match } = useGlobalSearch();

  const builder = useMemo(() => new QueryBuilder(), []);
  const handleChange = useCallback<NonNullable<QueryEditorProps['onChange']>>((value) => {
    setFilter(builder.build(value).filter);
  }, []);

  const showToolbar = role === 'article';

  if (!space || !model) {
    return null;
  }

  return (
    <Panel.Root role={role}>
      {showToolbar && (
        <Panel.Toolbar asChild>
          <Toolbar.Root>
            <QueryEditor db={space.db} onChange={handleChange} />
          </Toolbar.Root>
        </Panel.Toolbar>
      )}
      <Panel.Content asChild>
        <D3ForceGraph model={model} match={match} />
      </Panel.Content>
    </Panel.Root>
  );
};
