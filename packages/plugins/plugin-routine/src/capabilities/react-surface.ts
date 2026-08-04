//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Routine, Skill } from '@dxos/compute';

import { RoutineCard } from '#components';
import { RoutineArticle, RoutineCompanion, RoutineTraceCompanion, SkillArticle } from '#containers';
import { meta } from '#meta';

import { RoutineSettingsSurface } from './RoutineSettingsSurface';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'spaceSettingsAutomation',
        filter: AppSurface.literal(AppSurface.Article, `${meta.profile.key}.space-settings-automation`),
        component: RoutineSettingsSurface,
      }),
      Surface.create({
        id: 'automation.article',
        filter: AppSurface.object(AppSurface.Article, Routine.Routine),
        component: RoutineArticle,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
      }),
      Surface.create({
        id: 'routine.card',
        filter: AppSurface.object(AppSurface.CardContent, Routine.Routine),
        component: RoutineCard,
        props: ({ data: { subject } }) => ({ subject }),
      }),
      Surface.create({
        id: 'companion.automation',
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, 'automation'),
          AppSurface.companion(AppSurface.Article),
        ),
        component: RoutineCompanion,
        props: ({ data: { attendableId, companionTo } }) => ({ attendableId, subject: companionTo }),
      }),
      Surface.create({
        id: 'routine.runs',
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, 'runs'),
          AppSurface.companion(AppSurface.Article, Routine.Routine),
        ),
        component: RoutineTraceCompanion,
        props: ({ role, data: { companionTo } }) => ({ role, subject: companionTo }),
      }),
      Surface.create({
        id: 'skill',
        filter: AppSurface.object(AppSurface.Article, Skill.Skill),
        component: SkillArticle,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
      }),
    ]),
  ),
);
