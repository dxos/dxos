//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Feed, Filter } from '@dxos/echo';
import { type CompletionGuard } from '@dxos/functions-runtime';

import { Agent, Plan } from '../types';

const findAgentForFeed = (feed: Feed.Feed): Effect.Effect<Agent.Agent | undefined, never, Database.Service> =>
  Effect.gen(function* () {
    const agents = yield* Database.query(Filter.type(Agent.Agent)).run;
    for (const agent of agents) {
      if (!agent.chat) {
        continue;
      }
      const matches = yield* Effect.gen(function* () {
        const chat = yield* Database.load(agent.chat!);
        const chatFeed = yield* Database.load(chat.feed);
        return chatFeed.id === feed.id;
      }).pipe(Effect.orElseSucceed(() => false));
      if (matches) {
        return agent;
      }
    }
    return undefined;
  });

const hasIncompleteTasks = (plan: Plan.Plan): boolean =>
  plan.tasks.some((task) => task.status === 'todo' || task.status === 'in-progress');

/**
 * Returns a markdown plan summary when the conversation's agent still has open plan tasks.
 */
export const makePlanCompletionGuard = (): CompletionGuard => ({
  getIncompletePlanSummary: (feed) =>
    Effect.gen(function* () {
      const agent = yield* findAgentForFeed(feed);
      if (!agent?.plan) {
        return undefined;
      }
      const plan = yield* Database.load(agent.plan).pipe(Effect.orElseSucceed(() => undefined));
      if (!plan || !hasIncompleteTasks(plan)) {
        return undefined;
      }
      return Plan.formatPlan(plan);
    }),
});
