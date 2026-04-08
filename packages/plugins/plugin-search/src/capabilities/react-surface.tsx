//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit';
import { useActiveSpace } from '@dxos/app-toolkit/ui';
import { type Space, isSpace } from '@dxos/react-client/echo';

import { SEARCH_DIALOG } from '../constants';
import { SearchArticle, SearchDialog } from '#containers';
import { SearchContextProvider } from '#hooks';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: SEARCH_DIALOG,
        role: 'dialog',
        filter: AppSurface.component(SEARCH_DIALOG),
        component: ({ data }) => (
          <SearchContextProvider>
            <SearchDialog {...data.props} />
          </SearchContextProvider>
        ),
      }),
      Surface.create({
        id: `${SEARCH_DIALOG}.search-input`,
        role: 'search-input',
        component: () => {
          const space = useActiveSpace();

          return (
            <SearchContextProvider>
              <SearchArticle space={space} />
            </SearchContextProvider>
          );
        },
      }),
      Surface.create({
        id: `${SEARCH_DIALOG}.search`,
        role: 'deck-companion--search',
        filter: (data): data is { subject: Space } => isSpace(data.subject),
        component: ({ data }) => {
          const space = data.subject;
          if (!space) {
            return null;
          }

          return (
            <SearchContextProvider>
              <SearchArticle space={space} />
            </SearchContextProvider>
          );
        },
      }),
    ]),
  ),
);
