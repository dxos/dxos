//
// Copyright 2026 DXOS.org
//

import React, { Suspense, lazy, useCallback } from 'react';

import type * as Project from '@dxos/compute/Project';
import type * as Spec from '@dxos/compute/Spec';
import { Obj } from '@dxos/echo';
import * as ProjectHooks from '@dxos/plugin-projects/ProjectHooks';
import type * as ProjectSurface from '@dxos/plugin-projects/ProjectSurface';

import { isFeatureView } from '../../spec-views.ts';

// Lazy: the canvas engine is large, and only the map's own views need it.
const SpecMap = lazy(() => import('../SpecFeatures/index.ts').then((module) => ({ default: module.SpecMap })));

export type FeatureSpecViewProps = ProjectSurface.SpecViewData;

/**
 * A spec's features as a view in its Structure tab. On a project's Specs tab, a double-click on a card shows the
 * feature's breakdown there; elsewhere the breakdown opens as an article of its own.
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
        <FreeSpecMap spec={subject} attendableId={attendableId} />
      )}
    </Suspense>
  );
};

type SpecMapHostProps = { spec: Spec.Spec; attendableId: string };

const ProjectSpecMap = ({ spec, project, attendableId }: SpecMapHostProps & { project: Project.Project }) => {
  const selectSpec = ProjectHooks.useSelectSpec(project);
  return <SpecMap spec={spec} attendableId={attendableId} onZoom={selectSpec} />;
};

const FreeSpecMap = ({ spec, attendableId }: SpecMapHostProps) => {
  const openObject = ProjectHooks.useOpenObject(Obj.getDatabase(spec), attendableId);
  const handleZoom = useCallback((target: Spec.Spec) => void openObject(target.id), [openObject]);
  return <SpecMap spec={spec} attendableId={attendableId} onZoom={handleZoom} />;
};
