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

export { FORECAST_URL } from './util.ts';

const partials = {
  tasks: Tasks,
  project: ProjectPartial,
};

/**
 * The fastest loop through building an MCP server and using it: one Worker with one tool over the
 * Open-Meteo forecast, four tasks from an empty sandbox to a tool call in this chat, all of them the
 * agent's.
 *
 * It sits between `WorkerSpace` (a deploy with nothing to call) and `StockfishSpace` (an engine, a
 * design stage and a publish step): enough to exercise the whole build → deploy → configure → call
 * path, small enough to run unattended. The account stays temporary and unclaimed, and the agent adds
 * the server to the space as an MCP connection.
 */
export const make = (): SampleSpace.Definition<typeof partials, void> =>
  SampleSpace.make({
    // Reaches a space only where the definition is applied directly (the generator panel, the
    // archive test): the create-space dialog takes its icon from `space-templates.ts`.
    space: { name: 'Weather MCP', icon: 'sun', hue: 'sky' },
    reference: REFERENCE,
    partials,
    build: (partials) =>
      Effect.gen(function* () {
        const tasks = yield* partials.tasks();
        yield* partials.project({ tasks });

        // No root collection: this space seeds no documents — the project and its tasks surface
        // through their own containers.
      }),
  });

export const makeTemplate = (): AppCapabilities.SpaceTemplate =>
  SampleSpace.makeTemplate({
    id: 'org.dxos.plugin-debug.template.weather',
    description:
      'Four tasks an agent runs alone: a one-tool MCP server over a weather API, deployed to a temporary Worker and called from the chat.',
    definition: make(),
  });
