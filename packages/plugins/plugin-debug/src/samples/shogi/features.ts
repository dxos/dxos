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
  readonly subfeatures?: readonly Feature.Subfeature[];
  /** Indexes into the template's task list. */
  readonly tasks: readonly number[];
};

export const FEATURES: readonly FeatureSeed[] = [
  {
    name: 'Board',
    description: 'A Board page under a Shogi group in each space, opening on the starting position.',
    feat: 'F-1',
    subfeatures: [
      { name: 'Navtree group', status: 'planned' },
      { name: 'Starting position', status: 'planned' },
    ],
    // The diagram draws the plugin the spec states; the agent links its own implementation tasks to every feature.
    tasks: [1],
  },
  {
    name: 'Moves',
    description: "Each kind's standard moves, sente first and turns alternating, stored as the space's game.",
    feat: 'F-2',
    tasks: [],
  },
  {
    name: 'Captures and promotion',
    description: "A capture moves the piece to its captor's hand; a piece entering the last three ranks may promote.",
    feat: 'F-3',
    tasks: [],
  },
  {
    name: 'Published to the registry',
    description: 'Built in the sandbox and published privately, so Plugins → Registry lists it for the reader.',
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
