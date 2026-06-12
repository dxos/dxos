//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface, useActiveSpace } from '@dxos/app-toolkit/ui';
import { getSpace } from '@dxos/react-client/echo';

import { AutomationArticle, AutomationsCompanion, AutomationSettings } from '#containers';
import { meta } from '#meta';
import { Automation } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'automation.article',
        filter: AppSurface.object(AppSurface.Article, Automation.Automation),
        component: ({ data, role }) => (
          <AutomationArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
      Surface.create({
        id: 'spaceSettingsAutomation',
        filter: AppSurface.literal(AppSurface.Article, `${meta.id}.space-settings-automation`),
        component: () => {
          const space = useActiveSpace();
          if (!space) {
            return null;
          }

          return <AutomationSettings space={space} />;
        },
      }),
      Surface.create({
        id: 'companion.automations',
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, 'automations'),
          AppSurface.companion(AppSurface.Article),
        ),
        component: ({ data }) => {
          const space = getSpace(data.companionTo);
          if (!space) {
            return null;
          }
          return <AutomationsCompanion space={space} object={data.companionTo} />;
        },
      }),
    ]),
  ),
);
