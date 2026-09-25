//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Position } from '@dxos/util';

import { Provider, Result, Search } from '#types';

import { ProviderArticle, ResultCard, SearchArticle, SearchProperties } from '../containers/index.ts';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.create({
        id: 'resultCard',
        position: Position.first,
        filter: AppSurface.object(AppSurface.CardContent, Result.Result),
        component: ResultCard,
        props: ({ data: { subject } }) => ({ subject }),
      }),
      Surface.create({
        id: 'searchArticle',
        filter: AppSurface.object(AppSurface.Article, Search.Search),
        component: SearchArticle,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
      }),
      Surface.create({
        id: 'objectProperties',
        position: Position.first,
        filter: AppSurface.object(AppSurface.ObjectProperties, Search.Search),
        component: SearchProperties,
        props: ({ data: { subject } }) => ({ search: subject }),
      }),
      Surface.create({
        id: 'providerArticle',
        filter: AppSurface.object(AppSurface.Article, Provider.Provider),
        component: ProviderArticle,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
      }),
    ]),
  ),
);
