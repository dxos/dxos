//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface, useCapability } from '@dxos/app-framework';
import { getActiveSpace } from '@dxos/plugin-space';

import { SEARCH_DIALOG, SearchDialog, type SearchDialogProps, SearchMain } from '../components';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: SEARCH_DIALOG,
      role: 'dialog',
      filter: (data): data is { props: SearchDialogProps } => data.component === SEARCH_DIALOG,
      component: ({ data }) => <SearchDialog {...data.props} />,
    }),
    createSurface({
      id: 'search-input',
      role: 'search-input',
      component: () => {
        const layout = useCapability(Capabilities.Layout);
        const { graph } = useCapability(Capabilities.AppGraph);
        const space = graph ? getActiveSpace(graph, layout.active[0]) : undefined;
        return space ? <SearchMain space={space} /> : null;
      },
    }),
  ]);
