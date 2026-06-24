//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface, useActiveSpace } from '@dxos/app-toolkit/ui';
import { Skill } from '@dxos/compute';

import { RoutineArticle, RoutineCompanion, RoutineHistory, RoutineSettings, SkillArticle } from '#containers';
import { meta } from '#meta';
import { Routine } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'spaceSettingsAutomation',
        filter: AppSurface.literal(AppSurface.Article, `${meta.profile.key}.space-settings-automation`),
        component: () => {
          const space = useActiveSpace();
          if (!space) {
            return null;
          }

          return <RoutineSettings space={space} />;
        },
      }),
      Surface.create({
        id: 'automation.article',
        filter: AppSurface.object(AppSurface.Article, Routine.Routine),
        component: ({ data, role }) => (
          <RoutineArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
      Surface.create({
        id: 'companion.automation',
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, 'automation'),
          AppSurface.companion(AppSurface.Article),
        ),
        component: ({ data }) => {
          return <RoutineCompanion attendableId={data.attendableId} subject={data.companionTo} />;
        },
      }),
      Surface.create({
        id: 'routine.history',
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, 'history'),
          AppSurface.companion(AppSurface.Article, Routine.Routine),
        ),
        component: ({ data, role }) => <RoutineHistory role={role} subject={data.companionTo} />,
      }),
      Surface.create({
        id: 'skill',
        filter: AppSurface.object(AppSurface.Article, Skill.Skill),
        component: ({ data, role }) => (
          <SkillArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
    ]),
  ),
);
