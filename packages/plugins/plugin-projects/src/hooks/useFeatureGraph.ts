//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import { type Database, EID, Filter, Relation } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { Task } from '@dxos/types';

import { Feature, Showcase } from '#types';

import {
  type FeatureGraphInput,
  type FeatureLookup,
  type FeatureModel,
  buildFeatureModels,
  makeFeatureLookup,
} from '../components/FeatureCard/index.ts';

const entityId = (uri: string) => EID.getEntityId(EID.parse(uri));

const DONE: ReadonlySet<Task.Status> = new Set(['done', 'duplicate', 'cancelled']);

export type FeatureGraph = {
  /** Every feature in the space, joined with its relations. */
  features: readonly FeatureModel[];
  lookup: FeatureLookup;
};

/**
 * Card models for every feature in the space, joined with their `DependsOn`, `Implements` and `Showcases`
 * relations. One subscription per type however many cards render, and signals see dependencies that are
 * not on the map being shown.
 */
export const useFeatureGraph = (db: Database.Database | undefined): FeatureGraph => {
  const features = useQuery(db, Filter.type(Feature.Feature));
  const dependsOn = useQuery(db, Filter.type(Feature.DependsOn));
  const implementsTasks = useQuery(db, Filter.type(Feature.Implements));
  const showcases = useQuery(db, Filter.type(Showcase.Showcases));

  return useMemo(() => {
    const input: FeatureGraphInput = {
      features: features.map((feature) => ({
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
    const models = buildFeatureModels(input);
    return { features: models, lookup: makeFeatureLookup(models) };
  }, [features, dependsOn, implementsTasks, showcases]);
};
