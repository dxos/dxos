//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import * as Trace from '@dxos/compute/Trace';
import { Database } from '@dxos/echo';
import { Task } from '@dxos/types';

import { TaskOperation } from '#types';

/**
 * Records the answer. The task is left blocked: only the asker knows whether the answer cleared what
 * it was stuck on, so unblocking it is the asker's write, not a guess made here.
 */
const handler: Operation.WithHandler<typeof TaskOperation.AnswerQuestion> = TaskOperation.AnswerQuestion.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ task: taskRef, question: questionId, answer, actor }) {
      const task = yield* Database.load(taskRef);
      const thread = Task.getQuestions(task.history).find(({ question }) => question.id === questionId);
      const entry = thread && Task.answer(task, questionId, answer, actor ? { actor } : {});
      if (!thread || !entry) {
        return { accepted: false };
      }

      yield* Trace.write(Trace.QuestionAnswered, {
        questionId,
        text: thread.question.text,
        taskId: task.id,
        answer: entry.answer,
      });
      yield* Database.flush();
      return { accepted: true };
    }),
  ),
);

export default handler;
