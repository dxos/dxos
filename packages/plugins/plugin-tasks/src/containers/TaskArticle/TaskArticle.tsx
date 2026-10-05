//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { generateName } from '@dxos/display-name';
import { Obj, Ref, Type } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { useMembers } from '@dxos/halo-react';
import { Form, useFormContext, useSubmitOnEnter } from '@dxos/react-ui-form';
import { ActionMenu } from '@dxos/react-ui-menu';
import { TaskHistory, TaskProperties, TaskQuestion, TaskTags } from '@dxos/react-ui-task';
import * as Button from '@dxos/react-ui/Button';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import * as Typography from '@dxos/react-ui/Typography';
import { Task } from '@dxos/types';

import { meta } from '#meta';
import { TaskOperation } from '#types';

import { useMarkdownExtensions, useTaskActions } from '../../hooks/index.ts';
import { TaskArtifacts } from './TaskArtifacts.tsx';
import { TaskAttachmentDropZone, TaskAttachments, useAttachFiles } from './TaskAttachments.tsx';

export type TaskArticleProps = AppSurface.ObjectArticleProps<Task.Task>;

/**
 * Article surface for a single {@link Task}.
 *
 * The pane is one column: a toolbar carrying what acts on the task, then the fields, the open
 * questions, the history and the artifacts, each starting at the same edge with its glyphs in the
 * gutter beside it (see `react-ui-task/docs/DETAIL-LAYOUT.md`).
 *
 * The title and description are a form over the task's own schema. Edits go through
 * {@link TaskOperation.UpdateTask} rather than writing fields directly, so the article shares the
 * history-writing path with the list and with agents; a field commits when focus leaves it (or on Enter),
 * so a rename is one history entry rather than one per keystroke.
 *
 * A file dropped or pasted anywhere over the pane is stored and attached (`Task.attachments`), when
 * a plugin that can store files is present.
 */
export const TaskArticle = ({ role, subject: task, attendableId, nodeId = attendableId }: TaskArticleProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const spaceId = Obj.getDatabase(task)?.spaceId;
  const descriptionExtensions = useMarkdownExtensions(task);

  const handleUpdate = Hooks.useOperation(
    TaskOperation.UpdateTask,
    (task: Task.Task, props: Task.Edit) => ({ task: Ref.make(task), ...props }),
    { spaceId },
  );
  const { onFiles: handleAttach, pending: pendingAttachments } = useAttachFiles(task);

  // The task as plain values for the form; the article's other parts read the live task.
  const [snapshot] = useObject(task);
  const handleSave = useCallback(
    (values: Task.Task) => {
      const patch: Task.Edit = {};
      const title = values.title?.trim() ?? '';
      // An emptied title is not a rename: the task keeps the one it has.
      if (title.length > 0 && title !== task.title) {
        patch.title = title;
      }
      if ((values.description ?? '') !== (task.description ?? '')) {
        patch.description = values.description;
      }
      if (Object.keys(patch).length > 0) {
        handleUpdate(task, patch);
      }
    },
    [task, handleUpdate],
  );

  // Record-only: an agent that asked over the MCP reads the answer back off the task.
  const handleQuestionAnswer = Hooks.useOperation(
    TaskOperation.AnswerQuestion,
    (task: Task.Task, question: string, answer: string) => ({ task: Ref.make(task), question, answer }),
    { spaceId },
  );

  // The property, not the whole task: subscribing to the object itself would hand the article a
  // snapshot in place of the live task.
  const [history] = useObject(task, 'history');
  // Everyone in the space, the owner included, as assignees the picker can offer by identity.
  const spaceMembers = useMembers(Obj.getDatabase(task)?.spaceId);
  const members = useMemo(
    () =>
      spaceMembers.flatMap((member) =>
        member.did
          ? [
              {
                did: member.did,
                // A member with no profile name gets the generated one the rest of the app shows for it.
                name: member.displayName ?? (member.identityKey ? generateName(member.identityKey) : undefined),
              },
            ]
          : [],
      ),
    [spaceMembers],
  );

  // Open questions only: an answered one is a line in the activity below.
  const openQuestions = useMemo(() => Task.getQuestions(history ?? []).filter(({ answer }) => !answer), [history]);

  return (
    <Panel.Root role={role}>
      <Panel.Header>
        <Toolbar.Root classNames='dx-document'>
          {/* Actions only: what the task IS — its status, estimate and priority — reads with the
              text below, while the toolbar carries what can be done to it. */}
          <Toolbar.Separator variant='gap' />
          <TaskActions task={task} />
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body asChild>
        <ScrollArea.Root>
          <ScrollArea.Viewport classNames='dx-document'>
            <TaskAttachmentDropZone onFiles={handleAttach}>
              {/* One column for the whole pane, so the gutter has a single owner: the fields, the
                section headings and the cards all start at the content track, and only a glyph
                hangs outside it. */}
              <Layout.Container gutter='md' gap='lg' classNames='py-2'>
                {/* The task's own fields, not the list's strip: the pane has a subject, so it
                  needs neither the create case nor the selection the strip reads. */}
                {/* Keyed by task, so a new subject replaces the text held rather than carrying the previous one's across. */}
                <Form.Root
                  key={task.id}
                  schema={Type.getSchema(Task.Task)}
                  // The whole task, so the schema's other required fields validate; only the fields shown can change.
                  values={snapshot}
                  markdownExtensions={descriptionExtensions}
                  testId='tasksPlugin.fields'
                  autoSave
                  onSave={handleSave}
                >
                  <TaskFields untitled={!task.title} />
                </Form.Root>

                {/* What the task carries, in a flow rather than the row's one scrolling line: the
                  pane has the width to wrap them, and a chip that wraps is a chip the reader can
                  see without dragging the row sideways. */}
                <div className='flex flex-wrap items-center gap-1' data-testid='tasksPlugin.tags'>
                  <TaskTags task={task} />
                </div>

                {/* The task's own fields, under what it says: they are properties of the task, so
                  they read after the description rather than as chrome above it — and with the
                  room a pane has, each says what its glyph means. */}
                <TaskProperties task={task} members={members} onTaskUpdate={handleUpdate} />

                {/* Headed like the sections around it, and only when something is waiting: a
                  standing "Questions" label over nothing says the pane expects them, when what a
                  task with none has is nothing to answer. */}
                {openQuestions.length > 0 && (
                  <Layout.Container asChild gutter='inherit' gap='md'>
                    <section data-testid='tasksPlugin.questions'>
                      {/* Set as the form's field labels are, so the article's section headings read as one with them. */}
                      <Typography.Text asChild tone='subtle' classNames='dx-label py-0'>
                        <h2>{t('task-questions.label')}</h2>
                      </Typography.Text>
                      {openQuestions.map((thread) => (
                        <TaskQuestion
                          key={thread.question.id}
                          thread={thread}
                          onAnswer={(answer) => handleQuestionAnswer(task, thread.question.id, answer)}
                        />
                      ))}
                    </section>
                  </Layout.Container>
                )}

                <TaskAttachments
                  task={task}
                  canAttach={!!handleAttach}
                  pending={pendingAttachments}
                  detailOf={nodeId}
                />
                {history && history.length > 0 && <TaskHistory entries={history} />}
                <TaskArtifacts task={task} />
              </Layout.Container>
            </TaskAttachmentDropZone>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Body>
    </Panel.Root>
  );
};

TaskArticle.displayName = 'TaskArticle';

/**
 * The actions plugins contributed for this task, plus Delete — the same items the list offers in a
 * row's trailing gutter, where the pane's whole subject is the task and they are its actions.
 */
const TaskActions = ({ task }: { task: Task.Task }) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const contributed = useTaskActions();
  const actions = useMemo(() => contributed(task), [contributed, task]);

  if (actions.length === 0) {
    return null;
  }

  return (
    <ActionMenu deferUntilOpen actions={actions}>
      <Button.Root
        variant='ghost'
        iconOnly
        icon='ph--dots-three-vertical--regular'
        label={t('task-actions.label')}
        data-testid='tasksPlugin.task.actions'
      />
    </ActionMenu>
  );
};

/** The form fields the article edits; the rest of the task is shown by its own parts below. */
const FIELDS = new Set(['title', 'description']);

/**
 * The task's title and description. Enter in the title commits it, as blur does; an untitled task is one just
 * added (a sub-task from a row's menu), so its title takes focus.
 */
const TaskFields = ({ untitled }: { untitled: boolean }) => {
  const { form } = useFormContext(TaskFields.displayName);
  const contentRef = useRef<HTMLDivElement>(null);
  useSubmitOnEnter(contentRef, () => form.canSave && form.onSave());
  useEffect(() => {
    if (untitled) {
      contentRef.current?.querySelector('input')?.focus();
    }
    // Once per mount: the form is keyed by task, and clearing a title while typing must not re-focus it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Form.Content ref={contentRef}>
      <Form.Fields filter={(fields) => fields.filter(({ name }) => FIELDS.has(String(name)))} />
    </Form.Content>
  );
};

TaskFields.displayName = 'TaskArticle.Fields';
