//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import { EID, Filter, Obj, Relation } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/echo-react';
import { Task } from '@dxos/types';

import { Feature, type FeatureMap, Showcase } from '#types';

import { type FeatureGraphInput, type FeatureModel, buildFeatureModels } from '../../components/FeatureCard/index.ts';

const entityId = (uri: string) => EID.getEntityId(EID.parse(uri));

const DONE: ReadonlySet<Task.Status> = new Set(['done', 'duplicate', 'cancelled']);

/**
 * Card models for a map's features, in map order, joined with their `DependsOn`, `Implements` and
 * `Showcases` relations. Queries the space for each relation type once rather than per feature, so the
 * cost is one subscription per type however many cards the map has.
 */
export const useFeatureModels = (map: FeatureMap.FeatureMap): FeatureModel[] => {
  const [refs = []] = useObject(map, 'features');
  const db = Obj.getDatabase(map);
  const features = useQuery(db, Filter.type(Feature.Feature));
  const dependsOn = useQuery(db, Filter.type(Feature.DependsOn));
  const implementsTasks = useQuery(db, Filter.type(Feature.Implements));
  const showcases = useQuery(db, Filter.type(Showcase.Showcases));

  return useMemo(() => {
    const byId = new Map(features.map((feature) => [feature.id, feature]));
    const members = refs.flatMap((ref) => byId.get(entityId(ref.uri) ?? '') ?? []);
    const input: FeatureGraphInput = {
      features: members.map((feature) => ({
        id: feature.id,
        name: feature.name,
        description: feature.description,
        status: feature.status,
        specs: feature.specs,
        subfeatures: (feature.subfeatures ?? []).flatMap((ref) => {
          const subfeature = ref.target;
          return subfeature ? [{ id: subfeature.id, name: subfeature.name, status: subfeature.status }] : [];
        }),
      })),
      dependsOn: dependsOn.flatMap((relation) => {
        const source = entityId(Relation.getSourceURI(relation));
        const target = entityId(Relation.getTargetURI(relation));
        return source && target ? [[source, target] as const] : [];
      }),
      implementedBy: implementsTasks.flatMap((relation) => {
        const task = Relation.getSource(relation);
        const target = entityId(Relation.getTargetURI(relation));
        return task && target
          ? [
              [
                {
                  id: task.id,
                  title: task.title,
                  done: task.status !== undefined && DONE.has(task.status),
                  milestone: task.milestone?.target?.name,
                },
                target,
              ] as const,
            ]
          : [];
      }),
      showcasedBy: showcases.flatMap((relation) => {
        const showcase = Relation.getSource(relation);
        const target = entityId(Relation.getTargetURI(relation));
        return showcase && target ? [[{ id: showcase.id, name: showcase.name }, target] as const] : [];
      }),
    };
    return buildFeatureModels(input);
  }, [refs, features, dependsOn, implementsTasks, showcases]);
};
