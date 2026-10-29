//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Ref } from '@dxos/echo';

import { Docs } from './docs.ts';
import { ChessGame } from './game.ts';
import { ProjectPartial } from './project.ts';
import { DevelopmentSkill } from './skill.ts';
import { Tasks } from './tasks.ts';
import { REFERENCE } from './util.ts';

const partials = {
  skill: DevelopmentSkill,
  docs: Docs,
  game: ChessGame,
  tasks: Tasks,
  project: ProjectPartial,
};

/**
 * A starting point rather than a finished world: the brief for a chess engine exposed as an MCP
 * server on Cloudflare Workers, the plan to build it as a task tree nothing has started on, a
 * position to point the finished thing at, and the development-preferences skill a chat working it
 * runs with.
 *
 * The other space templates depict a project mid-flight; this one is meant to be RUN. Every task is
 * `todo`, the design artifact the first stage produces is deliberately absent, and neither the MCP
 * connection nor a repository is seeded - stages four and five create them.
 *
 * It is deliberately reachable with no credentials but the reader's own DXOS identity: the chat runs
 * DeepSeek through the edge, the first deploy uses wrangler's unauthenticated mode, and the only two
 * consent screens are in the last stage.
 */
export const make = (): SampleSpace.Definition<typeof partials, void> =>
  SampleSpace.make({
    // Reaches a space only where the definition is applied directly (the generator panel, the
    // archive test): the create-space dialog takes its icon from `space-templates.ts`, which
    // overrides every template's by list index. See DESIGN.md §7.
    space: { name: 'Chess MCP on Workers', icon: 'shield-star', hue: 'amber' },
    reference: REFERENCE,
    partials,
    build: (partials) =>
      Effect.gen(function* () {
        const skill = yield* partials.skill();
        const docs = yield* partials.docs();
        const game = yield* partials.game();
        const tasks = yield* partials.tasks();
        yield* partials.project({ docs, tasks, skill, game });

        // The root holds collections only. Project/TaskSet/Task/Skill/Game are not collection-item
        // types, so they live directly in the space DB and surface through their own containers.
        yield* SampleSpace.collection('Documents', [Ref.make(docs.brief)]);
      }),
  });

export const makeTemplate = (): AppCapabilities.SpaceTemplate =>
  SampleSpace.makeTemplate({
    id: 'org.dxos.plugin-debug.template.stockfish',
    description:
      'A brief, a five-stage plan as a task tree, a position to test against, and the skill for building it in a sandbox.',
    definition: make(),
  });
