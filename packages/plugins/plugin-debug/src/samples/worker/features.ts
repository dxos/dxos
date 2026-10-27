//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database, Ref, Relation } from '@dxos/echo';
import * as Feature from '@dxos/plugin-projects/Feature';

import { type ProjectResult } from './project.ts';
import { SPEC_PATH } from './spec.ts';
import { type TasksResult } from './tasks.ts';

//
// The project's feature map: one feature per spec block the finished spec will have, all `planned` — the template is a
// plan to run. Each feature needs the one before it. Only the diagram task is seeded against one; the agent links the
// implementation tasks it files, so the map fills in as the plan does.
//

export type FeatureSeed = {
  readonly name: string;
  readonly description: string;
  /** The spec block it is described by; F-1 is seeded, the agent writes the rest. */
  readonly feat: string;
  /** Its parts, each added as a feature whose parent is this one. */
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

export type FeaturesInput = { tasks: TasksResult; project: ProjectResult };

export type FeaturesResult = { features: Feature.Feature[] };

export const FeaturesPartial: SampleSpace.Partial<FeaturesResult, FeaturesInput> = SampleSpace.partial('features', {
  schemas: [Feature.Feature, Feature.DependsOn, Feature.Implements],
  run: ({ tasks, project }: FeaturesInput) =>
    Effect.gen(function* () {
      const projectRef = Ref.make(project.project);
      const features: Feature.Feature[] = [];
      for (const seed of FEATURES) {
        const feature = yield* Database.add(
          Feature.make({
            name: seed.name,
            description: seed.description,
            status: 'planned',
            specs: [`${SPEC_PATH}#${seed.feat}`],
            project: projectRef,
          }),
        );
        for (const subfeature of seed.subfeatures ?? []) {
          yield* Database.add(Feature.make({ ...subfeature, parent: Ref.make(feature) }));
        }
        features.push(feature);
      }

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

      return { features };
    }),
});
