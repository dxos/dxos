//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Prompt from '@effect/ai/Prompt';
import * as Effect from 'effect/Effect';

import { AiPreprocessor, AiService } from '@dxos/ai';
import { Harness } from '@dxos/assistant';
import { Operation } from '@dxos/compute';
import { Database } from '@dxos/echo';
import { ContentBlock } from '@dxos/types';
import { trim } from '@dxos/util';

import { Plan, Agent } from '../../../types';
import { PlanReminder } from './definitions';

/**
 * End-request hook for the planning blueprint. When the agent's plan still has open tasks, an
 * ephemeral check asks the model — given the full conversation — whether the agent should keep
 * working: a deterministic reminder alone would trap an agent that legitimately finishes with open
 * tasks in an unbreakable re-prompt loop. On "continue" it enqueues a continuation reminder onto the
 * owning host's queue (HarnessService Tier B), which keeps the process alive; on "stop" it does
 * nothing so the agent may complete with tasks deliberately left open.
 */
export default PlanReminder.pipe(
  Operation.withHandler(
    Effect.fnUntraced(
      function* () {
        const agent = yield* Agent.getFromChatContext.pipe(Effect.orElseSucceed(() => undefined));
        if (!agent) {
          return;
        }
        const plan = yield* Database.load(agent.plan).pipe(Effect.orElseSucceed(() => undefined));
        if (!plan || !Plan.hasIncompleteTasks(plan)) {
          return;
        }

        const history = yield* Harness.history;
        const prompt = Prompt.merge(
          yield* AiPreprocessor.preprocessPrompt(history, { system: planCompletionCheckSystem }),
          planCompletionCheckPrompt(plan),
        );
        const { text } = yield* Effect.scoped(LanguageModel.generateText({ prompt }));

        if (!parseContinueDecision(text)) {
          return;
        }

        yield* Harness.enqueueMessage({
          content: [ContentBlock.Text.make({ text: planContinueReminderPrompt(plan), disposition: 'synthetic' })],
        });
      },
      Effect.provide(AiService.model('ai.claude.model.claude-sonnet-4-5')),
    ),
  ),
);

const planCompletionCheckSystem = trim`
  You decide whether an agent should stop or continue working on its plan, given the conversation
  so far and the agent's remaining plan tasks.
  Reply with exactly one word: "stop" or "continue". Do not use tools. Do not add explanation.
`;

const planCompletionCheckPrompt = (plan: Plan.Plan): string => trim`
  The agent is about to finish, but its plan still has incomplete tasks:

  <plan>
  ${Plan.formatPlan(plan)}
  </plan>

  Should the agent STOP now (no more work needed) or CONTINUE working on the plan?
  Reply with exactly one word: "stop" or "continue".
`;

/** Prefer an explicit "continue"; treat ambiguous replies as continue so open plan work is not dropped. */
const parseContinueDecision = (reply: string): boolean => {
  const normalized = reply.toLowerCase();
  if (/\bcontinue\b/.test(normalized)) {
    return true;
  }
  if (/\bstop\b/.test(normalized)) {
    return false;
  }
  return true;
};

const planContinueReminderPrompt = (plan: Plan.Plan): string => trim`
  Your plan still has incomplete tasks — continue working before finishing:

  <plan>
  ${Plan.formatPlan(plan)}
  </plan>
`;
