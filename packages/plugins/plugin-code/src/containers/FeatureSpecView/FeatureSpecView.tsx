//
// Copyright 2026 DXOS.org
//

import React, { Suspense, lazy, useCallback } from 'react';

import type * as Project from '@dxos/compute/Project';
import type * as Spec from '@dxos/compute/Spec';
import { Filter, Obj } from '@dxos/echo';
import type * as ProjectSurface from '@dxos/plugin-projects/ProjectSurface';

import { Feature } from '#types';

import { useOpenBreakdown } from '../../hooks/index.ts';
import { isFeatureView } from '../../spec-views.ts';

// Lazy: the canvas engine is large, and only the map's own views need it.
const SpecMap = lazy(() => import('../SpecFeatures/index.ts').then((module) => ({ default: module.SpecMap })));
const SpecFeatures = lazy(() =>
  import('../SpecFeatures/index.ts').then((module) => ({ default: module.SpecFeatures })),
);

export type FeatureSpecViewProps = ProjectSurface.SpecViewData;

/**
 * A spec's feature map as a view in its Structure tab. On a project's Specs tab, a double-click on a card shows the
 * feature's breakdown there; elsewhere the map zooms in place.
 */
export const FeatureSpecView = ({ subject, view, project, attendableId }: FeatureSpecViewProps) => {
  if (!isFeatureView(view)) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      {project ? (
        <ProjectSpecMap spec={subject} project={project} attendableId={attendableId} />
      ) : (
        <SpecFeatures spec={subject} attendableId={attendableId} />
      )}
    </Suspense>
  );
};

type ProjectSpecMapProps = {
  spec: Spec.Spec;
  project: Project.Project;
  attendableId: string;
};

const ProjectSpecMap = ({ spec, project, attendableId }: ProjectSpecMapProps) => {
  const openBreakdown = useOpenBreakdown(project);
  const handleZoom = useCallback(
    async (id: string) => {
      const [feature] = (await Obj.getDatabase(spec)?.query(Filter.id(id)).run()) ?? [];
      if (Feature.instanceOf(feature)) {
        await openBreakdown(feature);
      }
    },
    [spec, openBreakdown],
  );
  return <SpecMap spec={spec} attendableId={attendableId} onZoom={(id) => void handleZoom(id)} />;
};
