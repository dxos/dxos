//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { useOperation } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Ref } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { Column, IconButton, Panel, ScrollArea, Toolbar, useTranslation } from '@dxos/react-ui';
import { ActionMenu } from '@dxos/react-ui-menu';
import { TaskEditor, TaskHistory, TaskMnemonic, TaskProperties, TaskQuestion, TaskTags } from '@dxos/react-ui-task';
import { Task } from '@dxos/types';

import { meta } from '#meta';
import { TaskOperation } from '#types';

import { useMarkdownExtensions, useTaskActions } from '../../hooks/index.ts';
import { TaskArtifacts } from './TaskArtifacts.tsx';
import { TaskAttachmentDropZone, TaskAttachments, useAttachFiles } from './TaskAttachments.tsx';

export type TaskArticleProps = AppSurface.ObjectArticleProps<Task.Task>;

/**
 * Article surface for a single {@link Task} — the detail a row opens, reusing the task plank as the
 * reader moves down a list (see `plugin-projects/docs/TASK-DETAIL.md`).
 *
 * The pane is one column: a toolbar carrying what acts on the task, then the fields, the open
 * questions, the history and the artifacts, each starting at the same edge with its glyphs in the
 * gutter beside it (see `react-ui-task/docs/DETAIL-LAYOUT.md`).
 *
 * The fields are `TaskEditor` — the same title field and markdown description the list's strip
 * edits, without the strip's create case or its selection, which a pane with a subject has no use
 * for. Edits go through {@link TaskOperation.UpdateTask} rather than writing fields directly, so the
 * article shares the history-writing path with the list and with agents.
 *
 * A file dropped or pasted anywhere over the pane is stored and attached (`Task.attachments`), when
 * a plugin that can store files is present.
 */
export const TaskArticle = ({ role, subject: task, attendableId }: TaskArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const spaceId = Obj.getDatabase(task)?.spaceId;
  const descriptionExtensions = useMarkdownExtensions(task);

  const handleUpdate = useOperation(
    TaskOperation.UpdateTask,
    (task: Task.Task, props: Task.Edit) => ({ task: Ref.make(task), ...props }),
    { spaceId },
  );
  const { onFiles: handleAttach, pending: pendingAttachments } = useAttachFiles(task);

  // Record-only: an agent that asked over the MCP reads the answer back off the task.
  const handleQuestionAnswer = useOperation(
    TaskOperation.AnswerQuestion,
    (task: Task.Task, question: string, answer: string) => ({ task: Ref.make(task), question, answer }),
    { spaceId },
  );

  // The property, not the whole task: subscribing to the object itself would hand the article a
  // snapshot in place of the live task.
  const [history] = useObject(task, 'history');

  // Open questions only: an answered one is already a line in the history below it.
  const openQuestions = useMemo(() => Task.getQuestions(history ?? []).filter(({ answer }) => !answer), [history]);

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar>
        <Toolbar.Root classNames='dx-document'>
          {/* Actions only: what the task IS — its status, estimate and priority — reads with the
              text below, while the toolbar carries what can be done to it. */}
          <Toolbar.Separator variant='gap' />
          <TaskActions task={task} />
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content asChild>
        <ScrollArea.Root thin>
          <ScrollArea.Viewport classNames='dx-document'>
            <TaskAttachmentDropZone onFiles={handleAttach}>
              {/* One column for the whole pane, so the gutter has a single owner: the fields, the
                section headings and the cards all start at the content track, and only a glyph
                hangs outside it. */}
              <Column.Root gutter='md' gap='lg' classNames='py-2'>
                <Column.Center>
                  {/* The task's own fields, not the list's strip: the pane has a subject, so it
                    needs neither the create case nor the selection the strip reads. */}
                  <TaskEditor
                    task={task}
                    onUpdate={handleUpdate}
                    showDescription
                    descriptionExtensions={descriptionExtensions}
                    classNames='dx-document'
                  />
                </Column.Center>

                {/* What the task carries, in a flow rather than the row's one scrolling line: the
                  pane has the width to wrap them, and a chip that wraps is a chip the reader can
                  see without dragging the row sideways. */}
                <Column.Center classNames='flex flex-wrap items-center gap-1' data-testid='tasksPlugin.tags'>
                  {/* First, and always present: the mnemonic is what the task is called when it is
                    referred to elsewhere, so the chip that copies it leads the flow whether or not
                    the task carries anything else. */}
                  <TaskMnemonic task={task} />
                  <TaskTags task={task} />
                </Column.Center>

                {/* The task's own fields, under what it says: they are properties of the task, so
                  they read after the description rather than as chrome above it — and with the
                  room a pane has, each says what its glyph means. */}
                <TaskProperties task={task} onTaskUpdate={handleUpdate} />

                {/* Headed like the sections around it, and only when something is waiting: a
                  standing "Questions" label over nothing says the pane expects them, when what a
                  task with none has is nothing to answer. */}
                {openQuestions.length > 0 && (
                  <Column.Section label={t('task-questions.label')}>
                    {openQuestions.map((thread) => (
                      <TaskQuestion
                        key={thread.question.id}
                        thread={thread}
                        onAnswer={(answer) => handleQuestionAnswer(task, thread.question.id, answer)}
                      />
                    ))}
                  </Column.Section>
                )}

                <TaskAttachments task={task} canAttach={!!handleAttach} pending={pendingAttachments} />

                {history && history.length > 0 && <TaskHistory entries={history} />}

                <TaskArtifacts task={task} />
              </Column.Root>
            </TaskAttachmentDropZone>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Content>
    </Panel.Root>
  );
};

TaskArticle.displayName = 'TaskArticle';

/**
 * The actions plugins contributed for this task, plus Delete — the same items the list offers in a
 * row's trailing gutter, where the pane's whole subject is the task and they are its actions.
 */
const TaskActions = ({ task }: { task: Task.Task }) => {
  const { t } = useTranslation(meta.profile.key);
  const contributed = useTaskActions();
  const actions = useMemo(() => contributed(task), [contributed, task]);

  if (actions.length === 0) {
    return null;
  }

  return (
    <ActionMenu deferUntilOpen actions={actions}>
      <IconButton
        variant='ghost'
        iconOnly
        icon='ph--dots-three-vertical--regular'
        label={t('task-actions.label')}
        data-testid='tasksPlugin.task.actions'
      />
    </ActionMenu>
  );
};
