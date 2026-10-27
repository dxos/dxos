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
// The feature map: one card per card on the page, all `planned`. The verdict comes first and the rest depend on it,
// since they share its forecast. The build task implements all four, so each card shows the task that ships it.
//

export type FeatureSeed = {
  readonly name: string;
  readonly description: string;
  readonly feat: string;
  readonly subfeatures?: readonly Feature.Subfeature[];
};

export const FEATURES: readonly FeatureSeed[] = [
  {
    name: 'Go / no-go',
    description: 'One word for the next three hours — go, maybe or no-go — with the reasons under it.',
    feat: 'F-1',
    subfeatures: [
      { name: 'Rain rule', status: 'planned' },
      { name: 'Wind rule', status: 'planned' },
    ],
  },
  {
    name: 'Hourly forecast',
    description: 'The next twelve hours as one chart: temperature over rain chance, wind under each hour.',
    feat: 'F-2',
  },
  {
    name: 'Best window',
    description: 'The driest, calmest two hours of daylight, today or tomorrow.',
    feat: 'F-3',
  },
  {
    name: 'Daylight',
    description: 'Time left until sunset, or when the sun comes up.',
    feat: 'F-4',
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
        features.push(
          yield* Database.add(
            Feature.make({
              name: seed.name,
              description: seed.description,
              status: 'planned',
              specs: [`${SPEC_PATH}#${seed.feat}`],
              subfeatures: seed.subfeatures?.map((subfeature) => ({ ...subfeature })),
              project: projectRef,
            }),
          ),
        );
      }

      const [verdict, ...rest] = features;
      for (const feature of rest) {
        yield* Database.add(Feature.makeDependsOn({ [Relation.Source]: feature, [Relation.Target]: verdict }));
      }
      const build = tasks.tasks[1];
      for (const feature of features) {
        yield* Database.add(Feature.makeImplements({ [Relation.Source]: build, [Relation.Target]: feature }));
      }

      return { features };
    }),
});
