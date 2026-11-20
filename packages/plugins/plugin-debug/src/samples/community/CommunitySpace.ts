//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';

import { ProjectPartial } from './project.ts';
import { Tasks } from './tasks.ts';
import { REFERENCE } from './util.ts';

export { DECK, DOCS, PROBLEMS, PRODUCTS, STACK, WEEKS } from './tasks.ts';

const partials = {
  tasks: Tasks,
  project: ProjectPartial,
};

/**
 * A small analysis project over a community's memory: five tasks that each ask one question of the space's facts and
 * name the artifact the answer goes in (four sheets with charts and a docs-gap brief), and a deck that presents them.
 * The memory is not part of the template — it is the Cloudflare Developers Discord TriG, imported through the Memory
 * panel — so the space is a project waiting for its data and for an agent to work it.
 */
export const make = (): SampleSpace.Definition<typeof partials, void> =>
  SampleSpace.make({
    space: { name: 'Cloudflare community', icon: 'chart-bar', hue: 'amber' },
    reference: REFERENCE,
    partials,
    build: (partials) =>
      Effect.gen(function* () {
        const tasks = yield* partials.tasks();
        yield* partials.project({ tasks });
      }),
  });

export const makeTemplate = (): AppCapabilities.SpaceTemplate =>
  SampleSpace.makeTemplate({
    id: 'org.dxos.plugin-debug.template.community',
    description:
      "An analysis project for a community's memory: import the Cloudflare Discord facts, hand the tasks to the agent, and each comes back with its sheet, brief or deck attached.",
    definition: make(),
  });
