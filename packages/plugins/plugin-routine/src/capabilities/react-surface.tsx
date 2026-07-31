//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface, useActiveSpace } from '@dxos/app-toolkit/ui';
import * as Routine from '@dxos/compute/Routine';
import * as Skill from '@dxos/compute/Skill';

import { RoutineCard } from '#components';
import { RoutineArticle, RoutineCompanion, RoutineSettings, RoutineTraceCompanion, SkillArticle } from '#containers';
import { meta } from '#meta';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
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
        id: 'routine.card',
        filter: AppSurface.object(AppSurface.CardContent, Routine.Routine),
        component: ({ data }) => <RoutineCard subject={data.subject} />,
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
        id: 'routine.runs',
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, 'runs'),
          AppSurface.companion(AppSurface.Article, Routine.Routine),
        ),
        component: ({ data, role }) => <RoutineTraceCompanion role={role} subject={data.companionTo} />,
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
