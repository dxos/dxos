//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';

import { FeaturesPartial } from './features.ts';
import { ProjectPartial } from './project.ts';
import { SpecPartial } from './spec.ts';
import { Tasks } from './tasks.ts';

export { ARCHITECTURE, COMPLETE_SPEC, PLAN } from './tasks.ts';
import { REFERENCE } from './util.ts';

const partials = {
  tasks: Tasks,
  project: ProjectPartial,
  spec: SpecPartial,
  features: FeaturesPartial,
};

/**
 * The smallest thing that still builds and deploys: one Cloudflare Worker returning a greeting and the time, seeded
 * as a plan for the agent to finish. The space holds a spec whose document is partial (`SPEC.mdl`: the endpoint
 * written, the deploy, its check and the claim only named), with one feature per spec block, and three tasks:
 * complete the spec, draw it, and plan the implementation as tasks. The agent then works its own tasks until the
 * Worker answers, so a reader watches the spec, the diagram and the task list fill in before any code runs.
 *
 * It is the short path through the same ground `StockfishSpace` covers at length: there the work is the engine and
 * the deploy is one stage of five; here the deploy IS the project.
 *
 * Reachable with no credentials but the reader's own DXOS identity: the deploy uses wrangler's unauthenticated mode,
 * and the single consent screen, the claim, is the reader's.
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
        const project = yield* partials.project({ tasks });
        const spec = yield* partials.spec();
        yield* partials.features({ tasks, project, spec });

        // No root collection: the root holds collections only, and this space seeds no documents -
        // the project, its tasks, and the spec with its features and document surface through their own containers.
      }),
  });

export const makeTemplate = (): AppCapabilities.SpaceTemplate =>
  SampleSpace.makeTemplate({
    id: 'org.dxos.plugin-debug.template.worker',
    description:
      'A partial spec, its feature map and a plan for the agent to finish: it completes the spec, draws it, files the tasks and deploys a Cloudflare Worker, with no account to start.',
    definition: make(),
  });
