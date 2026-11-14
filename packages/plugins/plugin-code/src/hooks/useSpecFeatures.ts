//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';
import { useMemo } from 'react';

import type * as Spec from '@dxos/compute/Spec';
import { Filter, Obj, Query, Relation } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import * as ProjectHooks from '@dxos/plugin-projects/ProjectHooks';
import type * as ProjectOperation from '@dxos/plugin-projects/ProjectOperation';
import { type Task } from '@dxos/types';

import { Showcase, SpecItem } from '#types';

import {
  FEATURE_STATUSES,
  type FeatureGraphInput,
  type FeatureLookup,
  type FeatureModel,
  type FeatureStatus,
  buildFeatureModels,
  makeFeatureLookup,
} from '../components/FeatureCard/index.ts';

/** The block kind a spec states its features with. */
export const FEAT = 'feat';

const DONE: ReadonlySet<Task.Status> = new Set(['done', 'duplicate', 'cancelled']);

/** A task someone is working on now; a feature with one is active, whatever its status. */
const ACTIVE: ReadonlySet<Task.Status> = new Set(['started', 'review']);

const nothing = Query.select(Filter.nothing());

/** The relation's source, or undefined while it is not loaded: `Relation.getSource` throws then, and a render must not. */
const sourceOf = <R extends Relation.Unknown>(relation: R): Relation.SourceOf<R> | undefined => {
  try {
    return Relation.getSource(relation);
  } catch {
    return undefined;
  }
};

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

/** A status the cards draw; one they do not (`in-progress`, a typo) reads as planned. */
const toStatus = (value: unknown): FeatureStatus => FEATURE_STATUSES.find((status) => status === value) ?? 'planned';

const requirementsOf = (value: unknown) =>
  (Array.isArray(value) ? value : []).flatMap((entry) =>
    typeof entry?.key === 'string' && typeof entry.text === 'string'
      ? [{ key: entry.key, ...(typeof entry.label === 'string' && { id: entry.label }), text: entry.text }]
      : [],
  );

/** Card fields of one `feat` block; `id` is its key, so a card keeps its place across renumbering. */
export const toFeatureInput = (spec: Spec.Spec, block: ProjectOperation.SpecBlock) => ({
  id: block.key,
  name: block.title ?? block.label ?? block.key,
  description: block.prose,
  status: toStatus(block.fields.status),
  requirements: requirementsOf(block.fields.req),
  blockId: block.label,
  spec: spec.id,
  link: SpecItem.citation(spec, block.key),
  ...(typeof block.fields.spec === 'string' && { breakdown: block.fields.spec }),
});

/** `depends` edges between the blocks, by key; a name no block of the spec carries is left out. */
export const toDependencies = (blocks: readonly ProjectOperation.SpecBlock[]): (readonly [string, string])[] => {
  const byName = new Map(
    blocks.flatMap(({ key, label }) => [[key, key] as const, ...(label ? [[label, key] as const] : [])]),
  );
  return blocks.flatMap(({ key, fields }) =>
    strings(fields.depends).flatMap((name) => {
      const target = byName.get(name);
      return target ? [[key, target] as const] : [];
    }),
  );
};

export type SpecFeatures = {
  /** The spec's `feat` blocks, in text order, joined with the tasks and showcases citing them. */
  features: readonly FeatureModel[];
  lookup: FeatureLookup;
  blocks: readonly ProjectOperation.SpecBlock[];
};

/**
 * Card models for the `feat` blocks of a spec's text, joined with the `Implements` and `Demonstrates` relations that
 * target the spec and name a block's key.
 */
export const useSpecFeatures = (spec: Spec.Spec | undefined): SpecFeatures => {
  const blocks = ProjectHooks.useSpecBlocks(spec, FEAT);
  const db = spec && Obj.getDatabase(spec);
  const id = spec?.id;
  const scope = useMemo(() => (id ? Query.select(Filter.id(id)) : nothing), [id]);
  const implementsTasks = useQuery(id ? db : undefined, scope.targetOf(SpecItem.Implements));
  const demonstrates = useQuery(id ? db : undefined, scope.targetOf(Showcase.Demonstrates));

  // An atom rather than a memo: each task is read through `Obj.atom`, so a status or title change re-derives the cards.
  const atom = useMemo(
    () =>
      Atom.make((get): SpecFeatures => {
        if (!spec) {
          return { features: [], lookup: () => undefined, blocks };
        }
        const input: FeatureGraphInput = {
          features: blocks.map((block) => toFeatureInput(spec, block)),
          dependsOn: toDependencies(blocks),
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
                relation.item,
              ] as const,
            ];
          }),
          showcasedBy: demonstrates.flatMap((relation) => {
            const source = relation.item ? sourceOf(relation) : undefined;
            if (!source || !relation.item) {
              return [];
            }
            get(Obj.atom(source));
            return [[{ id: source.id, name: Obj.getLabel(source) ?? '' }, relation.item] as const];
          }),
        };
        const features = buildFeatureModels(input);
        return { features, lookup: makeFeatureLookup(features), blocks };
      }),
    [spec, blocks, implementsTasks, demonstrates],
  );
  return useAtomValue(atom);
};
