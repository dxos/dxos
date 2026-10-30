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
import { REFERENCE } from './util.ts';

export { ARCHITECTURE, BUILD, VERIFY } from './tasks.ts';

const partials = {
  tasks: Tasks,
  project: ProjectPartial,
  spec: SpecPartial,
  features: FeaturesPartial,
};

/**
 * A page worth deploying: one Cloudflare Worker that tells a cyclist whether to ride now, from a live Open-Meteo
 * forecast, built with DXOS UI. The space holds the spec with four features written, the feature map with one card per
 * feature, and three tasks — draw it, build and deploy it, check it — so the run reaches a URL within one task and the
 * reader can then change a feature card and watch the redeploy.
 *
 * It replaces `WorkerSpace`'s JSON greeting as the demo of the spec → diagram → deploy → edit loop: every step here
 * changes something a viewer can see.
 */
export const make = (): SampleSpace.Definition<typeof partials, void> =>
  SampleSpace.make({
    space: { name: 'Ride Check', icon: 'bicycle', hue: 'emerald' },
    reference: REFERENCE,
    partials,
    build: (partials) =>
      Effect.gen(function* () {
        const tasks = yield* partials.tasks();
        const project = yield* partials.project({ tasks });
        const spec = yield* partials.spec();
        yield* partials.features({ tasks, project, spec });

        // No root collection: the project, its tasks and features, and the spec surface through their own containers.
      }),
  });

export const makeTemplate = (): AppCapabilities.SpaceTemplate =>
  SampleSpace.makeTemplate({
    id: 'org.dxos.plugin-debug.template.ride-check',
    description:
      'A spec, a feature map and three tasks for the agent: it draws the plan, builds a ride-forecast page with DXOS UI and deploys it as a Cloudflare Worker you can edit and redeploy.',
    definition: make(),
  });
