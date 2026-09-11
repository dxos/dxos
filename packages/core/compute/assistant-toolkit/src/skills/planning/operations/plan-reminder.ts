//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as LanguageModel from 'effect/unstable/ai/LanguageModel';
import * as Prompt from 'effect/unstable/ai/Prompt';

import { AiPreprocessor, AiService } from '@dxos/ai';
import { Harness } from '@dxos/assistant';
import * as Chat from '@dxos/assistant/Chat';
import * as Operation from '@dxos/compute/Operation';
import { ContentBlock } from '@dxos/types';
import { concat, trim } from '@dxos/util';

import { PlanReminder } from './definitions.ts';

/**
 * End-request hook for the planning skill. When the conversation's checklist still has
 * open tasks, an ephemeral check asks the model — given the full conversation — whether the
 * agent should keep working: a deterministic reminder alone would trap an agent that legitimately
 * finishes with open items in an unbreakable re-prompt loop. On "continue" it enqueues a
 * continuation reminder onto the owning host's queue (HarnessService Tier B), which keeps the
 * process alive; on "stop" it does nothing so the agent may complete with items deliberately left
 * open.
 */
export default PlanReminder.pipe(
  Operation.withHandler(
    Effect.fnUntraced(
      function* () {
        const chat = yield* Harness.getChat.pipe(Effect.orElseSucceed(() => undefined));
        if (!chat) {
          return;
        }

        const tasks = yield* Chat.loadTasks(chat);
        if (!tasks.some(Chat.isOpenTask)) {
          return;
        }
        const checklist = yield* Chat.formatChecklist(chat);

        const history = yield* Harness.history;
        const prompt = Prompt.concat(
          yield* AiPreprocessor.preprocessPrompt(history, { system: checklistCompletionCheckSystem }),
          checklistCompletionCheckPrompt(checklist),
        );
        const { text: reply } = yield* Effect.scoped(LanguageModel.generateText({ prompt }));
        if (!parseContinueDecision(reply)) {
          return;
        }

        yield* Harness.enqueueMessage({
          content: [
            ContentBlock.Text.make({ text: checklistContinueReminderPrompt(checklist), disposition: 'synthetic' }),
          ],
        });
      },
      Effect.provide(AiService.model('com.anthropic.model.claude-sonnet-5.default')),
    ),
  ),
);

const checklistCompletionCheckSystem = concat`
  You decide whether an agent should stop or continue working on its checklist, given the conversation so far and the agent's remaining items.
  The user's request defines the scope: if the user asked for a specific task or subset and that work is complete, 
  the agent must STOP even though other items remain open — open items alone are not a reason to continue.
  Reply with exactly one word: "stop" or "continue". Do not use tools. Do not add explanation.
`;

const checklistCompletionCheckPrompt = (checklist: string): string => trim`
  The agent is about to finish, but its checklist still has unchecked items.

  <checklist>
  ${checklist}
  </checklist>

  Should the agent STOP now (the user's request is fulfilled, even if other items remain open)
  or CONTINUE working on the checklist (the user asked for more than has been done)?
  Reply with exactly one word: "stop" or "continue".
`;

/** Prefer an explicit "continue"; treat ambiguous replies as continue so open work is not dropped. */
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

const checklistContinueReminderPrompt = (checklist: string): string => trim`
  Your checklist still has unchecked items; continue working before finishing.

  <checklist>
  ${checklist}
  </checklist>
`;
