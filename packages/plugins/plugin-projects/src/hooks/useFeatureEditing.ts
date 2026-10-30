//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import type * as Operation from '@dxos/compute/Operation';
import { type Database, Filter, Obj, Ref } from '@dxos/echo';
import * as TaskOperation from '@dxos/plugin-tasks/TaskOperation';
import { Task } from '@dxos/types';

import { Feature, FeatureOperation, Spec } from '#types';

import { ProjectsNamespace } from '../namespace.ts';

export type FeatureEditing = {
  /** Writes the given fields of the feature. */
  update: (featureId: string, changes: Partial<Pick<Feature.Feature, 'name' | 'description' | 'status'>>) => void;
  addDependency: (featureId: string, dependsOnId: string) => void;
  removeDependency: (featureId: string, dependsOnId: string) => void;
  linkTask: (taskId: string, featureId: string) => void;
  /** Files a new task into the project tracking the feature's spec and links it; resolves to whether it was filed. */
  fileTask: (featureId: string, title: string) => Promise<boolean>;
  /** Deletes the feature, with the spec that breaks it down. */
  removeFeature: (featureId: string) => void;
  /** Creates a planned feature under `parentId`, else on the map's spec; resolves to its id. */
  createFeature: (name: string, parentId?: string) => Promise<string | undefined>;
  /** Moves the feature under `parentId`, else onto the map's spec. */
  moveFeature: (featureId: string, parentId?: string) => void;
};

/**
 * Edits for a spec's feature map, each through the `FeatureOperation` verb an agent would use, so a person and an agent
 * get the same rules. A refused edit (a dependency that would close a cycle) is shown as a toast carrying the
 * operation's own message, which names the features involved.
 */
export const useFeatureEditing = (db: Database.Database | undefined, spec?: Spec.Spec): FeatureEditing => {
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

    const specRef = spec ? Ref.make(spec) : undefined;

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
        const project = Feature.instanceOf(feature) ? Spec.findProject(feature) : undefined;
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
      removeFeature: (featureId) =>
        void featureRef(featureId).then((feature) => feature && run(FeatureOperation.Delete, { feature })),
      createFeature: async (name, parentId) => {
        const parent = parentId ? await featureRef(parentId) : undefined;
        const result = await run(FeatureOperation.Create, parent ? { name, parent } : { name, spec: specRef });
        return result?.feature.id;
      },
      moveFeature: (featureId, parentId) =>
        void (async () => {
          const [feature, parent] = await Promise.all([
            featureRef(featureId),
            parentId ? featureRef(parentId) : undefined,
          ]);
          // A parent that does not resolve moves nothing, rather than falling back to the map's own spec.
          if (!feature || (parentId && !parent)) {
            return;
          }
          // A parent without a breakdown gets one: `CreateSpec` returns the one it has, else makes it.
          let target = specRef;
          if (parent) {
            const created = await run(FeatureOperation.CreateSpec, {
              name: parent.target?.name ?? '',
              feature: parent,
            });
            target = created ? await refOf(created.spec.id, Spec.instanceOf) : undefined;
          }
          if (target) {
            await run(FeatureOperation.Update, { feature, spec: target });
          }
        })(),
    };
  }, [db, spec, invokePromise]);
};
