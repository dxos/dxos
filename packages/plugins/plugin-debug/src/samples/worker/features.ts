//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import * as Spec from '@dxos/compute/Spec';
import { Database, Obj, Ref, Relation, Text } from '@dxos/echo';
import * as FeatureMap from '@dxos/plugin-code/FeatureMap';
import * as SpecItem from '@dxos/plugin-code/SpecItem';

import { type ProjectResult } from './project.ts';
import { type SpecResult } from './spec.ts';
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
  /** The spec block it is described by; F-1 is in the text, the others are written from this seed. */
  readonly feat: string;
  /** Its parts, each added as a feature on the spec that breaks this one down. */
  readonly subfeatures?: readonly { readonly name: string; readonly status: string }[];
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

export type FeaturesResult = { map: Spec.Spec; breakdowns: Spec.Spec[] };

export const FeaturesPartial: SampleSpace.Partial<FeaturesResult, FeaturesInput> = SampleSpace.partial('features', {
  schemas: [Spec.Spec, SpecItem.Implements],
  run: ({ tasks, project, spec }: FeaturesInput) =>
    Effect.gen(function* () {
      // The imported spec is the map, which the project that tracks its tasks owns; its feat blocks are the cards.
      const map = spec.spec;
      const breakdowns = new Map<string, Spec.Spec>();
      for (const seed of FEATURES) {
        if (seed.subfeatures) {
          const content = SpecItem.writeFeatures(
            '',
            seed.subfeatures.map(({ name, status }, index) => ({
              key: `F-${index + 1}`,
              title: name,
              fields: { status },
            })),
          );
          breakdowns.set(
            seed.feat,
            yield* Database.add(Spec.make({ name: seed.name, dialects: [FeatureMap.SOFTWARE_DIALECT], content })),
          );
        }
      }
      // Made by this template, so a text that will not load is a bug, not an outcome.
      const text = yield* Database.load(map.content).pipe(Effect.orDie);
      const content = SpecItem.writeFeatures(
        text.content,
        FEATURES.map((seed, index) => {
          const breakdown = breakdowns.get(seed.feat);
          return {
            key: seed.feat,
            title: seed.name,
            prose: seed.description,
            fields: {
              status: 'planned',
              ...(index > 0 && { depends: [FEATURES[index - 1].feat] }),
              ...(breakdown && { spec: `echo:///${breakdown.id}` }),
            },
          };
        }),
      );
      Obj.update(text, (text) => {
        Text.update(text, 'content', content);
      });
      Obj.update(map, (map) => {
        map.dialects.splice(0, map.dialects.length, FeatureMap.SOFTWARE_DIALECT);
      });
      Obj.update(project.project, (project) => {
        project.specs.push(Ref.make(map), ...[...breakdowns.values()].map((breakdown) => Ref.make(breakdown)));
      });

      for (const seed of FEATURES) {
        for (const taskIndex of seed.tasks) {
          yield* Database.add(
            SpecItem.makeImplements({
              [Relation.Source]: tasks.tasks[taskIndex],
              [Relation.Target]: map,
              item: seed.feat,
            }),
          );
        }
      }

      return { map, breakdowns: [...breakdowns.values()] };
    }),
});
