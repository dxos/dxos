//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface, firstIdInPart, useCapability } from '@dxos/app-framework';
import { getActiveSpace } from '@dxos/plugin-space';

import { SEARCH_DIALOG, SearchDialog, type SearchDialogProps, SearchMain } from '../components';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: SEARCH_DIALOG,
      role: 'dialog',
      filter: (data): data is { subject: SearchDialogProps } => data.component === SEARCH_DIALOG,
      component: ({ data }) => <SearchDialog {...data.subject} />,
    }),
    createSurface({
      id: 'search-input',
      role: 'search-input',
      component: () => {
        const location = useCapability(Capabilities.Location);
        const { graph } = useCapability(Capabilities.AppGraph);
        const space = graph && location ? getActiveSpace(graph, firstIdInPart(location.active, 'main')) : undefined;
        return space ? <SearchMain space={space} /> : null;
      },
    }),
  ]);
