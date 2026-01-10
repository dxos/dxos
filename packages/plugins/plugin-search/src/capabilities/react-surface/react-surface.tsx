//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capability, Common } from '@dxos/app-framework';
import { useActiveSpace } from '@dxos/plugin-space';
import { type Space, SpaceState, isSpace } from '@dxos/react-client/echo';

import { SEARCH_DIALOG, SearchDialog, type SearchDialogProps, SearchMain, SpaceMain } from '../../components';
import { SearchContextProvider } from '../../hooks';
import { meta } from '../../meta';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Common.Capability.ReactSurface, [
      Common.createSurface({
        id: SEARCH_DIALOG,
        role: 'dialog',
        filter: (data): data is { props: SearchDialogProps } => data.component === SEARCH_DIALOG,
        component: ({ data }) => (
          <SearchContextProvider>
            <SearchDialog {...data.props} />
          </SearchContextProvider>
        ),
      }),
      Common.createSurface({
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
      Common.createSurface({
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
      Common.createSurface({
        id: `${meta.id}/space-article`,
        role: 'article',
        position: 'hoist',
        filter: (data): data is { subject: Space } =>
          // TODO(wittjosiah): Need to avoid shotgun parsing space state everywhere.
          isSpace(data.subject) && data.subject.state.get() === SpaceState.SPACE_READY,
        component: ({ data }) => <SpaceMain space={data.subject} />,
      }),
    ]),
  ),
);
