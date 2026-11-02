//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';

import { BUDGETS, goalWithEngines } from '#model';
import { LighthouseOperation } from '#types';

import { ResearchGoalMissingError } from '../errors.ts';
import { loadClient } from './util.ts';

const handler: Operation.WithHandler<typeof LighthouseOperation.StartResearch> = LighthouseOperation.StartResearch.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ research: researchRef, images }) {
      const research = yield* Database.load(researchRef);
      if (!research.goal.trim()) {
        return yield* Effect.fail(new ResearchGoalMissingError());
      }
      const client = yield* loadClient(research);
      const { run } = yield* client.createSession({
        goal: goalWithEngines(research.goal, research.engines),
        budget: BUDGETS[research.budget ?? 'quick'],
        ...(images?.length ? { images } : {}),
      });
      Obj.update(research, (research) => {
        research.run = run;
        research.lastRunAt = new Date().toISOString();
      });
      return run;
    }),
  ),
);

export default handler;
