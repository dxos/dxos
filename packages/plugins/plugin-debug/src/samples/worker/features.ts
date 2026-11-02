//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database, Obj, Ref, Relation } from '@dxos/echo';
import * as Feature from '@dxos/plugin-projects/Feature';
import * as Spec from '@dxos/plugin-projects/Spec';

import { type ProjectResult } from './project.ts';
import { SPEC_PATH, type SpecResult } from './spec.ts';
import { type TasksResult } from './tasks.ts';

//
// The feature map: a spec that names the project and holds the spec document, with one feature per spec block the
// finished document will have, all `planned` — the template is a plan to run. Each feature needs the one before it.
// Only the diagram task is seeded against one; the agent links the implementation tasks it files, so the map fills in
// as the plan does.
//

export type FeatureSeed = {
  readonly name: string;
  readonly description: string;
  /** The spec block it is described by; F-1 is seeded, the agent writes the rest. */
  readonly feat: string;
  /** Its parts, each added as a feature on the spec that breaks this one down. */
  readonly subfeatures?: readonly { readonly name: string; readonly status: Feature.Status }[];
  /** Indexes into the template's task list. */
  readonly tasks: readonly number[];
};

export const FEATURES: readonly FeatureSeed[] = [
  {
    name: 'Greeting endpoint',
    description: 'Every request is answered with JSON: a greeting and the current UTC time.',
    feat: 'F-1',
    subfeatures: [
      { name: 'JSON greeting', status: 'planned' },
      { name: 'UTC time', status: 'planned' },
    ],
    // The diagram draws the endpoint the spec states; the agent links its own implementation tasks to every feature.
    tasks: [1],
  },
  {
    name: 'Deploy without an account',
    description: '`wrangler deploy --temporary` from the sandbox, with no Cloudflare login or API key.',
    feat: 'F-2',
    tasks: [],
  },
  {
    name: 'Verified response',
    description: 'The deployed URL is fetched and its body filed on the project.',
    feat: 'F-3',
    tasks: [],
  },
  {
    name: 'Claimed account',
    description: 'The reader claims the temporary account before it expires with the Worker on it.',
    feat: 'F-4',
    tasks: [],
  },
];

export type FeaturesInput = { tasks: TasksResult; project: ProjectResult; spec: SpecResult };

export type FeaturesResult = { map: Spec.Spec; features: Feature.Feature[] };

export const FeaturesPartial: SampleSpace.Partial<FeaturesResult, FeaturesInput> = SampleSpace.partial('features', {
  schemas: [Spec.Spec, Feature.Feature, Feature.DependsOn, Feature.Implements],
  run: ({ tasks, project, spec }: FeaturesInput) =>
    Effect.gen(function* () {
      const map = yield* Database.add(Spec.make({ name: 'Hello Worker', document: Ref.make(spec.spec) }));
      Obj.update(project.project, (project) => {
        project.spec = Ref.make(map);
      });
      const features: Feature.Feature[] = [];
      for (const seed of FEATURES) {
        const feature = yield* Database.add(
          Feature.make({
            name: seed.name,
            description: seed.description,
            status: 'planned',
            specs: [`${SPEC_PATH}#${seed.feat}`],
          }),
        );
        if (seed.subfeatures) {
          const parts: Ref.Ref<Feature.Feature>[] = [];
          for (const subfeature of seed.subfeatures) {
            parts.push(Ref.make(yield* Database.add(Feature.make({ ...subfeature }))));
          }
          const breakdown = yield* Database.add(Spec.make({ name: seed.name, features: parts }));
          Obj.update(feature, (feature) => {
            feature.spec = Ref.make(breakdown);
          });
        }
        features.push(feature);
      }
      Obj.update(map, (map) => {
        map.features.push(...features.map((feature) => Ref.make(feature)));
      });

      for (const [index, feature] of features.entries()) {
        if (index > 0) {
          yield* Database.add(
            Feature.makeDependsOn({ [Relation.Source]: feature, [Relation.Target]: features[index - 1] }),
          );
        }
        for (const taskIndex of FEATURES[index].tasks) {
          yield* Database.add(
            Feature.makeImplements({ [Relation.Source]: tasks.tasks[taskIndex], [Relation.Target]: feature }),
          );
        }
      }

      return { map, features };
    }),
});
