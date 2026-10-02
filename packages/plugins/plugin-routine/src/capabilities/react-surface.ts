//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as Routine from '@dxos/compute/Routine';
import * as Skill from '@dxos/compute/Skill';

import { RoutineCard } from '#components';
import { RoutineArticle, RoutineSettings, RoutineTraceCompanion, SkillArticle } from '#containers';
import { meta } from '#meta';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.Root.create({
        id: 'spaceSettingsAutomation',
        filter: AppSurface.literal(AppSurface.Article, `${meta.profile.key}.space-settings-automation`),
        component: RoutineSettings,
      }),
      Surface.Root.create({
        id: 'automation.article',
        filter: AppSurface.object(AppSurface.Article, Routine.Routine),
        component: RoutineArticle,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
      }),
      Surface.Root.create({
        id: 'routine.card',
        filter: AppSurface.object(AppSurface.CardContent, Routine.Routine),
        component: RoutineCard,
        props: ({ data: { subject } }) => ({ subject }),
      }),
      Surface.Root.create({
        id: 'routine.runs',
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, 'runs'),
          AppSurface.companion(AppSurface.Article, Routine.Routine),
        ),
        component: RoutineTraceCompanion,
        props: ({ role, data: { companionTo } }) => ({ role, subject: companionTo }),
      }),
      Surface.Root.create({
        id: 'skill',
        filter: AppSurface.object(AppSurface.Article, Skill.Skill),
        component: SkillArticle,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
      }),
    ]),
  ),
);
