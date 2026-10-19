//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import type * as Operation from '@dxos/compute/Operation';
import { type Database, Filter, Obj, Ref } from '@dxos/echo';
import { Task } from '@dxos/types';

import { meta } from '#meta';
import { Feature, type FeatureMap, FeatureOperation } from '#types';

export type FeatureEditing = {
  setStatus: (featureId: string, status: Feature.Status) => void;
  addDependency: (featureId: string, dependsOnId: string) => void;
  removeDependency: (featureId: string, dependsOnId: string) => void;
  linkTask: (taskId: string, featureId: string) => void;
  /** Requires a map; a no-op without one. */
  addToMap: (featureId: string) => void;
  /** Requires a map; a no-op without one. */
  removeFromMap: (featureId: string) => void;
  /** Creates a planned feature, on the map when there is one; resolves to its id. */
  createFeature: (name: string) => Promise<string | undefined>;
};

/**
 * Edits for the feature map UI, each through the `FeatureOperation` verb an agent would use, so a person and an
 * agent get the same rules. A refused edit (a dependency that would close a cycle) is shown as a toast carrying the
 * operation's own message, which names the features involved.
 */
export const useFeatureEditing = (db: Database.Database | undefined, map?: FeatureMap.FeatureMap): FeatureEditing => {
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
          id: `${meta.profile.key}/feature-edit-error/${Date.now()}`,
          icon: 'ph--warning--regular',
          duration: 6_000,
          title: ['feature-edit-error.title', { ns: meta.profile.key }],
          description: error.message,
        });
        return undefined;
      }
      return data;
    };

    const mapRef = map ? Ref.make(map) : undefined;

    return {
      setStatus: (featureId, status) =>
        void featureRef(featureId).then((feature) => feature && run(FeatureOperation.Update, { feature, status })),
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
      addToMap: (featureId) =>
        void featureRef(featureId).then(
          (feature) => feature && mapRef && run(FeatureOperation.AddToMap, { map: mapRef, feature }),
        ),
      removeFromMap: (featureId) =>
        void featureRef(featureId).then(
          (feature) => feature && mapRef && run(FeatureOperation.RemoveFromMap, { map: mapRef, feature }),
        ),
      createFeature: async (name) => {
        const result = await run(FeatureOperation.Create, { name, map: mapRef });
        return result?.feature.id;
      },
    };
  }, [db, map, invokePromise]);
};
