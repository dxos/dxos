//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface, defineCapabilityModule } from '@dxos/app-framework';
import { useActiveSpace } from '@dxos/plugin-space';
import { type Space, isSpace } from '@dxos/react-client/echo';

import { SEARCH_DIALOG, SearchDialog, type SearchDialogProps, SearchMain } from '../components';
import { SearchContextProvider } from '../hooks';

export default defineCapabilityModule(() =>
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
      id: `${SEARCH_DIALOG}/search-input`,
      role: 'search-input',
      component: () => {
        const space = useActiveSpace();

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
  ]),
);
