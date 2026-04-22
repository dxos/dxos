//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useMemo } from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface, useCapabilities, useSettingsState } from '@dxos/app-framework/ui';
import { AppSurface, useActiveSpace } from '@dxos/app-toolkit/ui';
import { createKvsStore } from '@dxos/effect';

import { TelegramFeed, TelegramSettings } from '#components';
import { useTelegramMessages } from '#hooks';
import { meta } from '#meta';
import { TelegramCapabilities } from '#types';

const TelegramFeedWithSettings = () => {
  const capabilities = useCapabilities(TelegramCapabilities.Settings);
  const fallbackAtom = useMemo(
    () =>
      createKvsStore({
        key: `${meta.id}.fallback`,
        schema: TelegramCapabilities.SettingsSchema,
        defaultValue: () => ({}),
      }),
    [],
  );
  const settingsAtom = capabilities[0] ?? fallbackAtom;
  const { settings } = useSettingsState<TelegramCapabilities.Settings>(settingsAtom);
  const space = useActiveSpace();

  if (!space) {
    return null;
  }

  return <TelegramFeed settings={settings} db={space.db} />;
};

const TelegramSettingsWithChats = ({ subject }: { subject: { atom: any } }) => {
  const { settings, updateSettings } = useSettingsState<TelegramCapabilities.Settings>(subject.atom);
  const { discoveredChats } = useTelegramMessages(settings.botToken, settings.monitoredChats ?? []);

  return (
    <TelegramSettings settings={settings} onSettingsChange={updateSettings} discoveredChats={discoveredChats} />
  );
};

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'plugin-settings',
        role: 'article',
        filter: AppSurface.settingsArticle(meta.id),
        component: ({ data: { subject } }) => <TelegramSettingsWithChats subject={subject} />,
      }),
      Surface.create({
        id: 'telegram-feed',
        role: 'deck-companion--telegram',
        filter: AppSurface.literalSection('telegram'),
        component: () => <TelegramFeedWithSettings />,
      }),
    ]),
  ),
);
