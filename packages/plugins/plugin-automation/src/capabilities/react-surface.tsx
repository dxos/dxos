//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface, useActiveSpace } from '@dxos/app-toolkit/ui';
import { Blueprint, Routine } from '@dxos/compute';
import { Obj } from '@dxos/echo';
import { Prompts } from '@dxos/plugin-space';

import {
  AutomationArticle,
  AutomationCompanion,
  AutomationSettings,
  BlueprintArticle,
  RoutineArticle,
  RoutineList,
} from '#containers';
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
        filter: AppSurface.literal(AppSurface.Article, `${meta.profile.key}.space-settings-automation`),
        component: () => {
          const space = useActiveSpace();
          if (!space) {
            return null;
          }

          return <AutomationSettings space={space} />;
        },
      }),
      Surface.create({
        id: 'companion.automation',
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, 'automation'),
          AppSurface.companion(AppSurface.Article),
        ),
        component: ({ data }) => {
          const db = Obj.getDatabase(data.companionTo);
          if (!db) {
            return null;
          }
          return <AutomationCompanion db={db} object={data.companionTo} />;
        },
      }),
      Surface.create({
        id: 'blueprint',
        filter: AppSurface.object(AppSurface.Article, Blueprint.Blueprint),
        component: ({ data, role }) => (
          <BlueprintArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
      Surface.create({
        id: 'prompt',
        filter: AppSurface.object(AppSurface.Article, Routine.Routine),
        component: ({ data, role }) => (
          <RoutineArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
      Surface.create({
        id: 'prompts',
        filter: AppSurface.subject(Prompts, Obj.isObject),
        component: ({ data }) => <RoutineList subject={data.subject} />,
      }),
    ]),
  ),
);
