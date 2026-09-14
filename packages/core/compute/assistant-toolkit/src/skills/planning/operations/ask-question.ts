//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Harness } from '@dxos/assistant';
import * as Chat from '@dxos/assistant/Chat';
import * as Operation from '@dxos/compute/Operation';
import * as Trace from '@dxos/compute/Trace';
import { Database, Obj, Ref } from '@dxos/echo';
import { Question, Task } from '@dxos/types';
import { trim } from '@dxos/util';

import { AskQuestion } from './definitions.ts';

/**
 * Files a question on a checklist task and blocks the task on it.
 *
 * The task is matched by title, as every planning tool matches one — the model is handed a numbered
 * checklist of titles and nothing else, so a ref it cannot see would be a ref it has to invent.
 *
 * Three writes, deliberately together: without the artifact the question is unreachable from the
 * task, without `blocked` the checklist reads as work in progress that nothing is advancing, and
 * without the conversation ref the answer has no session to resume.
 */
export default AskQuestion.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ task: title, question: text, context, options }) {
      const chat = yield* Harness.getChat;
      const { db } = yield* Database.Service;

      const tasks = yield* Chat.loadTasks(chat);
      const task = tasks.find((candidate) => candidate.title === title.trim());
      if (!task) {
        // Not a failure: the model gets the checklist back and re-reads the title it should have used.
        return trim`
          No task titled "${title.trim()}" is on this conversation's checklist, so no question was asked.
          Ask again naming one of these exactly, or add the task first with update-tasks.

          <checklist>
          ${yield* Chat.formatChecklist(chat)}
          </checklist>
        `;
      }

      // Parented to the task, so a question dies with the work it was about rather than outliving
      // it as an orphan nobody can place.
      const question = db.add(
        Question.make({
          text: text.trim(),
          ...(context ? { context } : {}),
          ...(options && options.length > 0
            ? { options: options.map(({ title, description }) => ({ title, ...(description ? { description } : {}) })) }
            : {}),
          task: Ref.make(task),
          conversation: Ref.make(chat),
          [Obj.Parent]: task,
        }),
      );
      Task.addArtifact(task, question);

      const previousStatus = task.status;
      Task.setStatus(task, 'blocked');
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

      return trim`
        Question filed on "${task.title}", which is now blocked. Stop here and end your turn — you are
        sent a message when it is answered, and you read the answer back with the get-objects tool.
        Show the reader the question by emitting this line verbatim, on its own:

        <surface role="question">{"question":"${question.id}"}</surface>

        <checklist>
        ${yield* Chat.formatChecklist(chat)}
        </checklist>
      `;
    }),
  ),
  Operation.opaqueHandler,
);
