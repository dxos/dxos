//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';
import { useMemo } from 'react';

import { type Database, EID, Filter, Obj, Query, Relation } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { SpecDocument, Task } from '@dxos/types';

import { Feature, Showcase, Spec } from '#types';

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

/** A task someone is working on now; a feature with one is active, whatever its status. */
const ACTIVE: ReadonlySet<Task.Status> = new Set(['started', 'review']);

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

  // Specs imported into the space are matched by the foreign key that records their repo path.
  const specPaths = [
    ...new Set(
      members
        .filter(Feature.instanceOf)
        .flatMap((feature) => feature.specs ?? [])
        .map(Feature.getSpecPath),
    ),
  ]
    .sort()
    .join('\n');
  const specQuery = useMemo(
    () =>
      specPaths
        ? Query.select(
            Filter.foreignKeys(
              SpecDocument.SpecDocument,
              specPaths.split('\n').map((id) => ({ source: Feature.SPEC_KEY_SOURCE, id })),
            ),
          )
        : Query.select(Filter.nothing()),
    [specPaths],
  );
  const specs = useQuery(specPaths ? db : undefined, specQuery);
  const specObjects = useMemo(
    () =>
      Object.fromEntries(
        specs.flatMap((spec) =>
          Obj.getMeta(spec)
            .keys.filter((key) => key.source === Feature.SPEC_KEY_SOURCE)
            .map((key) => [key.id, spec.id]),
        ),
      ),
    [specs],
  );

  // An atom rather than a memo: query results keep their identity when a member's field changes, so each object is
  // read through `Obj.atom` to re-derive the graph when a status, name or task changes.
  const graphAtom = useMemo(
    () =>
      Atom.make((get): FeatureGraph => {
        const input: FeatureGraphInput = {
          features: features.filter(Feature.instanceOf).map((feature) => {
            const snapshot = get(Obj.atom(feature));
            const { id, name, description, requirements, status, specs, code } = snapshot;
            // The feature this one breaks down: the owner of the spec that lists it.
            const container = Spec.getContainer(feature);
            const parent = container && Spec.getOwner(container);
            return {
              id,
              name,
              description,
              requirements,
              status,
              specs,
              spec: container?.id,
              parent: parent?.id,
              link: Feature.getLink(snapshot),
              code,
            };
          }),
          // A feature's subfeatures are the features of the spec that breaks it down, read through atoms so an added
          // one or a changed status reaches the card.
          children: features.filter(Feature.instanceOf).flatMap((feature) => {
            const { spec } = get(Obj.atom(feature));
            const breakdown = spec && get(Obj.atomReactive(spec));
            if (!Spec.instanceOf(breakdown)) {
              return [];
            }
            const members = get(Obj.atomReactive(get(Obj.atom(breakdown)).features));
            return members.filter(Feature.instanceOf).map((member) => {
              const { id, name, status } = get(Obj.atom(member));
              return [{ id, name, status }, feature.id] as const;
            });
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
                  active: task.status !== undefined && ACTIVE.has(task.status),
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
            // Subscribes, so renaming the deck re-derives the graph.
            get(Obj.atom(source));
            return [
              [{ id: source.id, name: Obj.getLabel(source) ?? '' }, entityId(Relation.getTargetURI(relation))] as const,
            ];
          }),
          specObjects,
        };
        const models = buildFeatureModels(input);
        return { features: models, lookup: makeFeatureLookup(models) };
      }),
    [features, edges, implementsTasks, demonstrates, specObjects],
  );
  return useAtomValue(graphAtom);
};
