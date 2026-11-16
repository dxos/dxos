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
import * as ProjectSurface from '@dxos/plugin-projects/ProjectSurface';

import {
  FeatureArticle,
  FeatureCardContent,
  FeatureCompanion,
  FeatureSection,
  FeatureSpecView,
  ProjectFeatureCompanion,
} from '#containers';
import { Feature } from '#types';

import { FEATURE_COMPANION } from '../constants.ts';
import { isFeatureView } from '../spec-views.ts';

/** The feature map's surfaces: features, and the views a spec using the features dialect gains. */
export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
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
        id: 'feature.specView',
        filter: Surface.makeFilter(ProjectSurface.SpecView, ({ view }) => isFeatureView(view)),
        component: FeatureSpecView,
        props: ({ data }) => data,
      }),
      Surface.create({
        id: 'feature.section',
        filter: AppSurface.object(AppSurface.Section, Feature.Feature),
        component: FeatureSection,
        props: ({ data: { subject, attendableId } }) => ({ subject, attendableId }),
      }),
      Surface.create({
        id: 'feature.card',
        filter: AppSurface.object(AppSurface.CardContent, Feature.Feature),
        component: FeatureCardContent,
        props: ({ data: { subject } }) => ({ subject }),
      }),
    ]),
  ),
);
