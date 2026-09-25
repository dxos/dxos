//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { useOperation } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Ref } from '@dxos/echo';
import { Panel } from '@dxos/react-ui';
import { TaskList } from '@dxos/react-ui-task';
import { Task } from '@dxos/types';

import { TaskOperation } from '#types';

import { useMarkdownExtensions } from '../../hooks/index.ts';
import { TaskArtifacts } from './TaskArtifacts.tsx';

export type TaskArticleProps = AppSurface.ObjectArticleProps<Task.Task>;

/**
 * Article surface for a single {@link Task} — the detail a row opens, reusing the task plank as the
 * reader moves down a list (see `plugin-projects/docs/TASK-DETAIL.md`).
 *
 * The body is the list's own editor (`TaskList.Edit`) rather than a schema form, so a task reads and
 * edits the same way wherever it is opened: one title field and a markdown description, with the
 * host's contributed extensions live in it. The editor takes its subject from the surrounding
 * `TaskList.Root` — here a root of exactly this task, held selected, so the pane is always editing
 * rather than dropping back to its create case.
 *
 * Edits go through {@link TaskOperation.UpdateTask} rather than writing fields directly, so the
 * article shares the history-writing path with the list and with agents.
 */
export const TaskArticle = ({ role, subject: task }: TaskArticleProps) => {
  const spaceId = Obj.getDatabase(task)?.spaceId;
  const descriptionExtensions = useMarkdownExtensions(task);

  const handleUpdate = useOperation(
    TaskOperation.UpdateTask,
    (task: Task.Task, props: Task.Edit) => ({ task: Ref.make(task), ...props }),
    { spaceId },
  );

  // Record-only: an agent that asked over the MCP reads the answer back off the task.
  const handleQuestionAnswer = useOperation(
    TaskOperation.AnswerQuestion,
    (task: Task.Task, question: string, answer: string) => ({ task: Ref.make(task), question, answer }),
    { spaceId },
  );

  return (
    <Panel.Root role={role}>
      <Panel.Content>
        {/* No `onTaskCreate`: creating belongs to the list, so the pane here only ever edits. */}
        <TaskList.Root
          tasks={[task]}
          selected={task.id}
          showDescription
          onTaskUpdate={handleUpdate}
          onQuestionAnswer={handleQuestionAnswer}
        >
          <TaskList.Edit showDescription descriptionExtensions={descriptionExtensions} classNames='dx-document p-2' />
        </TaskList.Root>
        <TaskArtifacts task={task} />
      </Panel.Content>
    </Panel.Root>
  );
};

TaskArticle.displayName = 'TaskArticle';
