//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import type * as Operation from '@dxos/compute/Operation';
import type * as Project from '@dxos/compute/Project';
import { type Database, Filter, Obj, Ref } from '@dxos/echo';
import * as TaskOperation from '@dxos/plugin-tasks/TaskOperation';
import { Task } from '@dxos/types';

import { Feature, FeatureOperation } from '#types';

import { ProjectsNamespace } from '../namespace.ts';

export type FeatureEditing = {
  /** Writes the given fields of the feature. */
  update: (featureId: string, changes: Partial<Pick<Feature.Feature, 'name' | 'description' | 'status'>>) => void;
  addDependency: (featureId: string, dependsOnId: string) => void;
  removeDependency: (featureId: string, dependsOnId: string) => void;
  linkTask: (taskId: string, featureId: string) => void;
  /** Files a new task into the feature's project and links it to the feature; resolves to whether it was filed. */
  fileTask: (featureId: string, title: string) => Promise<boolean>;
  /** Moves the feature onto the project; requires a project, a no-op without one. */
  addToProject: (featureId: string) => void;
  /** Takes the feature off its project; the feature itself is kept. */
  removeFromProject: (featureId: string) => void;
  /** Creates a planned feature, on the project when there is one; resolves to its id. */
  createFeature: (name: string) => Promise<string | undefined>;
};

/**
 * Edits for a project's feature board, each through the `FeatureOperation` verb an agent would use, so a person and an
 * agent get the same rules. A refused edit (a dependency that would close a cycle) is shown as a toast carrying the
 * operation's own message, which names the features involved.
 */
export const useFeatureEditing = (db: Database.Database | undefined, project?: Project.Project): FeatureEditing => {
  const { invokePromise } = Hooks.useOperationInvoker();

  return useMemo(() => {
    // Narrowed by a guard rather than cast: an id from the UI may name an object of another type.
    const refOf = async <T extends Obj.Unknown>(
      id: string,
      guard: (value: unknown) => value is T,
    ): Promise<Ref.Ref<T> | undefined> => {
      const [object] = db ? await db.query(Filter.id(id)).run() : [];
      return guard(object) ? Ref.make(object) : undefined;
    };
    const featureRef = (id: string) => refOf(id, Feature.instanceOf);
    const taskRef = (id: string) => refOf(id, (value): value is Task.Task => Obj.instanceOf(Task.Task, value));

    const run = async <I, O>(operation: Operation.Definition<I, O>, input: I): Promise<O | undefined> => {
      if (!db) {
        return undefined;
      }
      const { data, error } = await invokePromise(operation, input, { spaceId: db.spaceId });
      if (error) {
        await invokePromise(LayoutOperation.AddToast, {
          id: `${ProjectsNamespace.key}/feature-edit-error/${Date.now()}`,
          icon: 'ph--warning--regular',
          duration: 6_000,
          title: ['feature-edit-error.title', { ns: ProjectsNamespace.key }],
          description: error.message,
        });
        return undefined;
      }
      return data;
    };

    const projectRef = project ? Ref.make(project) : undefined;

    return {
      update: (featureId, changes) =>
        void featureRef(featureId).then((feature) => feature && run(FeatureOperation.Update, { feature, ...changes })),
      addDependency: (featureId, dependsOnId) =>
        void Promise.all([featureRef(featureId), featureRef(dependsOnId)]).then(
          ([feature, dependsOn]) => feature && dependsOn && run(FeatureOperation.AddDependency, { feature, dependsOn }),
        ),
      removeDependency: (featureId, dependsOnId) =>
        void Promise.all([featureRef(featureId), featureRef(dependsOnId)]).then(
          ([feature, dependsOn]) =>
            feature && dependsOn && run(FeatureOperation.RemoveDependency, { feature, dependsOn }),
        ),
      linkTask: (taskId, featureId) =>
        void Promise.all([taskRef(taskId), featureRef(featureId)]).then(
          ([task, feature]) => task && feature && run(FeatureOperation.LinkTask, { task, feature }),
        ),
      fileTask: async (featureId, title) => {
        const [feature] = db ? await db.query(Filter.id(featureId)).run() : [];
        const project = Feature.instanceOf(feature) ? await feature.project?.load() : undefined;
        if (!project?.taskSet) {
          return false;
        }
        const created = await run(TaskOperation.CreateTask, { taskSet: project.taskSet, title });
        const [task, featureRefValue] = await Promise.all([
          created ? taskRef(created.task.id) : undefined,
          featureRef(featureId),
        ]);
        if (!task || !featureRefValue) {
          return false;
        }
        await run(FeatureOperation.LinkTask, { task, feature: featureRefValue });
        return true;
      },
      addToProject: (featureId) =>
        void featureRef(featureId).then(
          (feature) => feature && projectRef && run(FeatureOperation.Update, { feature, project: projectRef }),
        ),
      removeFromProject: (featureId) =>
        void featureRef(featureId).then(
          (feature) => feature && run(FeatureOperation.Update, { feature, project: null }),
        ),
      createFeature: async (name) => {
        const result = await run(FeatureOperation.Create, { name, project: projectRef });
        return result?.feature.id;
      },
    };
  }, [db, project, invokePromise]);
};
