//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { ResultCard, SearchArticle } from '../containers';
import { Result, Search } from '../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'result-card',
        position: 'first',
        filter: AppSurface.object(AppSurface.Card, Result.Result),
        component: ({ data }) => <ResultCard subject={data.subject} />,
      }),
      Surface.create({
        id: 'search-article',
        filter: AppSurface.object(AppSurface.Article, Search.Search),
        component: ({ data }) => <SearchArticle subject={data.subject} attendableId={data.attendableId} />,
      }),
    ]),
  ),
);
