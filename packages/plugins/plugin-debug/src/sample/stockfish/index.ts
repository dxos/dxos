//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Ref } from '@dxos/echo';

import { Docs } from './docs';
import { ChessGame } from './game';
import { ProjectPhase } from './project';
import { DevelopmentSkill } from './skill';
import { Tasks } from './tasks';
import { REFERENCE } from './util';

const phases = {
  skill: DevelopmentSkill,
  docs: Docs,
  game: ChessGame,
  tasks: Tasks,
  project: ProjectPhase,
};

/**
 * A starting point rather than a finished world: the brief for a chess engine exposed as an MCP
 * server on Cloudflare Workers, the plan to build it as a task tree nothing has started on, a
 * position to point the finished thing at, and the development-preferences skill a chat working it
 * runs with.
 *
 * The other sample spaces depict a project mid-flight; this one is meant to be RUN. Every task is
 * `todo`, the design artifact the first stage produces is deliberately absent, and neither the MCP
 * server record nor a repository is seeded — stages four and five create them.
 *
 * It is deliberately reachable with no credentials but the reader's own DXOS identity: the chat runs
 * DeepSeek through the edge, the first deploy uses wrangler's unauthenticated mode, and the only two
 * consent screens are in the last stage.
 */
export const StockfishSpace = (): SampleSpace.Definition<typeof phases, void> =>
  SampleSpace.make({
    // Reaches a space only where the definition is applied directly (the generator panel, the
    // archive test): the create-space dialog takes its icon from `space-templates.ts`, which
    // overrides every template's by list index. See DESIGN.md §7.
    space: { name: 'Chess MCP on Workers', icon: 'shield-star', hue: 'amber' },
    reference: REFERENCE,
    phases,
    build: (phases) =>
      Effect.gen(function* () {
        const skill = yield* phases.skill();
        const docs = yield* phases.docs();
        const game = yield* phases.game();
        const tasks = yield* phases.tasks();
        yield* phases.project({ docs, tasks, skill, game });

        // The root holds collections only. Project/TaskSet/Task/Skill/Game are not collection-item
        // types, so they live directly in the space DB and surface through their own containers.
        yield* SampleSpace.collection('Documents', [Ref.make(docs.brief)]);
      }),
  });
