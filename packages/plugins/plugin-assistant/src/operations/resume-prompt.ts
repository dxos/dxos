//
// Copyright 2026 DXOS.org
//

import { Obj } from '@dxos/echo';
import { type Task } from '@dxos/types';
import { trim } from '@dxos/util';

/**
 * What the resumed agent is told. It names the question rather than quoting the answer: the answer
 * is already durable in the task's history, so an agent that reads it back there sees the record
 * itself rather than a copy frozen into a message.
 */
export const resumePrompt = ({ task, questionId }: { task: Task.Task; questionId: string }): string => trim`
  Your question on the task "${task.title}" has been answered.
  Read the task back with the get-objects tool, passing {"/": "${Obj.getURI(task)}"} — the answer is the
  entry in its "history" whose "event" is "answer" and whose "questionId" is "${questionId}".
  Then continue: update the task's status yourself if the answer unblocks it, and ask again if it does not.
`;
