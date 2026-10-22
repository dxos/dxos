//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database, Ref, Relation } from '@dxos/echo';
import * as Feature from '@dxos/plugin-projects/Feature';

import { type Config } from './config.ts';
import { type ProjectResult } from './project.ts';
import { type TasksResult } from './tasks.ts';

//
// The project's feature map: one feature per spec block the finished spec will have, all `planned` — the template is a
// plan to run. Each feature needs the one before it. Only the diagram task is seeded against one; the agent links the
// implementation tasks it files, so the map fills in as the plan does.
//

export type FeaturesInput = { tasks: TasksResult; project: ProjectResult };

export type FeaturesResult = { features: Feature.Feature[] };

export const makeFeatures = (config: Config): SampleSpace.Partial<FeaturesResult, FeaturesInput> =>
  SampleSpace.partial('features', {
    schemas: [Feature.Feature, Feature.DependsOn, Feature.Implements],
    run: ({ tasks, project }: FeaturesInput) =>
      Effect.gen(function* () {
        const projectRef = Ref.make(project.project);
        const features: Feature.Feature[] = [];
        for (const seed of config.features) {
          features.push(
            yield* Database.add(
              Feature.make({
                name: seed.name,
                description: seed.description,
                status: 'planned',
                specs: [`${config.spec.path}#${seed.feat}`],
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
          for (const taskIndex of config.features[index].tasks) {
            yield* Database.add(
              Feature.makeImplements({ [Relation.Source]: tasks.tasks[taskIndex], [Relation.Target]: feature }),
            );
          }
        }

        return { features };
      }),
  });
