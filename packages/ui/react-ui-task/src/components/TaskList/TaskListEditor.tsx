//
// Copyright 2026 DXOS.org
//

import React, {
  type ClipboardEvent,
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useObject } from '@dxos/echo-react';
import { log } from '@dxos/log';
import {
  Button,
  ControlFrame,
  Field,
  Icon,
  Input,
  SystemButton,
  Tag,
  composable,
  composableProps,
  useDynamicRef,
  useTranslation,
} from '@dxos/react-ui';
import { MarkdownEditable, type MarkdownEditableController, type MarkdownEditableProps } from '@dxos/react-ui-markdown';
import { type Task } from '@dxos/types';
import { submitOnModEnter } from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';
import { type ComposableProps } from '@dxos/ui-types';

import { translationKey } from '#translations';

import { type TaskCreateHandler, type TaskCreateResult } from './TaskList.tsx';
import { useTaskListContext } from './TaskListContext.ts';
import { TaskRow } from './TaskRow.tsx';
import {
  TaskEstimateControl,
  TaskEstimatePicker,
  TaskPriorityIcon,
  TaskPriorityPicker,
  TaskStatusControl,
} from './TaskRowCells.tsx';

export type TaskListEditorProps = ComposableProps<{
  /** Placeholder for the title field when nothing is selected (the create case); translated by default. */
  placeholder?: string;
  /**
   * Edit a description under the title — the selected task's, or the new task's when creating, so a
   * task can be added with one. Off by default, matching `Root`'s `showDescription`: a markdown
   * field is several rows tall wherever it appears, which a single-line strip has no room for.
   */
  showDescription?: boolean;
  /** Placeholder for the description field; translated by default. */
  descriptionPlaceholder?: string;
  /** Editor extensions for the description field beyond its own — what the host's plugins contribute. */
  descriptionExtensions?: MarkdownEditableProps['extensions'];
  /**
   * Only ever create — the pane ignores the selection instead of editing it. For a host whose detail
   * lives elsewhere (a task plank opened from the row): there, a selected row would otherwise turn
   * the only create affordance into an editor, leaving no way to type a new task.
   */
  createOnly?: boolean;
  /**
   * Take files dropped or pasted on the pane while creating, held as chips until the task is created
   * and then handed to `onTaskCreate` with it. A host sets this only when it can store a file.
   */
  acceptFiles?: boolean;
}>;

/**
 * The detail half of the list: it edits whichever task is selected, and creates one when none is.
 *
 * Editing lives here rather than in the row because a row is 32px of shared subgrid — a field
 * opening inside it moves everything around it. A pane below the list has room to be a field.
 *
 * The fields, and nothing else. A task's questions and its history belong to the surface that has
 * room to answer and to read — the detail article — and under a list they grew the strip by a line
 * per entry, pushing the list itself off the screen.
 */
export const TaskListEditor = composable<HTMLDivElement, TaskListEditorProps>(
  (
    {
      placeholder,
      showDescription = false,
      descriptionPlaceholder,
      descriptionExtensions,
      createOnly = false,
      acceptFiles = false,
      ...props
    },
    forwardedRef,
  ) => {
    const { t } = useTranslation(translationKey);
    const { className, ...rest } = composableProps(props);
    const descriptionRef = useRef<MarkdownEditableController>(null);
    const { tasks, selected, gridTemplateColumns, showEstimates, flush, onTaskCreate, onTaskUpdate, onTaskSelect } =
      useTaskListContext('TaskList.Editor');

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
    const [draft, setDraft] = useState('');
    // Set on the create row before the task exists, and sent with its draft.
    const [draftPriority, setDraftPriority] = useState<Task.Priority>();
    const [draftEstimate, setDraftEstimate] = useState<Task.Estimate>();
    // Held by the pane, not the host: there is no task to attach them to until the create lands.
    const [files, setFiles] = useState<readonly File[]>([]);
    const [dragOver, setDragOver] = useState(false);
    // Counted because `dragleave` fires on every child the pointer crosses, not only on leaving.
    const dragDepth = useRef(0);

    // Bumped after a create, to rebuild the held-open editor empty. The field is uncontrolled while
    // creating (there is no task to read from), so clearing it means remounting it.
    const [createEpoch, setCreateEpoch] = useState(0);
    // Set while a create is in flight, so a second Enter on the still-shown draft does not file it twice.
    const creating = useRef(false);

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
      } else if (title.length > 0 && !creating.current) {
        // Nothing has committed the description yet — it is held open and the reader is in the
        // title — so commit it here, before assembling the draft it belongs to.
        descriptionRef.current?.commit();
        const sentDescription = draftDescription.current;
        const description = sentDescription.trim();
        const sentTitle = draft;
        const sent = files;
        // The draft is cleared only once the host reports the task created: a refused create keeps
        // what was typed, and each field is cleared only if it still holds what was sent, so a create
        // that lands late does not wipe text typed while it was pending.
        const settle = (result: TaskCreateResult | void) => {
          creating.current = false;
          if (result?.error) {
            log.warn('task create failed', { error: result.error });
            return;
          }
          const kept = new Set(result?.rejectedFiles ?? []);
          setFiles((files) => files.filter((file) => !sent.includes(file) || kept.has(file)));
          setDraft((draft) => (draft === sentTitle ? '' : draft));
          setDraftPriority(undefined);
          setDraftEstimate(undefined);
          if (draftDescription.current === sentDescription) {
            draftDescription.current = '';
            setCreateEpoch((epoch) => epoch + 1);
          }
        };
        let result: ReturnType<TaskCreateHandler> | undefined;
        creating.current = true;
        try {
          result = onTaskCreate?.(
            {
              title,
              ...(description.length > 0 && { description }),
              ...(draftPriority && { priority: draftPriority }),
              ...(draftEstimate && { estimate: draftEstimate }),
            },
            sent.length > 0 ? sent : undefined,
          );
        } catch (error) {
          // Keeps the whole draft and every file, as a reported failure does.
          creating.current = false;
          log.catch(error);
          return;
        }
        void Promise.resolve(result).then(settle, (error) => {
          creating.current = false;
          log.catch(error);
        });
      }
    }, [draft, draftPriority, draftEstimate, files, task, current, onTaskCreate, onTaskUpdate]);

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

    // Unlike the Save button, the key is a no-op on an untitled create row: the button is hidden
    // there, and the key must not clear the draft the reader is still writing.
    const handleSubmit = useCallback(() => {
      if (!(task && current) && draft.trim().length === 0) {
        return;
      }
      handleSave();
    }, [task, current, draft, handleSave]);

    // Read through a ref so the extension is built once: a new extensions array rebuilds the editor
    // and drops focus, and `handleSubmit` changes on every keystroke of the title. Synced in an effect
    // so the keymap only ever sees a committed render's handler.
    const submitRef = useDynamicRef(handleSubmit);
    const extensions = useMemo(
      () => [...(descriptionExtensions ?? []), submitOnModEnter({ onSubmit: () => submitRef.current() })],
      [descriptionExtensions],
    );

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
      setFiles([]);
      onTaskSelect?.(undefined);
    }, [task, current, onTaskSelect]);

    // Only while creating: an existing task's attachments are its article's to manage. Captured, so
    // the description editor does not take a dropped file and insert its bytes as text.
    const takesFiles = acceptFiles && !!onTaskCreate && !(task && current);
    const handleFiles = useCallback((added: File[]) => setFiles((files) => [...files, ...added]), []);
    const handleDragEnter = useCallback((event: DragEvent) => {
      if (isFileDrag(event)) {
        dragDepth.current++;
        setDragOver(true);
      }
    }, []);
    const handleDragLeave = useCallback((event: DragEvent) => {
      if (isFileDrag(event) && --dragDepth.current <= 0) {
        dragDepth.current = 0;
        setDragOver(false);
      }
    }, []);
    const handleDragOver = useCallback((event: DragEvent) => {
      if (isFileDrag(event)) {
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = 'copy';
      }
    }, []);
    const handleDrop = useCallback(
      (event: DragEvent) => {
        dragDepth.current = 0;
        setDragOver(false);
        const dropped = Array.from(event.dataTransfer.files);
        if (dropped.length > 0) {
          event.preventDefault();
          event.stopPropagation();
          handleFiles(dropped);
        }
      },
      [handleFiles],
    );
    // Only a paste that is nothing but files: a paste carrying text as well belongs to the field.
    const handlePaste = useCallback(
      (event: ClipboardEvent) => {
        const pasted = Array.from(event.clipboardData.files);
        if (pasted.length > 0 && !event.clipboardData.types.includes('text/plain')) {
          event.preventDefault();
          event.stopPropagation();
          handleFiles(pasted);
        }
      },
      [handleFiles],
    );

    // Nothing to create with and nothing to edit: the pane has no purpose.
    if (!onTaskCreate && !(current && onTaskUpdate)) {
      return null;
    }

    // On the list's template the pane has the rows' columns: the ordinal gutter it leaves empty, the
    // status column takes the icon, and the title column takes the field — which is what puts the
    // caret where the rows' titles start. Off it, the pane keeps a template of its own.
    const hasDescription = !!(showDescription && (current ? onTaskUpdate : onTaskCreate));
    // Valid only with a title: a task cannot be created, or renamed, to nothing.
    const canSave = draft.trim().length > 0;
    // Something to throw away: an edit in progress, or a draft.
    const canCancel = !!current || canSave;
    // Editing, the task's own controls; creating, the same pickers over the draft, so a task can be sized and ranked
    // as it is added.
    const editing = !!(task && current);

    return (
      // The pane's own grid on the list's template, so its cells sit in the rows' columns: the field where the titles
      // are read, the pickers under the rows' estimate and priority.
      <div
        {...rest}
        className={mx(
          // The gap between the lines is the grid's, not a margin on each cell: a margin has to be repeated on every
          // cell that might start a line, and is missed by whichever one is added next.
          'grid w-full min-w-0 shrink-0',
          (hasDescription || (takesFiles && files.length > 0)) && 'gap-y-2',
          // The drop target is the pane itself, marked while files are held over it.
          dragOver && 'ring-2 ring-inset ring-accent-bg',
          // The tree's rows sit inside its content's inset gutter, so the pane insets by the same gap.
          !flush && 'px-(--dx-gap-size)',
          className,
        )}
        // `--dx-col` is reset the way `ScrollArea.Viewport` resets it: inside a host `Column` the variable says "the
        // content track", and `Field.Root` hands it to the field it wraps — which in THIS grid names a different
        // column, and put the title in the controls' track.
        style={{ gridTemplateColumns, '--dx-col': 'auto' } as CSSProperties}
        data-testid='taskList.edit'
        {...(takesFiles && {
          onDragEnterCapture: handleDragEnter,
          onDragLeaveCapture: handleDragLeave,
          onDragOverCapture: handleDragOver,
          onDropCapture: handleDrop,
          onPasteCapture: handlePaste,
        })}
        ref={forwardedRef}
      >
        <TaskRow
          // Editing, the row's own status control — the same glyph and menu, so status is set where the task is read.
          // Creating, there is no task to carry a status yet.
          status={
            editing ? (
              <TaskStatusControl task={task} classNames='self-start' onTaskUpdate={onTaskUpdate} />
            ) : (
              <span className='flex items-center justify-center h-(--dx-control) self-start'>
                <Icon icon='ph--plus--regular' tone='subtle' />
              </span>
            )
          }
          title={
            <Field.Root>
              <Input
                // An input clips its overflow rather than wrapping it, so a long title ends mid-word against the
                // trailing controls with nothing to say it continues; the ellipsis says so.
                classNames='text-ellipsis'
                data-testid='taskList.edit.title'
                // A host may name the row ("Add a step"), but the default is the package's own string: an English
                // literal in the component is a string no translation can reach.
                placeholder={current ? t('task-title.placeholder') : (placeholder ?? t('add-task.placeholder'))}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleTitleKeyDown}
                onBlur={handleTitleBlur}
                // Only when there is something valid to save. `false` rather than nothing, so the field keeps its frame (and
                // its test id) either way.
                end={
                  canSave && (
                    <SystemButton.Save
                      variant='primary'
                      data-testid='taskList.edit.save'
                      // Out of the tab order: Enter in the field saves, and Tab goes on to the description.
                      tabIndex={-1}
                      onClick={handleSave}
                      onMouseDown={(event) => event.preventDefault()}
                    />
                  )
                }
              />
            </Field.Root>
          }
          estimate={
            editing ? (
              <TaskEstimateControl task={task} />
            ) : (
              <TaskEstimatePicker
                estimate={draftEstimate}
                onChange={setDraftEstimate}
                testId='taskList.edit.estimate'
              />
            )
          }
          priority={
            editing ? (
              <TaskPriorityIcon task={task} />
            ) : (
              <TaskPriorityPicker
                priority={draftPriority}
                onChange={setDraftPriority}
                testId='taskList.edit.priority'
              />
            )
          }
          // In the rows' menu column: the way out of the pane, there while it holds something to throw away.
          actions={
            canCancel && (
              <SystemButton.Cancel
                variant='ghost'
                data-testid='taskList.edit.cancel'
                onClick={handleCancel}
                onMouseDown={(event) => event.preventDefault()}
              />
            )
          }
          description={
            hasDescription && (
              // A control frame, as the title's Input is: the well, and the focus ring while the editor has focus.
              <ControlFrame rows={2} data-testid='taskList.edit.description' classNames='min-w-0'>
                {/* A description is markdown, so it is edited as markdown. `editing` is held open — the pane IS the
                    editor, so there is nothing to click into — and the key remounts it per task, since a field held
                    open never re-reads its subject. Creating, the field is uncontrolled: there is no task to read a
                    value from, so it holds the draft itself until the create collects it. */}
                <MarkdownEditable
                  key={current?.id ?? `create-${createEpoch}`}
                  ref={descriptionRef}
                  // A long description scrolls within the field rather than growing the pane past the list it edits
                  // from: eight lines, with the scroller's line-height set to the lines' (CodeMirror's base theme
                  // gives it a smaller one) so `lh` measures a real line.
                  classNames='[&_.cm-scroller]:!leading-normal [&_.cm-scroller]:max-h-[8lh] [&_.cm-scroller]:overflow-y-auto'
                  editing
                  multiline
                  placeholder={descriptionPlaceholder ?? t('task-description.placeholder')}
                  extensions={extensions}
                  // Held open, so it must not pull focus: selecting a row by keyboard would otherwise land the reader
                  // in the description instead of the list.
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
              </ControlFrame>
            )
          }
        />

        {takesFiles &&
          files.length > 0 && (
            // Under the description: what the task will be created with.
            <div
              className={mx(
                'col-start-[title] -col-end-1 flex flex-wrap items-center gap-1 min-w-0',
                hasDescription ? 'row-start-3' : 'row-start-2',
              )}
            >
              {files.map((file, index) => (
                <Tag
                  key={`${file.name}-${index}`}
                  hue='neutral'
                  classNames='inline-flex items-center gap-1'
                  data-testid='taskList.edit.file'
                >
                  <Icon icon='ph--paperclip--regular' size='xs' />
                  <span data-testid='taskList.edit.file.name'>{file.name}</span>
                  <Button
                    variant='ghost'
                    size='sm'
                    iconOnly
                    icon='ph--x--regular'
                    iconSize='xs'
                    label={t('remove-file.label', { name: file.name })}
                    classNames='p-0 min-h-0 h-auto'
                    onClick={() => setFiles((files) => files.filter((_, position) => position !== index))}
                  />
                </Tag>
              ))}
            </div>
          )}
      </div>
    );
  },
);

/** Whether a drag carries files from outside the page, rather than an element dragged within it. */
const isFileDrag = (event: DragEvent): boolean => Array.from(event.dataTransfer.types).includes('Files');

TaskListEditor.displayName = 'TaskList.Editor';
