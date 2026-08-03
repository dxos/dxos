//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Position } from '@dxos/util';

import { ProviderArticle, ResultCard, SearchArticle, SearchProperties } from '../containers';
import * as Provider from '../types/Provider';
import * as Result from '../types/Result';
import * as Search from '../types/Search';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.create({
        id: 'resultCard',
        position: Position.first,
        filter: AppSurface.object(AppSurface.CardContent, Result.Result),
        component: ({ data }) => <ResultCard subject={data.subject} />,
      }),
      Surface.create({
        id: 'searchArticle',
        filter: AppSurface.object(AppSurface.Article, Search.Search),
        component: ({ data, role }) => (
          <SearchArticle subject={data.subject} attendableId={data.attendableId} role={role} />
        ),
      }),
      Surface.create({
        id: 'objectProperties',
        position: Position.first,
        filter: AppSurface.object(AppSurface.ObjectProperties, Search.Search),
        component: ({ data }) => <SearchProperties search={data.subject} />,
      }),
      Surface.create({
        id: 'providerArticle',
        filter: AppSurface.object(AppSurface.Article, Provider.Provider),
        component: ({ data, role }) => (
          <ProviderArticle subject={data.subject} attendableId={data.attendableId} role={role} />
        ),
      }),
    ]),
  ),
);
