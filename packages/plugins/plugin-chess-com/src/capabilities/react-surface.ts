//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Surface } from '@dxos/app-framework/ui';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { ChessGameArticle } from '#containers';
import { ChessComAccount } from '#types';

export const ReactSurface = AppCapability.surface(
  () =>
    Effect.succeed(
      Capability.contribute(Capabilities.ReactSurface, [
        Surface.create({
          id: 'chessGameArticle',
          filter: AppSurface.oneOf(
            AppSurface.object(AppSurface.Article, ChessComAccount.Account),
            AppSurface.object(AppSurface.Section, ChessComAccount.Account),
          ),
          component: ChessGameArticle,
          props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
        }),
      ]),
    ),
  {
    roles: ['org.dxos.role.article', 'org.dxos.role.section'],
  },
);
