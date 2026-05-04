//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface, useSettingsState } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { CodeArticle, CodeSettings } from '#containers';
import { meta } from '#meta';
import { Settings, Spec } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'code-article',
        // TODO(wittjosiah): Split into multiple surfaces if this filter proves too strict for non-article roles.
        role: ['article', 'section', 'slide'],
        filter: (data): data is { subject: Spec.Spec; attendableId?: string } =>
          Spec.isSpec(data.subject) && (data.attendableId === undefined || typeof data.attendableId === 'string'),
        component: ({ data: { subject, attendableId }, role }) => (
          <CodeArticle role={role} subject={subject} attendableId={attendableId} />
        ),
      }),
      Surface.create({
        id: 'code-settings',
        filter: AppSurface.settings(AppSurface.Article, meta.id),
        component: ({ data: { subject } }) => {
          const { settings, updateSettings } = useSettingsState<Settings.Settings>(subject.atom);
          return <CodeSettings settings={settings} onSettingsChange={updateSettings} />;
        },
      }),
    ]),
  ),
);
