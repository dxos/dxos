//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import * as Trace from '@dxos/compute/Trace';
import { Database } from '@dxos/echo';
import { Task } from '@dxos/types';

import { TaskOperation } from '#types';

import { InvalidOperationInput } from '../errors.ts';

const handler: Operation.WithHandler<typeof TaskOperation.AskQuestion> = TaskOperation.AskQuestion.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ task: taskRef, question: text, context, options, actor }) {
      const task = yield* Database.load(taskRef);

      // A retried call must not file a second question: the user would have two to answer where the
      // asker is only waiting on the first.
      if (Task.getPendingQuestions(task.history).length > 0) {
        return yield* Effect.fail(
          new InvalidOperationInput({
            message: `"${task.title}" already has an unanswered question; wait for it to be answered.`,
          }),
        );
      }
      if (text.trim() === '') {
        return yield* Effect.fail(new InvalidOperationInput({ message: 'The question is empty.' }));
      }

      const question = Task.ask(task, {
        text,
        ...(context ? { context } : {}),
        ...(options && options.length > 0 ? { options } : {}),
        ...(actor ? { actor } : {}),
      });

      const previousStatus = task.status;
      Task.setStatus(task, 'blocked', actor ? { actor } : {});
      if (task.status !== undefined && task.status !== previousStatus) {
        yield* Trace.write(Trace.TaskStatusChanged, {
          taskId: task.id,
          title: task.title,
          status: task.status,
          ...(previousStatus ? { previousStatus } : {}),
        });
      }
      yield* Trace.write(Trace.QuestionAsked, {
        questionId: question.id,
        text: question.text,
        taskId: task.id,
        options: question.options?.length ?? 0,
      });
      yield* Database.flush();

      return { questionId: question.id, task };
    }),
  ),
);

export default handler;
