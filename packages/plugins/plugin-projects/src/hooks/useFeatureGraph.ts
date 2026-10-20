//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';
import { useMemo } from 'react';

import { type Database, EID, Filter, Obj, Query, Relation } from '@dxos/echo';
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
  const scopeQuery = scope ?? Query.select(Filter.nothing());
  const outgoing = useQuery(scope && db, scopeQuery.sourceOf(Feature.DependsOn));
  const incoming = useQuery(neighbours && scope ? db : undefined, scopeQuery.targetOf(Feature.DependsOn));

  const edges = useMemo(() => {
    const byId = new Map([...outgoing, ...incoming].map((relation) => [relation.id, relation]));
    return [...byId.values()].map(
      (relation) => [entityId(Relation.getSourceURI(relation)), entityId(Relation.getTargetURI(relation))] as const,
    );
  }, [outgoing, incoming]);

  // Neighbours are reached by traversal rather than by re-keying an id query from `edges`, so a dependency added
  // while the view is open loads its target in the same update that delivers the edge.
  const members = useQuery(scope && db, scopeQuery);
  const dependencies = useQuery(neighbours && scope ? db : undefined, scopeQuery.sourceOf(Feature.DependsOn).target());
  const dependents = useQuery(neighbours && scope ? db : undefined, scopeQuery.targetOf(Feature.DependsOn).source());
  const features = useMemo(
    () => [...new Map([...members, ...dependencies, ...dependents].map((feature) => [feature.id, feature])).values()],
    [members, dependencies, dependents],
  );
  // Tasks and showcases matter only for the scope's own cards; a neighbour is shown by its name and status.
  const implementsTasks = useQuery(scope && db, scopeQuery.targetOf(Feature.Implements));
  const demonstrates = useQuery(scope && db, scopeQuery.targetOf(Showcase.Demonstrates));

  // An atom rather than a memo: query results keep their identity when a member's field changes, so each object is
  // read through `Obj.atom` to re-derive the graph when a status, name or task changes.
  const graphAtom = useMemo(
    () =>
      Atom.make((get): FeatureGraph => {
        const input: FeatureGraphInput = {
          features: features.filter(Feature.instanceOf).map((feature) => {
            const { id, name, description, status, specs, subfeatures } = get(Obj.atom(feature));
            return { id, name, description, status, specs, subfeatures: subfeatures ?? [] };
          }),
          dependsOn: edges,
          implementedBy: implementsTasks.flatMap((relation) => {
            const source = sourceOf(relation);
            if (!source) {
              return [];
            }
            const task = get(Obj.atom(source));
            const milestone = task.milestone && get(Obj.atom(task.milestone));
            return [
              [
                {
                  id: task.id,
                  title: task.title,
                  done: task.status !== undefined && DONE.has(task.status),
                  milestone: milestone?.name,
                },
                entityId(Relation.getTargetURI(relation)),
              ] as const,
            ];
          }),
          showcasedBy: demonstrates.flatMap((relation) => {
            const source = sourceOf(relation);
            if (!source) {
              return [];
            }
            const showcase = get(Obj.atom(source));
            return [[{ id: showcase.id, name: showcase.name }, entityId(Relation.getTargetURI(relation))] as const];
          }),
        };
        const models = buildFeatureModels(input);
        return { features: models, lookup: makeFeatureLookup(models) };
      }),
    [features, edges, implementsTasks, demonstrates],
  );
  return useAtomValue(graphAtom);
};
