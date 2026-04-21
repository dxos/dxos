//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { BotArticle } from '#containers';
import { Discord } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'bot',
        filter: AppSurface.oneOf(
          AppSurface.object(AppSurface.Article, Discord.Bot),
          AppSurface.object(AppSurface.Section, Discord.Bot),
        ),
        component: ({ data, role }) => (
          <BotArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
    ]),
  ),
);
