//
// Copyright 2023 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { type Filter } from '@dxos/echo';
import { QueryBuilder } from '@dxos/echo-query';
import { useGlobalSearch } from '@dxos/plugin-search';
import { getSpace } from '@dxos/react-client/echo';
import { Toolbar } from '@dxos/react-ui';
import { QueryEditor, type QueryEditorProps } from '@dxos/react-ui-components';
import { StackItem } from '@dxos/react-ui-stack';

import { useGraphModel } from '../hooks';
import { type ViewType } from '../types';

import { D3ForceGraph } from './Graph';

type ExplorerContainerProps = {
  role: string;
  view: ViewType;
};

const ExplorerContainer = ({ role, view }: ExplorerContainerProps) => {
  const space = getSpace(view);
  const [filter, setFilter] = useState<Filter.Any>();
  const model = useGraphModel(space, filter);
  const { match } = useGlobalSearch();

  const builder = useMemo(() => new QueryBuilder(), []);
  const handleChange = useCallback<NonNullable<QueryEditorProps['onChange']>>((value) => {
    setFilter(builder.build(value));
  }, []);

  if (!space || !model) {
    return null;
  }

  return (
    <StackItem.Content toolbar size={role === 'section' ? 'square' : 'intrinsic'}>
      <Toolbar.Root>
        <QueryEditor space={space} onChange={handleChange} />
      </Toolbar.Root>
      <D3ForceGraph model={model} match={match} />
    </StackItem.Content>
  );
};

export default ExplorerContainer;
