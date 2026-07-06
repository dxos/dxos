//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { ChessGameArticle } from '#containers';
import { ChessComAccount } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'chessGameArticle',
        filter: AppSurface.oneOf(
          AppSurface.object(AppSurface.Article, ChessComAccount.Account),
          AppSurface.object(AppSurface.Section, ChessComAccount.Account),
        ),
        component: ({ data, role }) => (
          <ChessGameArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
    ]),
  ),
);
