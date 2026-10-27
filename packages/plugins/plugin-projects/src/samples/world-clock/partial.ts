//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import { Database, Ref, Relation } from '@dxos/echo';
import { Text } from '@dxos/schema';
import { Outline, Spec, Task, TaskSet } from '@dxos/types';

import { Feature, FeatureSpec } from '#types';

import {
  type Variant,
  WORLD_CLOCK_SPEC,
  WORLD_CLOCK_SPEC_PATH,
  makeComposerPlugin,
} from '../../templates/composer-plugin.ts';

/** The project's title, which the sandbox, the chat and the autocue flows find it by. */
export const PROJECT_NAME = 'World Clock';

/** The feature every other one builds on: the page the map and the clocks render in. */
const ROOT_FEATURE = 'F-1';

export type WorldClockResult = {
  project: Project.Project;
  spec: Spec.Spec;
  features: Feature.Feature[];
};

/**
 * The Composer Plugin project titled "World Clock", with its spec as an artifact and one feature per `feat` block of
 * that spec, so the feature map shows what the run will build before it starts.
 */
export const makePartial = (variant: Variant): SampleSpace.Partial<WorldClockResult> =>
  SampleSpace.partial('world-clock', {
    schemas: [
      Project.Project,
      Instructions.Instructions,
      Outline.Outline,
      Text.Text,
      TaskSet.TaskSet,
      Task.Task,
      Spec.Spec,
      Feature.Feature,
      Feature.DependsOn,
      Feature.Implements,
    ],
    run: () =>
      Effect.gen(function* () {
        const scaffolded = yield* makeComposerPlugin(variant)
          .scaffold({ name: PROJECT_NAME })
          .pipe(
            Effect.mapError(
              (cause) => new SampleSpace.SampleSpaceError({ context: { reason: 'scaffold-project' }, cause }),
            ),
          );
        const project = yield* Database.add(scaffolded);
        const spec = project.artifacts.map((ref) => ref.target).find((target) => Spec.isSpec(target));
        if (!spec) {
          return yield* Effect.fail(new SampleSpace.SampleSpaceError({ context: { reason: 'spec-missing' } }));
        }

        const projectRef = Ref.make(project);
        const features: Feature.Feature[] = [];
        for (const block of FeatureSpec.parse(WORLD_CLOCK_SPEC)) {
          features.push(
            yield* Database.add(
              Feature.make({
                name: block.name,
                description: block.description,
                requirements: block.requirements,
                status: 'planned',
                specs: [FeatureSpec.getSource(WORLD_CLOCK_SPEC_PATH, block.id)],
                project: projectRef,
              }),
            ),
          );
        }

        const root = features.find((feature) => feature.specs?.[0]?.endsWith(`#${ROOT_FEATURE}`));
        const parent = project.taskSet?.target?.tasks[0]?.target;
        for (const feature of features) {
          if (root && feature !== root) {
            yield* Database.add(Feature.makeDependsOn({ [Relation.Source]: feature, [Relation.Target]: root }));
          }
          if (parent) {
            yield* Database.add(Feature.makeImplements({ [Relation.Source]: parent, [Relation.Target]: feature }));
          }
        }

        return { project, spec, features };
      }),
  });
