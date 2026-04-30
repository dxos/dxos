//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { type ComponentProps } from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface, useActiveSpace } from '@dxos/app-toolkit/ui';

import { IntegrationAuthButton } from '#components';
import { IntegrationArticle, SyncTargetsChecklist, TokensContainer } from '#containers';
import { meta } from '#meta';

import { SYNC_TARGETS_DIALOG } from '../constants';
import { OAUTH_PRESETS } from '../defs';
import { Integration } from '../types';

const oauthSources = new Set(OAUTH_PRESETS.map((p) => p.source));

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'root',
        filter: AppSurface.literal(AppSurface.Article, `${meta.id}.space-settings`),
        component: () => {
          const space = useActiveSpace();
          if (!space) {
            return null;
          }

          return <TokensContainer space={space} />;
        },
      }),
      Surface.create({
        id: 'integration-article',
        filter: AppSurface.object(AppSurface.Article, Integration.Integration),
        component: ({ data, role }) => (
          <IntegrationArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
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
      Surface.create({
        id: SYNC_TARGETS_DIALOG,
        filter: AppSurface.component<ComponentProps<typeof SyncTargetsChecklist>>(AppSurface.Dialog, SYNC_TARGETS_DIALOG),
        component: ({ data }) => <SyncTargetsChecklist {...data.props} />,
      }),
    ]),
  ),
);
