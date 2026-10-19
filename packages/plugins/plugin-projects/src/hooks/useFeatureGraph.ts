//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import { type Database, EID, Filter, Query, Relation } from '@dxos/echo';
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

const entityId = (uri: string) => EID.getEntityId(EID.parse(uri)) ?? uri;

/** The relation's source, or undefined while it is not loaded: `Relation.getSource` throws then, and a render must not. */
const sourceOf = <R extends Relation.Unknown>(relation: R): Relation.SourceOf<R> | undefined => {
  try {
    return Relation.getSource(relation);
  } catch {
    return undefined;
  }
};

const DONE: ReadonlySet<Task.Status> = new Set(['done', 'duplicate', 'cancelled']);

export type FeatureGraph = {
  /** The scoped features, joined with their relations. */
  features: readonly FeatureModel[];
  lookup: FeatureLookup;
};

export type FeatureGraphOptions = {
  /** Also load the features the scope depends on and the ones that depend on it, for one feature's signals. */
  neighbours?: boolean;
};

/** Query of the given ids, keyed by their sorted list so a re-render with the same set reuses the subscription. */
const useScope = (ids: readonly string[]) => {
  const key = [...new Set(ids)].sort().join(',');
  return useMemo(() => (key ? Query.select(Filter.id(...key.split(','))) : undefined), [key]);
};

/**
 * Card models for the features named by `ids` — a map's refs, or one feature — joined with their `DependsOn`,
 * `Implements` and `Demonstrates` relations. Every query is scoped to those ids, so the cost follows the map's
 * size rather than the space's.
 */
export const useFeatureGraph = (
  db: Database.Database | undefined,
  ids: readonly string[],
  { neighbours = false }: FeatureGraphOptions = {},
): FeatureGraph => {
  const scope = useScope(ids);
  const outgoing = useQuery(scope && db, (scope ?? Query.select(Filter.nothing())).sourceOf(Feature.DependsOn));
  const incoming = useQuery(
    neighbours && scope ? db : undefined,
    (scope ?? Query.select(Filter.nothing())).targetOf(Feature.DependsOn),
  );

  const edges = useMemo(() => {
    const byId = new Map([...outgoing, ...incoming].map((relation) => [relation.id, relation]));
    return [...byId.values()].map(
      (relation) => [entityId(Relation.getSourceURI(relation)), entityId(Relation.getTargetURI(relation))] as const,
    );
  }, [outgoing, incoming]);

  const featureScope = useScope(neighbours ? [...ids, ...edges.flat()] : ids);
  const featureQuery = featureScope ?? Query.select(Filter.nothing());
  const features = useQuery(featureScope && db, featureQuery);
  const implementsTasks = useQuery(featureScope && db, featureQuery.targetOf(Feature.Implements));
  const demonstrates = useQuery(featureScope && db, featureQuery.targetOf(Showcase.Demonstrates));

  return useMemo(() => {
    const members = features.filter((feature) => Feature.instanceOf(feature));
    const input: FeatureGraphInput = {
      features: members.map((feature) => ({
        id: feature.id,
        name: feature.name,
        description: feature.description,
        status: feature.status,
        specs: feature.specs,
        subfeatures: feature.subfeatures ?? [],
      })),
      dependsOn: edges,
      implementedBy: implementsTasks.flatMap((relation) => {
        const task = sourceOf(relation);
        return task
          ? [
              [
                {
                  id: task.id,
                  title: task.title,
                  done: task.status !== undefined && DONE.has(task.status),
                  milestone: task.milestone?.target?.name,
                },
                entityId(Relation.getTargetURI(relation)),
              ] as const,
            ]
          : [];
      }),
      showcasedBy: demonstrates.flatMap((relation) => {
        const showcase = sourceOf(relation);
        return showcase
          ? [[{ id: showcase.id, name: showcase.name }, entityId(Relation.getTargetURI(relation))] as const]
          : [];
      }),
    };
    const models = buildFeatureModels(input);
    return { features: models, lookup: makeFeatureLookup(models) };
  }, [features, edges, implementsTasks, demonstrates]);
};
