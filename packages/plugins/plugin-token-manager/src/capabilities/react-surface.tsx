//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { useActiveSpace } from '@dxos/app-toolkit/ui';

import { TokensContainer } from '#containers';

import { OAUTH_PRESETS } from '../defs';
import { meta } from '#meta';
import { IntegrationAuthButton } from '#components';

const oauthSources = new Set(OAUTH_PRESETS.map((p) => p.source));

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: meta.id,
        role: 'article',
        filter: (data): data is { subject: string } => data.subject === `${meta.id}.space-settings`,
        component: () => {
          const space = useActiveSpace();
          if (!space) {
            return null;
          }

          return <TokensContainer db={space.db} />;
        },
      }),
      Surface.create({
        id: `${meta.id}.integration-auth`,
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
