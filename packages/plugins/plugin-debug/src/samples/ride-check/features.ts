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
  /** The spec block's `req` lines. */
  readonly requirements: readonly Feature.Requirement[];
  /** Its parts, each added as a feature whose parent is this one. */
  readonly subfeatures?: readonly string[];
};

export const FEATURES: readonly FeatureSeed[] = [
  {
    name: 'Go / no-go',
    description: 'One word for the next three hours — go, maybe or no-go — with the reasons under it.',
    feat: 'F-1',
    requirements: [
      { id: 'F-1.1', text: 'The verdict covers the next three hours.' },
      { id: 'F-1.2', text: 'Rain over 50% or wind over 35 km/h is no-go; over 25% or 25 km/h is maybe.' },
      { id: 'F-1.3', text: 'Every rule that fired is listed as a reason.' },
    ],
    subfeatures: ['Rain rule', 'Wind rule'],
  },
  {
    name: 'Hourly forecast',
    description: 'The next twelve hours as one chart: temperature over rain chance, wind under each hour.',
    feat: 'F-2',
    requirements: [{ id: 'F-2.1', text: 'Temperature over rain chance, one column per hour, wind under each.' }],
  },
  {
    name: 'Best window',
    description: 'The driest, calmest two hours of daylight, today or tomorrow.',
    feat: 'F-3',
    requirements: [{ id: 'F-3.1', text: 'The two consecutive daylight hours with the least rain, wind and cold.' }],
  },
  {
    name: 'Daylight',
    description: 'Time left until sunset, or when the sun comes up.',
    feat: 'F-4',
    requirements: [{ id: 'F-4.1', text: 'Before sunset, the time left; after it, the next sunrise.' }],
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
            requirements: seed.requirements.map((requirement) => ({ ...requirement })),
            status: 'planned',
            specs: [`${SPEC_PATH}#${seed.feat}`],
            project: projectRef,
          }),
        );
        for (const name of seed.subfeatures ?? []) {
          yield* Database.add(Feature.make({ name, status: 'planned', parent: Ref.make(feature) }));
        }
        features.push(feature);
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
