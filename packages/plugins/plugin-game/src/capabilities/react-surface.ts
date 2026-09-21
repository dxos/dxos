//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Surface } from '@dxos/app-framework/ui';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { GameArticle, GameCard } from '#containers';
import { Game } from '#types';

export const ReactSurface = AppCapability.surface(
  () =>
    Effect.succeed(
      Capability.contribute(Capabilities.ReactSurface, [
        Surface.create({
          id: 'game',
          filter: AppSurface.oneOf(
            AppSurface.object(AppSurface.Article, Game.Game),
            AppSurface.object(AppSurface.Section, Game.Game),
          ),
          component: GameArticle,
          props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
        }),
        Surface.create({
          id: 'gameCard',
          filter: AppSurface.object(AppSurface.CardContent, Game.Game),
          component: GameCard,
          props: ({ role, data: { subject } }) => ({ role, subject }),
        }),
      ]),
    ),
  {
    roles: ['org.dxos.role.article', 'org.dxos.role.cardContent', 'org.dxos.role.section'],
  },
);
