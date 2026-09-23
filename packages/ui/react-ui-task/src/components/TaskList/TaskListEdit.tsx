//
// Copyright 2026 DXOS.org
//

import React, { type KeyboardEvent, useCallback, useMemo, useRef, useState } from 'react';

import { useObject } from '@dxos/echo-react';
import { Field, Icon, Toolbar, composable, composableProps, useTranslation } from '@dxos/react-ui';
import { MarkdownEditable, type MarkdownEditableController, type MarkdownEditableProps } from '@dxos/react-ui-markdown';
import { mx } from '@dxos/ui-theme';
import { type ComposableProps } from '@dxos/ui-types';

import { translationKey } from '#translations';

import { TaskHistory } from './TaskHistory.tsx';
import { useTaskListContext } from './TaskListContext.ts';
import { TaskEstimateControl, TaskPriorityIcon, TaskStatusControl } from './TaskRowCells.tsx';

//
// Create — the add row; renders nothing unless the root supplies `onTaskCreate`.
//

export type TaskListEditProps = ComposableProps<{
  /** Placeholder for the title field when nothing is selected (the create case). */
  placeholder?: string;
  /**
   * Edit a description under the title — the selected task's, or the new task's when creating, so a
   * task can be added with one. Off by default, matching `Root`'s `showDescription`: a markdown
   * field is several rows tall wherever it appears, which a single-line strip has no room for.
   */
  showDescription?: boolean;
  /** Placeholder for the description field. */
  descriptionPlaceholder?: string;
  /** Editor extensions for the description field beyond its own — what the host's plugins contribute. */
  descriptionExtensions?: MarkdownEditableProps['extensions'];
  /**
   * Lay the pane out on the list's own column template, so the title field starts where the rows'
   * titles do and the icon sits under their status controls. Off by default: a pane used away from
   * a list (a dialog, a story) has no columns to line up with.
   */
  grid?: boolean;
  /**
   * Only ever create — the pane ignores the selection instead of editing it. For a host whose detail
   * lives elsewhere (a task plank opened from the row): there, a selected row would otherwise turn
   * the only create affordance into an editor, leaving no way to type a new task.
   */
  createOnly?: boolean;
}>;

/**
 * The detail half of the list: it edits whichever task is selected, and creates one when none is.
 *
 * Editing lives here rather than in the row because a row is 32px of shared subgrid — a field
 * opening inside it moves everything around it. A pane below the list has room to be a field.
 */
export const TaskListEdit = composable<HTMLDivElement, TaskListEditProps>(
  (
    {
      placeholder = 'Add task',
      showDescription = false,
      descriptionPlaceholder = 'Add a description',
      descriptionExtensions,
      grid,
      createOnly = false,
      ...props
    },
    forwardedRef,
  ) => {
    const { t } = useTranslation(translationKey);
    const { className, ...rest } = composableProps(props);
    const descriptionRef = useRef<MarkdownEditableController>(null);
    const { tasks, selected, onTaskCreate, onTaskUpdate, onTaskSelect, gridTemplateColumns, showEstimates } =
      useTaskListContext('TaskList.Edit');

    const task = useMemo(
      () => (createOnly ? undefined : tasks.find(({ id }) => id === selected)),
      [createOnly, tasks, selected],
    );
    // Subscribe to the selected task so the pane follows a rename made anywhere else.
    const [snapshot] = useObject(task);
    const current = snapshot ?? task;

    // The create row's description, mirrored out of the field. A ref rather than state because the
    // create reads it in the same tick it commits the field, and `useEditable` calls back
    // synchronously — a `setState` would still hold the previous render's text.
    const draftDescription = useRef('');
    // Bumped after a create, to rebuild the held-open editor empty. The field is uncontrolled while
    // creating (there is no task to read from), so clearing it means remounting it.
    const [createEpoch, setCreateEpoch] = useState(0);

    const [draft, setDraft] = useState('');
    // The pane is a view onto whichever task is selected, so switching tasks replaces the text it
    // holds rather than carrying the previous one's across. The description ref is cleared here too:
    // the field remounts empty on the way back to creating, but `commit()` on an already-empty field
    // never calls back — so text abandoned before a selection would otherwise ride along, unseen,
    // into the next task created.
    //
    // State rather than a ref for the previous id (React's adjust-state-on-prop-change pattern): a
    // render React abandons leaves a ref already mutated, so the retry would skip the reset and the
    // pane would keep the previous task's text.
    const [editingId, setEditingId] = useState<string | undefined>(undefined);
    if (editingId !== current?.id) {
      setEditingId(current?.id);
      setDraft(current?.title ?? '');
      draftDescription.current = '';
    }

    const commitTitle = useCallback(() => {
      const title = draft.trim();
      if (task && current) {
        if (title.length > 0 && title !== current.title) {
          onTaskUpdate?.(task, { title });
        }
      } else if (title.length > 0) {
        // Nothing has committed the description yet — it is held open and the reader is in the
        // title — so commit it here, before assembling the draft it belongs to.
        descriptionRef.current?.commit();
        const description = draftDescription.current.trim();
        onTaskCreate?.({ title, ...(description.length > 0 && { description }) });
        setDraft('');
        draftDescription.current = '';
        setCreateEpoch((epoch) => epoch + 1);
      }
    }, [draft, task, current, onTaskCreate, onTaskUpdate]);

    // Blur commits a rename but never a create: leaving the field is not a decision to add a task,
    // and half a title would become one — clicking the list, the thread, or anywhere else would
    // leave a stray behind. Creating takes Enter or Save, which are the deliberate acts.
    const handleTitleBlur = useCallback(() => {
      if (task && current) {
        commitTitle();
      }
    }, [task, current, commitTitle]);

    const handleTitleKeyDown = useCallback(
      (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
          commitTitle();
        }
      },
      [commitTitle],
    );

    // Writes both fields and leaves, as cancelling does — the pane drops back to creating either
    // way, and only what it did with the pending text differs. Creating commits the description
    // itself (it is part of the draft), so this only has to for an edit.
    const handleSave = useCallback(() => {
      commitTitle();
      if (task && current) {
        descriptionRef.current?.commit();
      }
      onTaskSelect?.(undefined);
    }, [commitTitle, task, current, onTaskSelect]);

    // Throws away the pending edit and leaves: the pane drops back to creating, which is the same
    // exit Escape on a row gives. Reverting first, since deselecting unmounts the fields. An
    // abandoned create is cleared rather than reverted — a blur may already have committed text into
    // the field, and reverting would restore exactly that.
    const handleCancel = useCallback(() => {
      if (task && current) {
        descriptionRef.current?.revert();
      } else {
        draftDescription.current = '';
        setCreateEpoch((epoch) => epoch + 1);
      }
      setDraft('');
      onTaskSelect?.(undefined);
    }, [task, current, onTaskSelect]);

    // Nothing to create with and nothing to edit: the pane has no purpose.
    if (!onTaskCreate && !(current && onTaskUpdate)) {
      return null;
    }

    // On the list's template the pane has the rows' columns: the ordinal gutter it leaves empty, the
    // status column takes the icon, and the title column takes the field — which is what puts the
    // caret where the rows' titles start. Off it, the pane keeps a template of its own.
    return (
      // One grid, not a row of grids: the title and the description line up column for column, and
      // the toolbar can sit on the title line while coming LAST in the DOM — so Tab runs title →
      // description → buttons rather than stopping at a button on the way to the text.
      <div
        {...rest}
        data-testid='taskList.edit'
        // Three rows, placed explicitly rather than by flow: header (icon, title, toolbar),
        // description, history. Auto-placement drops a cell into whatever track is free, which put
        // the description in the icon column whenever the toolbar was absent.
        className={mx(
          // The gap between the rows is the grid's, not a margin on each cell: a margin has to be
          // repeated on every cell that might start a row, and is missed by whichever one is added next.
          'grid w-full min-w-0 shrink-0 grid-rows-[auto_auto_auto] gap-y-2',
          !grid && 'grid-cols-[2rem_1fr_min-content]',
          className,
        )}
        // On the list's own template the pane's cells name their tracks, so the icon sits under the
        // rows' status controls and the field under their titles whatever the list's options are;
        // the toggle and gutter tracks stay empty.
        style={grid ? { gridTemplateColumns } : undefined}
        ref={forwardedRef}
      >
        {/* Placed explicitly: with a gutter the pane leaves that track empty, and implicit placement
            would drop the icon into it. Editing, the cell is the row's own status control — the
            same glyph, and the same menu, so status is set where the task is read rather than only
            from the row behind the pane. Creating, there is no task to carry a status yet. */}
        {task && current ? (
          <TaskStatusControl
            task={task}
            classNames={mx('self-start', grid ? 'col-[status]' : 'col-start-1')}
            onTaskUpdate={onTaskUpdate}
          />
        ) : (
          <span
            className={mx('flex items-center justify-center h-(--dx-control)', grid ? 'col-[status]' : 'col-start-1')}
          >
            <Icon icon='ph--plus--regular' classNames='text-subdued' />
          </span>
        )}
        <Field.Root>
          <Field.Input
            variant='subdued'
            classNames={mx('px-0', grid && 'col-start-[title] -col-end-2')}
            data-testid='taskList.edit.title'
            placeholder={current ? t('task-title.placeholder') : placeholder}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleTitleKeyDown}
            onBlur={handleTitleBlur}
          />
        </Field.Root>
        {showDescription && (current ? onTaskUpdate : onTaskCreate) && (
          <div
            data-testid='taskList.edit.description'
            // Placed explicitly, never by flow: the toolbar is absent until something is typed, so a
            // description left to auto-place would take the cell it vacates and fall into the icon
            // column — a field one word wide. It runs to the row's end: the toolbar sits on the
            // title line only.
            className={mx('flex min-w-0 row-start-2 -col-end-1', grid ? 'col-start-[title]' : 'col-start-2')}
          >
            {/* A description is markdown, so it is edited as markdown. `editing` is held open —
                the pane IS the editor, so there is nothing to click into — and the key remounts
                it per task, since a field held open never re-reads its subject.
                Creating, the field is uncontrolled: there is no task to read a value from, so it
                holds the draft itself until the create collects it. */}
            <MarkdownEditable
              key={current?.id ?? `create-${createEpoch}`}
              ref={descriptionRef}
              // A long description scrolls within the field rather than growing the pane past the
              // list it edits from: eight lines, with the scroller's line-height set to the lines'
              // (CodeMirror's base theme gives it a smaller one) so `lh` measures a real line.
              classNames='[&_.cm-scroller]:!leading-normal [&_.cm-scroller]:max-h-[8lh] [&_.cm-scroller]:overflow-y-auto'
              editing
              multiline
              placeholder={descriptionPlaceholder}
              extensions={descriptionExtensions}
              // Held open, so it must not pull focus: selecting a row by keyboard would otherwise
              // land the reader in the description instead of the list.
              autoFocus={false}
              {...(current && { value: current.description ?? '' })}
              onValueChange={(description) => {
                if (task && current) {
                  onTaskUpdate?.(task, { description });
                } else {
                  draftDescription.current = description;
                }
              }}
            />
          </div>
        )}
        {/* The log, on the row below the description: it reports what has happened to the task, so it
            reads under what the task says rather than beside it. Only when editing — a task being
            created has no history yet, and the add row must stay one line tall. */}
        {current && current.history && current.history.length > 0 && (
          <TaskHistory
            entries={current.history}
            // On the pane's own tracks: an entry's glyph then sits in the same column as the pane's
            // leading icon and its text under the title, rather than in a nested grid of its own
            // that starts where the title does.
            subgrid
            cells={{
              // Centred in its track, as the pane's own leading icon is, so the two sit on one axis.
              icon: mx('justify-self-center', grid ? 'col-[status]' : 'col-start-1'),
              description: grid ? 'col-start-[title] -col-end-2' : 'col-start-2',
              date: grid ? 'col-start-[-2] -col-end-1' : 'col-start-3',
            }}
            classNames={mx('min-w-0 row-start-3', grid ? 'col-start-[tree-row-start] -col-end-1' : 'col-span-full')}
          />
        )}
        {/* The description is held open with no blur to commit it, so the pane needs to say
            explicitly what happens to the pending text. Both buttons keep focus where it is
            (`preventDefault` on mousedown): the fields commit on blur, so a button that took focus
            would commit before its own handler ran — and Cancel could never mean anything.
            Placed on the title line explicitly; its place in the DOM is what orders Tab.

            Hidden while the add row is untouched: with nothing typed there is nothing to save and
            nothing to cancel, and two dead controls on an empty row read as a form to fill in
            rather than a place to type. */}
        {(current || draft.trim().length > 0) && (
          <Toolbar.Root density='sm' classNames='row-start-1 col-start-[-2] justify-self-end p-0 bg-transparent'>
            {/* Only when editing an existing task: the create row has nothing to set an estimate or
                priority on until it is saved. */}
            {task && showEstimates && <TaskEstimateControl task={task} />}
            {task && <TaskPriorityIcon task={task} />}
            <Toolbar.IconButton
              variant='ghost'
              iconOnly
              icon='ph--check--regular'
              data-testid='taskList.edit.save'
              label={t('save-task.label')}
              onClick={handleSave}
              onMouseDown={(event) => event.preventDefault()}
            />
            <Toolbar.IconButton
              variant='ghost'
              iconOnly
              icon='ph--x--regular'
              data-testid='taskList.edit.cancel'
              label={t('cancel-edit.label')}
              onClick={handleCancel}
              onMouseDown={(event) => event.preventDefault()}
            />
          </Toolbar.Root>
        )}
      </div>
    );
  },
);

TaskListEdit.displayName = 'TaskList.Edit';
