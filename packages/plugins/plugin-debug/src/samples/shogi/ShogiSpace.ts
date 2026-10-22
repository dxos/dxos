//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';

import { FeaturesPartial } from './features.ts';
import { ProjectPartial, type Toolchain } from './project.ts';
import { SpecPartial } from './spec.ts';
import { Tasks } from './tasks.ts';
import { REFERENCE } from './util.ts';

export { ARCHITECTURE, COMPLETE_SPEC, PLAN } from './tasks.ts';
export { type Toolchain } from './project.ts';

const partials = {
  tasks: Tasks,
  project: ProjectPartial,
  spec: SpecPartial,
  features: FeaturesPartial,
};

/**
 * A Composer plugin, seeded as a plan for the agent to finish: a shogi board in every space. The space holds a
 * partial spec (`SPEC.mdl`: the pieces and the board written, the moves, the captures and the publish only named),
 * the project's feature map with one feature per spec block, and three tasks: complete the spec, draw it, and plan the
 * implementation as tasks. The agent then builds the plugin in a sandbox on EDGE and publishes it to the reader's
 * private plugin registry, where installing it is the reader's click.
 *
 * It is Hello Worker's shape with the plugin toolchain's ending, so it needs what that toolchain needs: a build of
 * Composer that stamped the commit its packages are published at, and an EDGE that runs the registry.
 */
export const make = (toolchain: Toolchain): SampleSpace.Definition<typeof partials, void> =>
  SampleSpace.make({
    space: { name: 'Shogi Plugin', icon: 'castle-turret', hue: 'amber' },
    reference: REFERENCE,
    partials,
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

export const makeTemplate = (toolchain: Toolchain): AppCapabilities.SpaceTemplate =>
  SampleSpace.makeTemplate({
    id: 'org.dxos.plugin-debug.template.shogi',
    description:
      'A partial spec, its feature map and a plan for the agent to finish: it completes the spec, draws it, files the tasks and publishes a shogi plugin to your private registry.',
    definition: make(toolchain),
  });
