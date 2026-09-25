//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface, useOperation } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Ref } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { Column, IconButton, Panel, ScrollArea, Toolbar, useTranslation } from '@dxos/react-ui';
import { ActionMenu } from '@dxos/react-ui-menu';
import { TaskHistory, TaskList, TaskProperties, TaskQuestion } from '@dxos/react-ui-task';
import { Task } from '@dxos/types';

import { meta } from '#meta';
import { TaskOperation } from '#types';

import { useMarkdownExtensions, useTaskActions } from '../../hooks/index.ts';

export type TaskArticleProps = AppSurface.ObjectArticleProps<Task.Task>;

/**
 * Article surface for a single {@link Task} — the detail a row opens, reusing the task plank as the
 * reader moves down a list (see `plugin-projects/docs/TASK-DETAIL.md`).
 *
 * The pane is one column: a toolbar carrying what acts on the task, then the fields, the open
 * questions, the history and the artifacts, each starting at the same edge with its glyphs in the
 * gutter beside it (see `react-ui-task/docs/DETAIL-LAYOUT.md`).
 *
 * The fields are the list's own editor (`TaskList.Edit`) rather than a schema form, so a task reads
 * and edits the same way wherever it is opened: one title field and a markdown description, with the
 * host's contributed extensions live in it. Edits go through {@link TaskOperation.UpdateTask} rather
 * than writing fields directly, so the article shares the history-writing path with the list and
 * with agents.
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

  // Record-only: an agent that asked over the MCP reads the answer back off the task.
  const handleQuestionAnswer = useOperation(
    TaskOperation.AnswerQuestion,
    (task: Task.Task, question: string, answer: string) => ({ task: Ref.make(task), question, answer }),
    { spaceId },
  );

  // The property, not the whole task: the query re-emits on membership only, so an artifact recorded
  // on the open task would otherwise not reach the stack until the reader selected away and back.
  // Subscribing to the object itself would hand the article a snapshot in place of the live task.
  const [artifacts] = useObject(task, 'artifacts');
  const [history] = useObject(task, 'history');

  // Open questions only: an answered one is already a line in the history below it.
  const openQuestions = useMemo(() => Task.getQuestions(history ?? []).filter(({ answer }) => !answer), [history]);

  return (
    // Headless, and outside the panel: the toolbar's controls read the task's update handler from
    // this context, as the list's rows do, so status and estimate are set the same way in both.
    <TaskList.Root
      tasks={[task]}
      selected={task.id}
      showDescription
      onTaskUpdate={handleUpdate}
      onQuestionAnswer={handleQuestionAnswer}
    >
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
          <ScrollArea.Root orientation='vertical' thin>
            <ScrollArea.Viewport>
              {/* One column for the whole pane, so the gutter has a single owner: the fields, the
                  section headings and the cards all start at the content track, and only a glyph
                  hangs outside it. */}
              <Column.Root gutter='md' gap='lg' classNames='py-2'>
                <Column.Center>
                  <TaskList.Edit
                    showDescription
                    // The status glyph and the estimate are in the toolbar above, and the sections
                    // below are the article's own — the editor here is the fields and nothing else.
                    showControls={false}
                    showSections={false}
                    descriptionExtensions={descriptionExtensions}
                    classNames='dx-document'
                  />
                </Column.Center>

                {/* The task's own fields, under what it says: they are properties of the task, so
                    they read after the description rather than as chrome above it — and with the
                    room a pane has, each says what its glyph means. */}
                <TaskProperties task={task} onTaskUpdate={handleUpdate} />

                {openQuestions.map((thread) => (
                  <TaskQuestion
                    key={thread.question.id}
                    thread={thread}
                    onAnswer={(answer) => handleQuestionAnswer(task, thread.question.id, answer)}
                  />
                ))}

                {history && history.length > 0 && <TaskHistory entries={history} />}

                {/* What the task produced, as cards. `plugin-space` renders the grid; nothing shows
                    for a task with no artifacts, so the section is absent rather than empty. */}
                {artifacts && artifacts.length > 0 && (
                  <Column.Section label={t('task-artifacts.label')} classNames='gap-y-0'>
                    <Surface.Surface
                      type={AppSurface.CardMasonry}
                      data={{ objects: artifacts, attendableId }}
                      limit={1}
                    />
                  </Column.Section>
                )}
              </Column.Root>
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        </Panel.Content>
      </Panel.Root>
    </TaskList.Root>
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
