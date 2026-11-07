//
// Copyright 2026 DXOS.org
//

import React, { Suspense, lazy, useCallback } from 'react';

import * as Project from '@dxos/compute/Project';
import type * as Spec from '@dxos/compute/Spec';
import { Obj } from '@dxos/echo';
import * as ProjectHooks from '@dxos/plugin-projects/ProjectHooks';
import type * as ProjectSurface from '@dxos/plugin-projects/ProjectSurface';

import { isFeatureView } from '../../spec-views.ts';

const SpecMap = lazy(() => import('../SpecFeatures/index.ts').then((module) => ({ default: module.SpecMap })));

export type FeatureSpecViewProps = ProjectSurface.SpecViewData;

/**
 * A spec's features as a view in its Structure tab. Beneath a project, a double-click on a card opens the breakdown's
 * level; a spec no project owns opens the breakdown as an article of its own.
 */
export const FeatureSpecView = ({ subject, view, project, attendableId }: FeatureSpecViewProps) => {
  const tracker = project ?? Project.getOwner(subject);
  if (!isFeatureView(view)) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      {tracker ? (
        <ProjectSpecMap spec={subject} project={tracker} attendableId={attendableId} />
      ) : (
        <FreeSpecMap spec={subject} attendableId={attendableId} />
      )}
    </Suspense>
  );
};

type SpecMapHostProps = { spec: Spec.Spec; attendableId: string };

const ProjectSpecMap = ({ spec, project, attendableId }: SpecMapHostProps & { project: Project.Project }) => {
  const openLevel = ProjectHooks.useOpenSpecLevel(project, attendableId);
  return <SpecMap spec={spec} attendableId={attendableId} onZoom={openLevel} />;
};

const FreeSpecMap = ({ spec, attendableId }: SpecMapHostProps) => {
  const openObject = ProjectHooks.useOpenObject(Obj.getDatabase(spec), attendableId);
  const handleZoom = useCallback((target: Spec.Spec) => void openObject(target.id), [openObject]);
  return <SpecMap spec={spec} attendableId={attendableId} onZoom={handleZoom} />;
};
