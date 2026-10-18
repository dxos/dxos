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

const partials = {
  tasks: Tasks,
  project: ProjectPartial,
};

/**
 * The smallest thing that still builds and deploys: one Cloudflare Worker returning a greeting and
 * the time, as six tasks from a diagram of the plan to a URL that answers.
 *
 * It is the short path through the same ground `StockfishSpace` covers at length. There the work is
 * the engine and the deploy is one stage of five; here the deploy IS the project, so there is no
 * brief to design against, no skill to bind and nothing seeded for the run to point at — a chat
 * that reads the task list has the whole specification.
 *
 * Reachable with no credentials but the reader's own DXOS identity: the first deploy uses wrangler's
 * unauthenticated mode, and the single consent screen is the last task.
 */
export const make = (): SampleSpace.Definition<typeof partials, void> =>
  SampleSpace.make({
    // Reaches a space only where the definition is applied directly (the generator panel, the
    // archive test): the create-space dialog takes its icon from `space-templates.ts`, which
    // overrides every template's by list index. See DESIGN.md §7.
    space: { name: 'Hello Worker', icon: 'rocket-launch', hue: 'cyan' },
    reference: REFERENCE,
    partials,
    build: (partials) =>
      Effect.gen(function* () {
        const tasks = yield* partials.tasks();
        yield* partials.project({ tasks });

        // No root collection: the root holds collections only, and this space seeds no documents —
        // the project and its tasks surface through their own containers.
      }),
  });

export const makeTemplate = (): AppCapabilities.SpaceTemplate =>
  SampleSpace.makeTemplate({
    id: 'org.dxos.plugin-debug.template.worker',
    description:
      'Six tasks from an architecture diagram to a Cloudflare Worker that answers, with no account to start.',
    definition: make(),
  });
