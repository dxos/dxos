//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface, useSettingsState } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { CommentsSettings } from '#components';
import { CommentsArticle } from '#containers';
import { meta } from '#meta';
import { type Settings } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'comments',
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, 'comments'),
          AppSurface.companion(AppSurface.Article),
        ),
        // TODO(wittjosiah): This isn't scrolling properly in a plank.
        component: ({ data }) => <CommentsArticle attendableId={data.attendableId} subject={data.companionTo} />,
      }),
      Surface.create({
        id: 'pluginSettings',
        filter: AppSurface.settings(AppSurface.Article, meta.id),
        component: ({ data: { subject } }) => {
          const { settings, updateSettings } = useSettingsState<Settings.Settings>(subject.atom);
          return <CommentsSettings settings={settings} onSettingsChange={updateSettings} />;
        },
      }),
    ]),
  ),
);
