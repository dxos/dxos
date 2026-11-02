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
import * as ProjectView from '@dxos/plugin-projects/ProjectView';

import {
  AddFeatureDialog,
  FeatureArticle,
  FeatureCardContent,
  FeatureCompanion,
  FeatureLevelArticle,
  FeatureLevelCompanion,
  FeatureLevelOverview,
  FeatureMapArticle,
  FeatureSection,
  FeatureSpecView,
  ProjectFeatureCompanion,
  SpecLevelCompanion,
} from '#containers';
import { Feature, FeatureMap } from '#types';

import { ADD_FEATURE_DIALOG, FEATURE_COMPANION } from '../constants.ts';
import { type AddFeatureDialogProps } from '../containers/AddFeatureDialog/index.ts';
import { SPEC_MAP_VIEWS } from '../containers/FeatureLevel/FeatureLevel.tsx';

const isTracked = (feature: Feature.Feature) => FeatureMap.findProject(feature) !== undefined;

/** A spec a project owns is a level of the project, whose article plugin-projects renders. */
const isProjectSpec = (value: unknown): value is Spec.Spec =>
  Spec.instanceOf(value) && Project.getOwner(value) !== undefined;

const isFreeSpec = (value: unknown): value is Spec.Spec =>
  Spec.instanceOf(value) && Project.getOwner(value) === undefined;

/** The feature map's surfaces: features, the map of a spec no project owns, and the views and levels a project's specs gain. */
export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.create({
        id: 'feature.mapArticle',
        filter: AppSurface.object(AppSurface.Article, Spec.Spec, ({ subject }) => isFreeSpec(subject)),
        component: FeatureMapArticle,
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
        id: 'feature.level.overview',
        filter: Surface.makeFilter(ProjectView.LevelOverview, ({ subject }) => Feature.instanceOf(subject)),
        component: FeatureLevelOverview,
        props: ({ data }) => data,
      }),
      Surface.create({
        id: 'feature.specView',
        filter: Surface.makeFilter(ProjectView.SpecView, ({ view }) => SPEC_MAP_VIEWS.some((mode) => mode === view)),
        component: FeatureSpecView,
        props: ({ data }) => data,
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
      Surface.create({
        id: ADD_FEATURE_DIALOG,
        filter: AppSurface.component<AddFeatureDialogProps>(AppSurface.Dialog, ADD_FEATURE_DIALOG),
        component: AddFeatureDialog,
        props: ({ data: { props } }) => ({ ...props }),
      }),
    ]),
  ),
);
