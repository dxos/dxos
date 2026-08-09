//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { GameArticle, GameCard } from '#containers';

import * as Game from '../types/Game';

export default Capability.makeModule(() =>
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
);
