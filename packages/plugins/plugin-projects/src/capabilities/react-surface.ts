//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as Project from '@dxos/compute/Project';
import { type Task } from '@dxos/types';

import {
  FeatureArticle,
  FeatureCardContent,
  FeatureCompanion,
  MoveTaskDialog,
  ProjectArticle,
  ProjectArtifactsArticle,
  ProjectChatsArticle,
  ProjectFeatureCompanion,
  SpecArticle,
} from '#containers';
import { Feature, Spec } from '#types';

import { isArtifactsBranch, isChatsBranch, isSpecLevel } from '../capabilities/app-graph-builder.ts';
import { FEATURE_COMPANION, MOVE_TASK_DIALOG } from '../constants.ts';

/** React surfaces contributed by plugin-projects — articles and cards for projects, specs, features and showcases. */
export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.create({
        id: 'project.article',
        filter: AppSurface.object(AppSurface.Article, Project.Project),
        component: ProjectArticle,
        props: ({ role, data }) => ({ role, ...data }),
      }),
      Surface.create({
        id: 'spec.article',
        filter: AppSurface.object(AppSurface.Article, Spec.Spec),
        component: SpecArticle,
        props: ({ role, data }) => ({ role, ...data }),
      }),
      Surface.create({
        id: 'feature.article',
        filter: AppSurface.object(AppSurface.Article, Feature.Feature),
        component: FeatureArticle,
        props: ({ role, data }) => ({ role, ...data }),
      }),
      // The spec's feature companion (see the `feature` node in the graph builder).
      Surface.create({
        id: 'feature.companion',
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, FEATURE_COMPANION),
          AppSurface.companion(AppSurface.Article, Spec.Spec),
        ),
        component: FeatureCompanion,
        props: ({ role, data: { companionTo, attendableId } }) => ({ role, spec: companionTo, attendableId }),
      }),
      // The same companion beside a project, for the map on its Spec tab.
      Surface.create({
        id: 'project.feature.companion',
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, FEATURE_COMPANION),
          AppSurface.companion(AppSurface.Article, Project.Project),
        ),
        component: ProjectFeatureCompanion,
        props: ({ role, data: { companionTo, attendableId } }) => ({ role, project: companionTo, attendableId }),
      }),
      // One level of a project's spec: the project article at that depth.
      Surface.create({
        id: 'project.specLevel',
        filter: AppSurface.subject(AppSurface.Article, isSpecLevel),
        component: ProjectArticle,
        props: ({ role, data: { subject, attendableId } }) => ({
          role,
          subject: subject.project,
          feature: subject.feature,
          attendableId,
        }),
      }),
      Surface.create({
        id: 'project.specLevel.companion',
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, FEATURE_COMPANION),
          AppSurface.companion(AppSurface.Article, isSpecLevel),
        ),
        component: ProjectFeatureCompanion,
        props: ({ role, data: { companionTo, attendableId } }) => ({
          role,
          project: companionTo.project,
          feature: companionTo.feature,
          attendableId,
        }),
      }),
      Surface.create({
        id: 'feature.card',
        filter: AppSurface.object(AppSurface.CardContent, Feature.Feature),
        component: FeatureCardContent,
        props: ({ data: { subject } }) => ({ subject }),
      }),
      // The virtual branches show what they contain, the way a database type node does: selecting
      // one is a request to see the set, not only to expand the tree.
      Surface.create({
        id: 'project.chats',
        filter: AppSurface.subject(AppSurface.Article, isChatsBranch),
        component: ProjectChatsArticle,
        props: ({ role, data: { subject, attendableId } }) => ({ role, project: subject.project, attendableId }),
      }),
      Surface.create({
        id: 'project.artifacts',
        filter: AppSurface.subject(AppSurface.Article, isArtifactsBranch),
        component: ProjectArtifactsArticle,
        props: ({ role, data: { subject, attendableId } }) => ({ role, project: subject.project, attendableId }),
      }),
      Surface.create({
        id: MOVE_TASK_DIALOG,
        filter: AppSurface.component<{ task: Task.Task }>(AppSurface.Dialog, MOVE_TASK_DIALOG),
        component: MoveTaskDialog,
        props: ({ data: { props } }) => ({ ...props }),
      }),
    ]),
  ),
);
