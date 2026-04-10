//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface, useActiveSpace } from '@dxos/app-toolkit/ui';

import { IntegrationAuthButton } from '#components';
import { TokensContainer } from '#containers';
import { meta } from '#meta';

import { OAUTH_PRESETS } from '../defs';

const oauthSources = new Set(OAUTH_PRESETS.map((p) => p.source));

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'root',
        role: 'article',
        filter: AppSurface.literalSection(`${meta.id}.space-settings`),
        component: () => {
          const space = useActiveSpace();
          if (!space) {
            return null;
          }

          return <TokensContainer db={space.db} />;
        },
      }),
      Surface.create({
        id: 'integration-auth',
        role: 'integration--auth',
        filter: (data): data is { source: string } => typeof data.source === 'string' && oauthSources.has(data.source),
        component: ({ data }) => {
          const space = useActiveSpace();
          if (!space) {
            return null;
          }

          return <IntegrationAuthButton source={data.source} db={space.db} />;
        },
      }),
    ]),
  ),
);
