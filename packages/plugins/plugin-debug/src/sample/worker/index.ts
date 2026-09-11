//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';

import { ProjectPhase } from './project.ts';
import { Tasks } from './tasks.ts';
import { REFERENCE } from './util.ts';

const phases = {
  tasks: Tasks,
  project: ProjectPhase,
};

/**
 * The smallest thing that still builds and deploys: one Cloudflare Worker returning a greeting and
 * the time, as five tasks from an empty sandbox to a URL that answers.
 *
 * It is the short path through the same ground `StockfishSpace` covers at length. There the work is
 * the engine and the deploy is one stage of five; here the deploy IS the project, so there is no
 * brief to design against, no skill to bind and nothing seeded for the run to point at — a chat
 * that reads the task list has the whole specification.
 *
 * Reachable with no credentials but the reader's own DXOS identity: the first deploy uses wrangler's
 * unauthenticated mode, and the single consent screen is the last task.
 */
export const WorkerSpace = (): SampleSpace.Definition<typeof phases, void> =>
  SampleSpace.make({
    // Reaches a space only where the definition is applied directly (the generator panel, the
    // archive test): the create-space dialog takes its icon from `space-templates.ts`, which
    // overrides every template's by list index. See DESIGN.md §7.
    space: { name: 'Hello Worker', icon: 'rocket-launch', hue: 'cyan' },
    reference: REFERENCE,
    phases,
    build: (phases) =>
      Effect.gen(function* () {
        const tasks = yield* phases.tasks();
        yield* phases.project({ tasks });

        // No root collection: the root holds collections only, and this space seeds no documents —
        // the project and its tasks surface through their own containers.
      }),
  });
