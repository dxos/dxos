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
import { ContentBlock, Outline } from '@dxos/types';
import { trim } from '@dxos/util';

import { Chat } from '../../../types';
import { PlanReminder } from './definitions';

/**
 * End-request hook for the planning skill. When the conversation's working outline still has
 * unchecked items, an ephemeral check asks the model — given the full conversation — whether the
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
        const chat = yield* Chat.getFromContext.pipe(Effect.orElseSucceed(() => undefined));
        if (!chat) {
          return;
        }
        // Only consult an outline that already exists — the reminder never creates one.
        const outline = yield* resolveExistingOutline(chat);
        if (!outline) {
          return;
        }
        const text = yield* Database.load(outline.content).pipe(Effect.orElseSucceed(() => undefined));
        if (!text || !Outline.hasOpenItems(text.content)) {
          return;
        }

        const history = yield* Harness.history;
        const prompt = Prompt.merge(
          yield* AiPreprocessor.preprocessPrompt(history, { system: checklistCompletionCheckSystem }),
          checklistCompletionCheckPrompt(text.content),
        );
        const { text: reply } = yield* Effect.scoped(LanguageModel.generateText({ prompt }));

        if (!parseContinueDecision(reply)) {
          return;
        }

        yield* Harness.enqueueMessage({
          content: [ContentBlock.Text.make({ text: checklistContinueReminderPrompt(text.content), disposition: 'synthetic' })],
        });
      },
      Effect.provide(AiService.model('com.anthropic.model.claude-sonnet-4-6.default')),
    ),
  ),
);

/**
 * The working outline, if one exists: the parent project's, else the chat's own. Mirrors
 * {@link Chat.ensureOutline}'s resolution order without the create path.
 */
const resolveExistingOutline = (chat: Chat.Chat) =>
  Effect.gen(function* () {
    const ref = Chat.peekOutlineRef(chat);
    if (!ref) {
      return undefined;
    }
    return yield* Database.load(ref).pipe(Effect.orElseSucceed(() => undefined));
  });

const checklistCompletionCheckSystem = trim`
  You decide whether an agent should stop or continue working on its checklist, given the
  conversation so far and the agent's remaining items.
  Reply with exactly one word: "stop" or "continue". Do not use tools. Do not add explanation.
`;

const checklistCompletionCheckPrompt = (markdown: string): string => trim`
  The agent is about to finish, but its checklist still has unchecked items:

  <checklist>
  ${markdown}
  </checklist>

  Should the agent STOP now (no more work needed) or CONTINUE working on the checklist?
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

const checklistContinueReminderPrompt = (markdown: string): string => trim`
  Your checklist still has unchecked items — continue working before finishing:

  <checklist>
  ${markdown}
  </checklist>
`;
