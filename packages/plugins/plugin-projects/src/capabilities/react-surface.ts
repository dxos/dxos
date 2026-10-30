//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as Project from '@dxos/compute/Project';
import * as Spec from '@dxos/compute/Spec';
import { type Task } from '@dxos/types';
import * as Position from '@dxos/util/Position';

import {
  AddFeatureDialog,
  FeatureArticle,
  FeatureCardContent,
  FeatureCompanion,
  FeatureLevelArticle,
  FeatureLevelCompanion,
  FeatureSection,
  MoveTaskDialog,
  ProjectArticle,
  ProjectArtifactsArticle,
  ProjectChatsArticle,
  ProjectFeatureCompanion,
  SpecArticle,
  SpecDocumentArticle,
  SpecLevelArticle,
  SpecLevelCompanion,
} from '#containers';
import { Feature, FeatureMap } from '#types';

import { isArtifactsBranch, isChatsBranch } from '../capabilities/app-graph-builder.ts';
import { ADD_FEATURE_DIALOG, FEATURE_COMPANION, MOVE_TASK_DIALOG } from '../constants.ts';
import { type AddFeatureDialogProps } from '../containers/AddFeatureDialog/index.ts';

const isTracked = (feature: Feature.Feature) => FeatureMap.findProject(feature) !== undefined;

/** A spec a project owns is a level of the project: the project article on that spec. */
const isProjectSpec = (value: unknown): value is Spec.Spec =>
  Spec.instanceOf(value) && Spec.getProject(value) !== undefined;

const isFreeSpec = (value: unknown): value is Spec.Spec =>
  Spec.instanceOf(value) && Spec.getProject(value) === undefined;

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
        filter: AppSurface.object(AppSurface.Article, Spec.Spec, ({ subject }) => isFreeSpec(subject)),
        component: SpecArticle,
        props: ({ role, data }) => ({ role, ...data }),
      }),
      Surface.create({
        id: 'feature.article',
        filter: AppSurface.object(AppSurface.Article, Feature.Feature, ({ subject }) => !isTracked(subject)),
        component: FeatureArticle,
        props: ({ role, data }) => ({ role, ...data }),
      }),
      // The spec's feature companion (see the `feature` node in the graph builder).
      Surface.create({
        id: 'feature.companion',
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, FEATURE_COMPANION),
          AppSurface.companion(AppSurface.Article, isFreeSpec),
        ),
        component: FeatureCompanion,
        props: ({ role, data: { companionTo, attendableId } }) => ({ role, spec: companionTo, attendableId }),
      }),
      // The same companion beside a project, for the map on its Specs tab.
      Surface.create({
        id: 'project.feature.companion',
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, FEATURE_COMPANION),
          AppSurface.companion(AppSurface.Article, Project.Project),
        ),
        component: ProjectFeatureCompanion,
        props: ({ role, data: { companionTo, attendableId } }) => ({ role, project: companionTo, attendableId }),
      }),
      Surface.create({
        id: 'spec.level',
        filter: AppSurface.object(AppSurface.Article, Spec.Spec, ({ subject }) => isProjectSpec(subject)),
        component: SpecLevelArticle,
        props: ({ role, data }) => ({ role, ...data }),
      }),
      Surface.create({
        id: 'spec.level.companion',
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, FEATURE_COMPANION),
          AppSurface.companion(AppSurface.Article, isProjectSpec),
        ),
        component: SpecLevelCompanion,
        props: ({ role, data: { companionTo, attendableId } }) => ({ role, spec: companionTo, attendableId }),
      }),
      // A feature a project tracks is a level of the project's specs: the project article at that depth.
      Surface.create({
        id: 'feature.level',
        filter: AppSurface.object(AppSurface.Article, Feature.Feature, ({ subject }) => isTracked(subject)),
        component: FeatureLevelArticle,
        props: ({ role, data }) => ({ role, ...data }),
      }),
      Surface.create({
        id: 'feature.level.companion',
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, FEATURE_COMPANION),
          AppSurface.companion(AppSurface.Article, Feature.Feature),
        ),
        component: FeatureLevelCompanion,
        props: ({ role, data: { companionTo, attendableId } }) => ({ role, feature: companionTo, attendableId }),
      }),
      Surface.create({
        id: 'feature.section',
        filter: AppSurface.object(AppSurface.Section, Feature.Feature),
        component: FeatureSection,
        props: ({ data: { subject } }) => ({ subject }),
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
      // The spec's text, which its Document view embeds; last, so a richer section can take its place.
      Surface.create({
        id: 'spec.section',
        filter: AppSurface.object(AppSurface.Section, Spec.Spec),
        component: SpecDocumentArticle,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
        position: Position.last,
      }),
      Surface.create({
        id: ADD_FEATURE_DIALOG,
        filter: AppSurface.component<AddFeatureDialogProps>(AppSurface.Dialog, ADD_FEATURE_DIALOG),
        component: AddFeatureDialog,
        props: ({ data: { props } }) => ({ ...props }),
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
