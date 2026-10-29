//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Obj, Query, type Ref } from '@dxos/echo';
import { Task } from '@dxos/types';

import { Feature, FeatureOperation, Showcase, Spec } from '#types';

import { endpoints, refId } from './util.ts';

type Member = { feature: Feature.Feature; spec: Spec.Spec; parent?: Feature.Feature };

/** A deleted target is skipped rather than failing the whole read. */
const loadOptional = <T>(ref: Ref.Ref<T>) =>
  Database.load(ref).pipe(Effect.catchTag('EntityNotFoundError', () => Effect.succeed(undefined)));

const handler: Operation.WithHandler<typeof FeatureOperation.GetFeatures> = FeatureOperation.GetFeatures.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ spec: specRef }) {
      // The spec's features, each followed by the features of the spec that breaks it down, depth first.
      const members: Member[] = [];
      const seen = new Set<string>();
      const visit: (spec: Spec.Spec, parent?: Feature.Feature) => Effect.Effect<void> = Effect.fnUntraced(
        function* (spec, parent) {
          if (seen.has(spec.id)) {
            return;
          }
          seen.add(spec.id);
          const features = (yield* Effect.forEach(spec.features, (ref) => loadOptional(ref))).filter(
            (feature): feature is Feature.Feature => Feature.instanceOf(feature),
          );
          for (const feature of features.sort((left, right) => left.name.localeCompare(right.name))) {
            members.push({ feature, spec, parent });
            const breakdown = feature.spec && (yield* loadOptional(feature.spec));
            if (breakdown) {
              yield* visit(breakdown, feature);
            }
          }
        },
      );
      yield* visit(yield* Database.load(specRef));
      const features: FeatureOperation.FeatureSummary[] = [];
      for (const { feature, spec, parent } of members) {
        const selected = Query.select(Filter.id(feature.id));
        const dependsOn = yield* Database.query(selected.sourceOf(Feature.DependsOn)).run;
        const tasks = yield* Database.query(selected.targetOf(Feature.Implements).source()).run;
        const showcases = yield* Database.query(selected.targetOf(Showcase.Demonstrates).source()).run;
        features.push({
          id: feature.id,
          link: Feature.getLink(feature),
          name: feature.name,
          description: feature.description,
          status: feature.status,
          requirements: (feature.requirements ?? []).map((requirement) => ({ ...requirement })),
          specs: [...(feature.specs ?? [])],
          spec: spec.id,
          parent: parent?.id,
          breakdown: feature.spec && refId(feature.spec),
          dependsOn: dependsOn.map((relation) => endpoints(relation)[1]),
          tasks: tasks
            .filter((task): task is Task.Task => Obj.instanceOf(Task.Task, task))
            .map(({ id, title, status }) => ({ id, title, status })),
          showcases: showcases.map((showcase) => ({ id: showcase.id, name: Obj.getLabel(showcase) ?? '' })),
        });
      }
      return { features };
    }),
  ),
);

export default handler;
