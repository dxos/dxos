//
// Copyright 2023 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { type Filter } from '@dxos/echo';
import { QueryBuilder } from '@dxos/echo-query';
import { useGlobalSearch } from '@dxos/plugin-search';
import { getSpace, useObject } from '@dxos/react-client/echo';
import { Container, Toolbar } from '@dxos/react-ui';
import { QueryEditor, type QueryEditorProps } from '@dxos/react-ui-components';
import { type View } from '@dxos/schema';

import { D3ForceGraph } from '../../components/Graph';
import { useGraphModel } from '../../hooks';

export type ExplorerContainerProps = SurfaceComponentProps<View.View>;

export const ExplorerContainer = ({ role, subject: view }: ExplorerContainerProps) => {
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
    <Container.Main role={role} toolbar={showToolbar}>
      {showToolbar && (
        <Toolbar.Root>
          <QueryEditor db={space.db} onChange={handleChange} />
        </Toolbar.Root>
      )}
      <D3ForceGraph model={model} match={match} />
    </Container.Main>
  );
};
