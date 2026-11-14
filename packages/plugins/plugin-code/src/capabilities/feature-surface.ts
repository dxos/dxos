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

import { FeatureCompanion, FeatureSpecView, ProjectFeatureCompanion } from '#containers';

import { FEATURE_COMPANION } from '../constants.ts';
import { isFeatureView } from '../spec-views.ts';

/** The feature map's surfaces: the views a spec using the software dialect gains, and the feature companion. */
export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
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
    ]),
  ),
);
