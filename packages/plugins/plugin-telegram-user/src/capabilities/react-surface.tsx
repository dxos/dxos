//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useMemo } from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface, useCapabilities, useSettingsState } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { createKvsStore } from '@dxos/effect';

import { TelegramUserFeed, TelegramUserSettings } from '#components';
import { meta } from '#meta';
import { TelegramUserCapabilities } from '#types';

const TelegramUserFeedWithSettings = () => {
  const capabilities = useCapabilities(TelegramUserCapabilities.Settings);
  const fallbackAtom = useMemo(
    () =>
      createKvsStore({
        key: `${meta.id}.fallback`,
        schema: TelegramUserCapabilities.SettingsSchema,
        defaultValue: () => ({}),
      }),
    [],
  );
  const settingsAtom = capabilities[0] ?? fallbackAtom;
  const { settings } = useSettingsState<TelegramUserCapabilities.Settings>(settingsAtom);

  return <TelegramUserFeed settings={settings} />;
};

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'plugin-settings',
        role: 'article',
        filter: AppSurface.settingsArticle(meta.id),
        component: ({ data: { subject } }) => {
          const { settings, updateSettings } = useSettingsState<TelegramUserCapabilities.Settings>(subject.atom);
          return <TelegramUserSettings settings={settings} onSettingsChange={updateSettings} />;
        },
      }),
      Surface.create({
        id: 'telegram-user-feed',
        role: 'deck-companion--telegram-user',
        filter: AppSurface.literalSection('telegram-user'),
        component: () => <TelegramUserFeedWithSettings />,
      }),
    ]),
  ),
);
