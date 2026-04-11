//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface, useCapability, useSettingsState } from '@dxos/app-framework/ui';
import { AppSurface, useActiveSpace } from '@dxos/app-toolkit/ui';

import { SlackFeed, SlackSettings } from '#components';
import { meta } from '#meta';
import { SlackCapabilities } from '#types';

const SlackFeedWithSettings = () => {
  const settingsAtom = useCapability(SlackCapabilities.Settings);
  const { settings } = useSettingsState<SlackCapabilities.Settings>(settingsAtom);
  const space = useActiveSpace();

  if (!space) {
    return null;
  }

  return <SlackFeed settings={settings} db={space.db} />;
};

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'plugin-settings',
        role: 'article',
        filter: AppSurface.settingsArticle(meta.id),
        component: ({ data: { subject } }) => {
          const { settings, updateSettings } = useSettingsState<SlackCapabilities.Settings>(subject.atom);
          return <SlackSettings settings={settings} onSettingsChange={updateSettings} />;
        },
      }),
      Surface.create({
        id: 'slack-feed',
        role: 'deck-companion--slack',
        filter: AppSurface.literalSection('slack'),
        component: () => <SlackFeedWithSettings />,
      }),
    ]),
  ),
);
