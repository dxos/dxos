//
// Copyright 2026 DXOS.org
//

import React, { Suspense, lazy, useCallback, useMemo } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as Surface from '@dxos/app-framework/Surface';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import type * as Project from '@dxos/compute/Project';
import * as Spec from '@dxos/compute/Spec';
import { Obj, Ref } from '@dxos/echo';
import { useObject, useResolveRef } from '@dxos/echo-react';
import * as ProjectView from '@dxos/plugin-projects/ProjectView';
import { type Task } from '@dxos/types';

import { Feature, FeatureMap, type FeatureMapView, FeatureOperation } from '#types';

import { useFeatureGraph, useOpenSpecLevel, useSpecTreeIds } from '../../hooks/index.ts';
import { CodeNamespace } from '../../namespace.ts';

// Lazy: the canvas engine is large, and only the map's own views need it.
const SpecMap = lazy(() => import('../SpecFeatures/index.ts').then((module) => ({ default: module.SpecMap })));

// Lazy: only a feature's level shows it.
const FeatureDetail = lazy(() =>
  import('../FeatureArticle/index.ts').then((module) => ({ default: module.FeatureDetail })),
);

/**
 * Ids of the tasks working on the feature or any feature beneath it, through its breakdown, read through atoms so a task
 * linked anywhere below is counted.
 */
const useLevelTaskIds = (feature: Feature.Feature, spec: Spec.Spec | undefined) => {
  const treeIds = useSpecTreeIds(spec);
  const ids = useMemo(() => [feature.id, ...treeIds], [feature, treeIds]);
  const { features } = useFeatureGraph(Obj.getDatabase(feature), ids);
  const key = [...new Set(features.flatMap(({ tasks }) => tasks.map(({ id }) => id)))].join(',');
  return useMemo(() => (key ? key.split(',') : []), [key]);
};

export type FeatureLevelArticleProps = AppSurface.ObjectArticleProps<Feature.Feature>;

/** A feature's level of the project tracking it: the project article narrowed to the feature. */
export const FeatureLevelArticle = ({ role, subject, attendableId }: FeatureLevelArticleProps) => {
  const project = FeatureMap.findProject(subject);
  const { invokePromise } = Hooks.useOperationInvoker();
  const spaceId = Obj.getDatabase(subject)?.spaceId;
  const breakdown = useResolveRef(useObject(subject, 'spec')[0]);
  const spec = Spec.instanceOf(breakdown) ? breakdown : undefined;
  const taskScope = useLevelTaskIds(subject, spec);

  // A task added at a level works on its feature, which is what keeps it in the level's scope. A failed link leaves the
  // task in the project, where the feature's Link task can still reach it, so the draft is not kept for a second create.
  const handleTaskCreated = useCallback(
    async (task: Task.Task) => {
      const { error } = await invokePromise(
        FeatureOperation.LinkTask,
        { task: Ref.make(task), feature: Ref.make(subject) },
        { spaceId },
      );
      if (error) {
        await invokePromise(LayoutOperation.AddToast, {
          id: `${CodeNamespace.key}/link-task-error/${Date.now()}`,
          icon: 'ph--warning--regular',
          duration: 6_000,
          title: ['link-task-error.title', { ns: CodeNamespace.key }],
          description: error.message,
        });
      }
    },
    [invokePromise, subject, spaceId],
  );

  // Named after the feature it breaks down.
  const handleAddSpec = useCallback(
    () =>
      void invokePromise(FeatureOperation.CreateSpec, { name: subject.name, feature: Ref.make(subject) }, { spaceId }),
    [invokePromise, subject, spaceId],
  );

  if (!project) {
    return null;
  }

  return (
    <Surface.Surface
      type={ProjectView.Level}
      data={{
        role,
        project,
        level: subject,
        spec,
        attendableId,
        taskScope,
        onTaskCreated: handleTaskCreated,
        onAddSpec: handleAddSpec,
      }}
      limit={1}
    />
  );
};

export type FeatureLevelOverviewProps = {
  subject: Obj.Unknown;
  project: Project.Project;
  attendableId: string;
};

/** The Overview tab at a feature's level: the feature itself, its subfeatures opening their own levels. */
export const FeatureLevelOverview = ({ subject: feature, project, attendableId }: FeatureLevelOverviewProps) => {
  const openLevel = useOpenSpecLevel(project, attendableId);
  if (!Feature.instanceOf(feature)) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <FeatureDetail
        feature={feature}
        attendableId={attendableId}
        onSelectSubfeature={(id) => openLevel(feature, id)}
      />
    </Suspense>
  );
};

/** The Specs tab's map views: a spec's features on a canvas or by status, at the level the tab is at. */
export const SPEC_MAP_VIEWS: readonly FeatureMapView.Mode[] = ['canvas', 'kanban'];

export type FeatureSpecViewProps = ProjectView.SpecViewData;

/** A spec's feature map as a view of the project's Specs tab; a double-click on a card opens the feature's level. */
export const FeatureSpecView = ({ subject, view, project, level, attendableId }: FeatureSpecViewProps) => {
  const openLevel = useOpenSpecLevel(project, attendableId);
  const feature = Feature.instanceOf(level) ? level : undefined;
  const lineage = useMemo(() => (feature ? FeatureMap.getLineage(feature).map(({ id }) => id) : []), [feature]);
  const handleZoom = useCallback((id: string) => openLevel(feature ?? subject, id), [openLevel, feature, subject]);
  const mode = SPEC_MAP_VIEWS.find((mode) => mode === view);
  if (!mode) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <SpecMap spec={subject} mode={mode} attendableId={attendableId} exclude={lineage} onZoom={handleZoom} />
    </Suspense>
  );
};
