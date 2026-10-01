//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Surface } from '@dxos/app-framework/ui';
import * as NotFound from '@dxos/app-toolkit/NotFound';
import { AppSurface, NotFoundArticle } from '@dxos/app-toolkit/ui';

import { DeckSettings, DetailCompanion } from '#containers';
import { meta } from '#meta';
import { CompanionViewState } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(Capabilities.ReactSurface, [
      Surface.create({
        id: 'pluginSettings',
        filter: AppSurface.settings(AppSurface.Article, meta.profile.key),
        component: DeckSettings,
        props: ({ data: { subject } }) => ({ subject }),
      }),
      Surface.create({
        id: 'detailCompanion',
        filter: AppSurface.subject(AppSurface.Article, CompanionViewState.isDetailData),
        component: DetailCompanion,
        props: ({ role, data: { subject, attendableId } }) => ({ role, attendableId, detail: subject.detail }),
      }),
      Surface.create({
        id: 'notFound',
        filter: Surface.makeFilter(AppSurface.Article, (data) => data.attendableId === NotFound.NOT_FOUND_PATH),
        component: NotFoundArticle,
      }),
    ]);
  }),
);
