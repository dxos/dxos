//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import * as SpaceTemplate from '@dxos/app-toolkit/SpaceTemplate';

import { ProjectPhase } from './project.ts';
import { WeatherSkill } from './skill.ts';
import { Tasks } from './tasks.ts';
import { REFERENCE } from './util.ts';

export { FORECAST_URL } from './util.ts';

const phases = {
  skill: WeatherSkill,
  tasks: Tasks,
  project: ProjectPhase,
};

/**
 * The fastest loop through building an MCP server and using it: one Worker with one tool over the
 * Open-Meteo forecast, four tasks from an empty sandbox to a tool call in this chat, all of them the
 * agent's.
 *
 * It sits between `WorkerTemplate` (a deploy with nothing to call) and `StockfishTemplate` (an engine, a
 * design stage and a publish step): enough to exercise the whole build → deploy → configure → call
 * path, small enough to run unattended. The account stays temporary and unclaimed, and the server is
 * configured on a seeded skill because a skill is where a chat reads MCP servers from.
 */
export const make = (): SpaceTemplate.Definition<typeof phases, void> =>
  SpaceTemplate.make({
    // Reaches a space only where the definition is applied directly (the generator panel, the
    // archive test): the create-space dialog takes its icon from `space-templates.ts`.
    space: { name: 'Weather MCP', icon: 'sun', hue: 'sky' },
    reference: REFERENCE,
    phases,
    build: (phases) =>
      Effect.gen(function* () {
        const skill = yield* phases.skill();
        const tasks = yield* phases.tasks();
        yield* phases.project({ tasks, skill });

        // No root collection: this space seeds no documents — the project, its tasks and the skill
        // surface through their own containers.
      }),
  });
