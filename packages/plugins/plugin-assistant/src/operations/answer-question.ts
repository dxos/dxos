//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';

import * as Chat from '@dxos/assistant/Chat';
import * as Operation from '@dxos/compute/Operation';
import * as Trace from '@dxos/compute/Trace';
import { Database, Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { Task } from '@dxos/types';

import { AssistantOperation } from '#types';

import { resumePrompt } from './resume-prompt.ts';

/**
 * Records the answer in the task's history, then wakes the conversation that asked.
 *
 * The task is deliberately NOT unblocked here: only the agent knows whether the answer actually
 * cleared what it was stuck on, and a status this code flips to `todo` would be a guess that the
 * checklist then carries as fact. The resume prompt says so explicitly.
 */
const handler: Operation.WithHandler<typeof AssistantOperation.AnswerQuestion> = AssistantOperation.AnswerQuestion.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ task, question: questionId, answer }) {
      // `Task.answer` refuses a blank, unknown or already-answered question: the agent has already
      // been resumed on a first answer, and a second would resume it against a decision it never saw.
      const thread = Task.getQuestions(task.history).find(({ question }) => question.id === questionId);
      const entry = thread && Task.answer(task, questionId, answer);
      if (!thread || !entry) {
        return { accepted: false, resumed: false };
      }

      yield* Trace.write(Trace.QuestionAnswered, {
        questionId,
        text: thread.question.text,
        taskId: task.id,
        answer: entry.answer,
      });
      yield* Database.flush();

      // A question asked outside a conversation (or whose chat has since gone) is still answered —
      // the record is the point; there is simply nobody to wake.
      const conversation = thread.question.conversation;
      const chat = conversation && (yield* Database.load(conversation).pipe(Effect.orElseSucceed(() => undefined)));
      if (!chat || !Obj.instanceOf(Chat.Chat, chat)) {
        return { accepted: true, resumed: false };
      }

      // The answer is already durable, so a host that cannot reach the agent must not take it back:
      // re-asking the reader because the wake failed is the worse outcome. Interruption still
      // propagates — converting it to `resumed: false` would defeat cancellation of this operation.
      const resumed = yield* Operation.invoke(AssistantOperation.RunPromptInChat, {
        chat,
        disposition: 'synthetic',
        prompt: resumePrompt({ task, questionId }),
      }).pipe(
        Effect.as(true),
        Effect.catchCause((cause) =>
          Cause.hasInterruptsOnly(cause)
            ? Effect.failCause(cause)
            : Effect.sync(() => {
                log.warn('question answered but the conversation could not be resumed', {
                  task: task.id,
                  question: questionId,
                  cause,
                });
                return false;
              }),
        ),
      );

      return { accepted: true, resumed };
    }),
  ),
);

export default handler;
