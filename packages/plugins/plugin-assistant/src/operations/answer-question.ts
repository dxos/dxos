//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Chat from '@dxos/assistant/Chat';
import * as Operation from '@dxos/compute/Operation';
import * as Trace from '@dxos/compute/Trace';
import { Database, Obj, type Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { Question, type Task } from '@dxos/types';
import { trim } from '@dxos/util';

import { AssistantOperation } from '#types';

/**
 * What the resumed agent is told. It names the question rather than quoting the answer: the answer
 * is already durable on the object, so an agent that reads it back there sees whatever the reader
 * actually chose — including an edit made after the fact — rather than a copy frozen into a message.
 */
const resumePrompt = ({ question, task }: { question: Question.Question; task?: Task.Task }): string => trim`
  Your question on ${task ? `the task "${task.title}"` : 'a task'} has been answered.
  Read it back with the get-objects tool, passing {"/": "${Obj.getURI(question)}"} — the answer is the
  object's "selectedAnswer" field.
  Then continue: update the task's status yourself if the answer unblocks it, and ask again if it does not.
`;

/** Resolves a ref, or nothing — a dangling or unloadable ref is not a reason to refuse the answer. */
const tryLoad = <T extends Obj.Unknown>(ref: Ref.Ref<T> | undefined) =>
  ref === undefined
    ? Effect.succeed(undefined)
    : Database.load(ref).pipe(Effect.orElseSucceed(() => undefined as T | undefined));

/**
 * Records the answer, then wakes the conversation that asked.
 *
 * The task is deliberately NOT unblocked here: only the agent knows whether the answer actually
 * cleared what it was stuck on, and a status this code flips to `todo` would be a guess that the
 * checklist then carries as fact. The resume prompt says so explicitly.
 */
const handler: Operation.WithHandler<typeof AssistantOperation.AnswerQuestion> = AssistantOperation.AnswerQuestion.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ question, answer }) {
      // An answered question is left alone rather than overwritten: the agent has already been
      // resumed on the first answer, and a second would resume it against a decision it never saw.
      if (Question.isAnswered(question) || !Question.answer(question, answer)) {
        return { accepted: false, resumed: false };
      }

      const task = yield* tryLoad(question.task);
      yield* Trace.write(Trace.QuestionAnswered, {
        questionId: question.id,
        text: question.text,
        ...(task ? { taskId: task.id } : {}),
        answer: question.selectedAnswer ?? answer,
      });
      yield* Database.flush();

      // A question asked outside a conversation (or whose chat has since gone) is still answered —
      // the record is the point; there is simply nobody to wake.
      const chat = yield* tryLoad(question.conversation);
      if (!chat || !Obj.instanceOf(Chat.Chat, chat)) {
        return { accepted: true, resumed: false };
      }

      // The answer is already durable, so a host that cannot reach the agent must not take it back:
      // the reader answered, and re-asking them because the wake failed would be the worse outcome.
      // The question stays answered and the task stays blocked, which is a state a person can see
      // and retry from.
      const resumed = yield* Operation.invoke(AssistantOperation.RunPromptInChat, {
        chat,
        disposition: 'synthetic',
        prompt: resumePrompt({ question, task }),
      }).pipe(
        Effect.as(true),
        Effect.catchCause((cause) =>
          Effect.sync(() => {
            log.warn('question answered but the conversation could not be resumed', { question: question.id, cause });
            return false;
          }),
        ),
      );

      return { accepted: true, resumed };
    }),
  ),
);

export default handler;
