//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface, useSettingsState } from '@dxos/app-framework/ui';
import { AppCapabilities, NOT_FOUND_PATH } from '@dxos/app-toolkit';
import { NotFoundArticle } from '@dxos/app-toolkit/ui';

import { DeckSettings } from '#components';
import { meta } from '#meta';
import { type Settings } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: `${meta.id}.plugin-settings`,
        role: 'article',
        filter: (data): data is { subject: AppCapabilities.Settings } =>
          AppCapabilities.isSettings(data.subject) && data.subject.prefix === meta.id,
        component: ({ data: { subject } }) => {
          const { settings, updateSettings } = useSettingsState<Settings.Settings>(subject.atom);
          return <DeckSettings settings={settings} onSettingsChange={updateSettings} />;
        },
      }),
      Surface.create({
        id: `${meta.id}.not-found`,
        role: 'article',
        filter: (data): data is { attendableId: string } => data.attendableId === NOT_FOUND_PATH,
        component: () => <NotFoundArticle />,
      }),
    ]),
  ),
);
