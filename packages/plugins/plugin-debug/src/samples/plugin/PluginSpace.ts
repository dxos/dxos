//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';

import { type Config, type Toolchain } from './config.ts';
import { makeFeatures } from './features.ts';
import { makeProject } from './project.ts';
import { makeSpec } from './spec.ts';
import { makeTasks } from './tasks.ts';
import { REFERENCE } from './util.ts';

export { type FeatureSeed, type Config, type Toolchain } from './config.ts';
export { PLAN, architecture, completeSpec } from './tasks.ts';
export { instructions } from './project.ts';

const partials = (config: Config) => ({
  tasks: makeTasks(config),
  project: makeProject(config),
  spec: makeSpec(config),
  features: makeFeatures(config),
});

/**
 * A Composer plugin seeded as a plan for the agent to finish. The space holds a partial spec (the first feature
 * written, the rest only named), the project's feature map with one feature per spec block, and three tasks: complete
 * the spec, draw it, and plan the implementation as tasks. The agent then builds the plugin in a sandbox on EDGE and
 * publishes it to the reader's private plugin registry, where installing it is the reader's click.
 *
 * It is Hello Worker's shape with the plugin toolchain's ending, so it needs what that toolchain needs: a build of
 * Composer that stamped the commit its packages are published at, and an EDGE that runs the registry.
 */
export const make = (config: Config, toolchain: Toolchain): SampleSpace.Definition<ReturnType<typeof partials>, void> =>
  SampleSpace.make({
    space: config.space,
    reference: REFERENCE,
    partials: partials(config),
    build: (partials) =>
      Effect.gen(function* () {
        const tasks = yield* partials.tasks();
        const project = yield* partials.project({ tasks, ...toolchain });
        yield* partials.spec();
        yield* partials.features({ tasks, project });

        // No root collection: the root holds collections only, and this space seeds no documents —
        // the project, its tasks and features, and the spec its features open surface through their own containers.
      }),
  });

export const makeTemplate = (config: Config, toolchain: Toolchain): AppCapabilities.SpaceTemplate =>
  SampleSpace.makeTemplate({ id: config.id, description: config.description, definition: make(config, toolchain) });
