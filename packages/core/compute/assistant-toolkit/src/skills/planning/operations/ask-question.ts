//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Harness } from '@dxos/assistant';
import * as Chat from '@dxos/assistant/Chat';
import * as Operation from '@dxos/compute/Operation';
import * as Trace from '@dxos/compute/Trace';
import { Database, Ref } from '@dxos/echo';
import { Task } from '@dxos/types';
import { trim } from '@dxos/util';

import { AskQuestion } from './definitions.ts';
import { selfActor } from './update-tasks.ts';

/**
 * Files a question on a checklist task and blocks the task on it.
 *
 * The task is matched by title: the question has to name the task in words the reader recognizes,
 * and the title is the only part of a task the person answering ever sees. Two tasks sharing one
 * title are refused rather than guessed between — blocking the wrong one would leave the right one
 * looking live while nothing advances it.
 *
 * The question lands in the task's own history, so it cannot be separated from the work it blocks.
 * The task is set `blocked` alongside it — otherwise the checklist reads as work in progress that
 * nothing is advancing — and the entry carries the conversation ref, without which the answer has
 * no session to resume.
 */
export default AskQuestion.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ task: title, question: text, context, options }) {
      const chat = yield* Harness.getChat;

      const tasks = yield* Chat.loadTasks(chat);
      const matches = tasks.filter((candidate) => candidate.title === title.trim());
      if (matches.length > 1) {
        return trim`
          "${title.trim()}" is the title of ${matches.length} tasks on this conversation's checklist, so
          nothing was filed — blocking the wrong one would leave the right one looking live. Give the
          tasks distinct titles with update-tasks, then ask again.

          <checklist>
          ${yield* Chat.formatChecklist(chat)}
          </checklist>
        `;
      }
      const [task] = matches;
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

      // A retried tool call must not file a second question: the reader would have two to answer
      // where only the first resumes anything cleanly, and the second answer would wake the same
      // chat again.
      if (Task.getPendingQuestions(task.history).length > 0) {
        return trim`
          "${task.title}" already has an unanswered question, so nothing was filed. Wait for it to be
          answered rather than asking again.

          <checklist>
          ${yield* Chat.formatChecklist(chat)}
          </checklist>
        `;
      }

      const question = Task.ask(task, {
        text,
        ...(context ? { context } : {}),
        ...(options && options.length > 0
          ? { options: options.map(({ title, description }) => ({ title, ...(description ? { description } : {}) })) }
          : {}),
        conversation: Ref.make(chat),
        actor: yield* selfActor(chat),
      });

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
        sent a message when it is answered, and you read the answer back off the task's history.
        Show the reader the question by emitting this line verbatim, on its own:

        <surface role="question">{"task":"${task.id}","question":"${question.id}"}</surface>

        <checklist>
        ${yield* Chat.formatChecklist(chat)}
        </checklist>
      `;
    }),
  ),
  Operation.opaqueHandler,
);
