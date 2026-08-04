//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { NotFound } from '@dxos/app-toolkit';
import { AppSurface, NotFoundArticle } from '@dxos/app-toolkit/ui';

import { DeckSettings } from '#containers';
import { meta } from '#meta';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'pluginSettings',
        filter: AppSurface.settings(AppSurface.Article, meta.profile.key),
        component: DeckSettings,
        props: ({ data: { subject } }) => ({ subject }),
      }),
      Surface.create({
        id: 'notFound',
        filter: Surface.makeFilter(AppSurface.Article, (data) => data.attendableId === NotFound.NOT_FOUND_PATH),
        component: NotFoundArticle,
      }),
    ]),
  ),
);
