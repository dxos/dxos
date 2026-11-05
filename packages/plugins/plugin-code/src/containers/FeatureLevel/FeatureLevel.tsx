//
// Copyright 2026 DXOS.org
//

import React, { Suspense, lazy, useCallback, useMemo } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as Surface from '@dxos/app-framework/Surface';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Project from '@dxos/compute/Project';
import * as Spec from '@dxos/compute/Spec';
import { Obj, Ref } from '@dxos/echo';
import { useObject, useResolveRef } from '@dxos/echo-react';
import * as ProjectSurface from '@dxos/plugin-projects/ProjectSurface';
import type * as SpecSession from '@dxos/plugin-projects/SpecSession';
import { type Task } from '@dxos/types';

import { CodeOperation, Feature, FeatureMap } from '#types';

import { useFeatureGraph, useOpenSpecLevel, useSpecTreeIds } from '../../hooks/index.ts';
import { CodeNamespace } from '../../namespace.ts';
import { type FeatureViewId, isFeatureView } from '../../spec-views.ts';

// Lazy: the canvas engine is large, and only the map's own views need it.
const SpecMap = lazy(() => import('../SpecFeatures/index.ts').then((module) => ({ default: module.SpecMap })));
const SpecFeatures = lazy(() =>
  import('../SpecFeatures/index.ts').then((module) => ({ default: module.SpecFeatures })),
);

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
        CodeOperation.LinkFeatureTask,
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
    () => void invokePromise(CodeOperation.CreateSpec, { name: subject.name, feature: Ref.make(subject) }, { spaceId }),
    [invokePromise, subject, spaceId],
  );

  if (!project) {
    return null;
  }

  return (
    <Surface.Surface
      type={ProjectSurface.Level}
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

export type FeatureSpecViewProps = ProjectSurface.SpecViewData;

/**
 * A spec's feature map as a view in its Structure tab. Beneath a project, a double-click on a card opens the feature's
 * level; a spec no project tracks zooms in place.
 */
export const FeatureSpecView = ({ subject, view, project, attendableId }: FeatureSpecViewProps) => {
  const owner = FeatureMap.getOwner(subject);
  const tracker = project ?? (owner ? FeatureMap.findProject(owner) : Project.getOwner(subject));
  if (!isFeatureView(view)) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      {tracker ? (
        <ProjectSpecMap spec={subject} mode={view} project={tracker} owner={owner} attendableId={attendableId} />
      ) : (
        <SpecFeatures spec={subject} mode={view} attendableId={attendableId} />
      )}
    </Suspense>
  );
};

type ProjectSpecMapProps = {
  spec: Spec.Spec;
  mode: FeatureViewId;
  project: Project.Project;
  /** The feature the spec breaks down, whose lineage the map does not offer to add. */
  owner?: Feature.Feature;
  attendableId: string;
};

const ProjectSpecMap = ({ spec, mode, project, owner, attendableId }: ProjectSpecMapProps) => {
  const openLevel = useOpenSpecLevel(project, attendableId);
  const lineage = useMemo(() => (owner ? FeatureMap.getLineage(owner).map(({ id }) => id) : []), [owner]);
  const handleZoom = useCallback((id: string) => openLevel(owner ?? spec, id), [openLevel, owner, spec]);
  return <SpecMap spec={spec} mode={mode} attendableId={attendableId} exclude={lineage} onZoom={handleZoom} />;
};

export type FeatureSpecCompanionProps = {
  feature: Feature.Feature;
  group: SpecSession.Group;
  attendableId: string;
};

/** A companion tab of a feature's level: the tab of the spec breaking the feature down. */
export const FeatureSpecCompanion = ({ feature, group, attendableId }: FeatureSpecCompanionProps) => {
  const breakdown = useResolveRef(useObject(feature, 'spec')[0]);
  if (!Spec.instanceOf(breakdown)) {
    return null;
  }

  return (
    <Surface.Surface
      type={ProjectSurface.SpecCompanion}
      data={{ subject: breakdown, group, project: FeatureMap.findProject(feature), attendableId }}
      limit={1}
    />
  );
};
