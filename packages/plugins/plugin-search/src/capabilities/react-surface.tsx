//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface, useLayout, useAppGraph } from '@dxos/app-framework';
import { getActiveSpace } from '@dxos/plugin-space';
import { isSpace, type Space } from '@dxos/react-client/echo';

import { SEARCH_DIALOG, SearchDialog, type SearchDialogProps, SearchMain } from '../components';
import { SearchContextProvider } from '../hooks';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: SEARCH_DIALOG,
      role: 'dialog',
      filter: (data): data is { props: SearchDialogProps } => data.component === SEARCH_DIALOG,
      component: ({ data }) => (
        <SearchContextProvider>
          <SearchDialog {...data.props} />
        </SearchContextProvider>
      ),
    }),
    createSurface({
      // id: `${SEARCH_DIALOG}/search-input`,
      id: 'search-input',
      role: 'search-input',
      component: () => {
        const layout = useLayout();
        const { graph } = useAppGraph();
        const space = graph ? getActiveSpace(graph, layout.active[0]) : undefined;
        if (!space) {
          return null;
        }

        return (
          <SearchContextProvider>
            <SearchMain space={space} />
          </SearchContextProvider>
        );
      },
    }),
    createSurface({
      id: `${SEARCH_DIALOG}/search`,
      role: 'deck-companion--search',
      filter: (data): data is { subject: Space } => isSpace(data.subject),
      component: ({ data }) => {
        const space = data.subject;
        if (!space) {
          return null;
        }

        return (
          <SearchContextProvider>
            <SearchMain space={space} />
          </SearchContextProvider>
        );
      },
    }),
  ]);
