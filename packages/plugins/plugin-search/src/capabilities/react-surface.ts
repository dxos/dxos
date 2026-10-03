//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import { type ComponentProps } from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { isSpace } from '@dxos/react-client/echo';

import { type SearchDialog } from '#containers';

import { SEARCH_DIALOG } from '../constants.ts';
import { SearchCompanionSurface, SearchDialogSurface, SearchInputSurface } from './SearchSurfaces.tsx';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.create({
        id: SEARCH_DIALOG,
        filter: AppSurface.component<ComponentProps<typeof SearchDialog>>(AppSurface.Dialog, SEARCH_DIALOG),
        component: SearchDialogSurface,
        props: ({ data: { props } }) => ({ props }),
      }),
      Surface.create({
        id: `${SEARCH_DIALOG}.searchInput`,
        filter: Surface.makeFilter(AppSurface.SearchInput),
        component: SearchInputSurface,
      }),
      Surface.create({
        id: `${SEARCH_DIALOG}.search`,
        filter: AppSurface.subject(AppSurface.deckCompanion('search'), isSpace),
        component: SearchCompanionSurface,
        props: ({ data: { subject } }) => ({ space: subject }),
      }),
    ]),
  ),
);
