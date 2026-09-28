//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';

import { ProjectPhase } from './project.ts';
import { Tasks } from './tasks.ts';
import { REFERENCE } from './util.ts';

export { MANIFEST_URL } from './util.ts';

const phases = {
  tasks: Tasks,
  project: ProjectPhase,
};

/**
 * A Composer plugin built from inside Composer: four tasks from an empty folder to a TypeScript
 * plugin, compiled with the official tooling, that adds a live clock page under its own navtree group and is
 * offered back as an inline load prompt.
 *
 * Runs against a local Composer served by `vite preview` with the Computer shell mounted — the
 * shell is what reaches the repo's toolchain and the served `out/composer`.
 */
export const make = (): SampleSpace.Definition<typeof phases, void> =>
  SampleSpace.make({
    // Reaches a space only where the definition is applied directly (the generator panel, the
    // archive test): the create-space dialog takes its icon from `space-templates.ts`.
    space: { name: 'Composer Plugin', icon: 'command', hue: 'violet' },
    reference: REFERENCE,
    phases,
    build: (phases) =>
      Effect.gen(function* () {
        const tasks = yield* phases.tasks();
        yield* phases.project({ tasks });

        // No root collection: this space seeds no documents — the project and its tasks surface
        // through their own containers.
      }),
  });

export const makeTemplate = (): AppCapabilities.SpaceTemplate =>
  SampleSpace.makeTemplate({
    id: 'org.dxos.plugin-debug.template.plugin',
    description:
      'Four tasks an agent runs on this machine: a TypeScript Composer plugin with its own navtree group, built and offered to load.',
    definition: make(),
  });
