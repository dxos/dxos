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
  Field,
  Icon,
  IconButton,
  Tag,
  Toolbar,
  composable,
  composableProps,
  useDynamicRef,
  useTranslation,
} from '@dxos/react-ui';
import { MarkdownEditable, type MarkdownEditableController, type MarkdownEditableProps } from '@dxos/react-ui-markdown';
import { submitOnModEnter } from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';
import { type ComposableProps } from '@dxos/ui-types';

import { translationKey } from '#translations';

import { type TaskCreateHandler, type TaskCreateResult } from './TaskList.tsx';
import { useTaskListContext } from './TaskListContext.ts';
import { TaskEstimateControl, TaskPriorityIcon, TaskStatusControl } from './TaskRowCells.tsx';

//
// Create — the add row; renders nothing unless the root supplies `onTaskCreate`.
//

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
  /**
   * Render the task's own controls — the leading status glyph and the trailing estimate and
   * priority. Off for a host that carries them in its own toolbar, where the pane IS the task
   * rather than one row of a list; the pane then has no icon column, so its fields start where the
   * rest of the host's content does.
   */
  showControls?: boolean;
  /**
   * Take files dropped or pasted on the pane while creating, held as chips until the task is created
   * and then handed to `onTaskCreate` with it. A host sets this only when it can store a file.
   */
  acceptFiles?: boolean;
}>;

/** Whether a drag carries files from outside the page, rather than an element dragged within it. */
const isFileDrag = (event: DragEvent): boolean => Array.from(event.dataTransfer.types).includes('Files');

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
      grid,
      createOnly = false,
      showControls = true,
      acceptFiles = false,
      ...props
    },
    forwardedRef,
  ) => {
    const { t } = useTranslation(translationKey);
    const { className, ...rest } = composableProps(props);
    const descriptionRef = useRef<MarkdownEditableController>(null);
    const { tasks, selected, gridTemplateColumns, showEstimates, onTaskCreate, onTaskUpdate, onTaskSelect } =
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
          if (draftDescription.current === sentDescription) {
            draftDescription.current = '';
            setCreateEpoch((epoch) => epoch + 1);
          }
        };
        let result: ReturnType<TaskCreateHandler> | undefined;
        creating.current = true;
        try {
          result = onTaskCreate?.(
            { title, ...(description.length > 0 && { description }) },
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
    }, [draft, files, task, current, onTaskCreate, onTaskUpdate]);

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
    return (
      // One grid, not a row of grids: the title and the description line up column for column, and
      // the toolbar can sit on the title line while coming LAST in the DOM — so Tab runs title →
      // description → buttons rather than stopping at a button on the way to the text.
      <div
        {...rest}
        // Two rows, placed explicitly rather than by flow: header (icon, title, toolbar) and
        // description. Auto-placement drops a cell into whatever track is free, which put the
        // description in the icon column whenever the toolbar was absent.
        className={mx(
          // The gap between the rows is the grid's, not a margin on each cell: a margin has to be
          // repeated on every cell that might start a row, and is missed by whichever one is added next.
          'grid w-full min-w-0 shrink-0 grid-rows-[auto_auto] gap-y-2',
          // The drop target is the pane itself, marked while files are held over it.
          dragOver && 'ring-2 ring-inset ring-accent-bg',
          // No leading control means no icon track: the title then starts where the host's own
          // content does, rather than 2rem inside it with nothing in the gap.
          !grid && (showControls ? 'grid-cols-[2rem_1fr_min-content]' : 'grid-cols-[1fr_min-content]'),
          className,
        )}
        // On the list's own template the pane's cells name their tracks, so the icon sits under the
        // rows' status controls and the field under their titles whatever the list's options are;
        // the toggle and gutter tracks stay empty.
        //
        // `--dx-col` is reset the way `ScrollArea.Viewport` resets it: inside a host `Column` the
        // variable says "the content track", and `Field.Root` hands it to the field it wraps — which
        // in THIS grid names a different column, and put the title in the controls' track.
        style={{ ...(grid ? { gridTemplateColumns } : {}), '--dx-col': 'auto' } as CSSProperties}
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
        {/* Placed explicitly: with a gutter the pane leaves that track empty, and implicit placement
            would drop the icon into it. Editing, the cell is the row's own status control — the
            same glyph, and the same menu, so status is set where the task is read rather than only
            from the row behind the pane. Creating, there is no task to carry a status yet. */}
        {showControls &&
          (task && current ? (
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
          ))}

        <Field.Root>
          <Field.Input
            variant='subdued'
            // An input clips its overflow rather than wrapping it, so a long title ends mid-word
            // against the trailing controls with nothing to say it continues; the ellipsis says so.
            // (Shown while the field is not focused, which is how a pane holds it open.)
            classNames={mx(
              'px-0 text-ellipsis',
              grid ? 'col-start-[title] -col-end-2' : showControls ? 'col-start-2' : 'col-start-1',
            )}
            data-testid='taskList.edit.title'
            // A host may name the row ("Add a step"), but the default is the package's own string:
            // an English literal in the component is a string no translation can reach.
            placeholder={current ? t('task-title.placeholder') : (placeholder ?? t('add-task.placeholder'))}
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
            className={mx(
              'flex min-w-0 row-start-2 -col-end-1',
              grid ? 'col-start-[title]' : showControls ? 'col-start-2' : 'col-start-1',
            )}
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
              placeholder={descriptionPlaceholder ?? t('task-description.placeholder')}
              extensions={extensions}
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

        {takesFiles &&
          files.length > 0 && (
            // The third row, under the description: what the task will be created with.
            <div
              className={mx(
                'flex flex-wrap items-center gap-1 min-w-0 row-start-3 -col-end-1',
                grid ? 'col-start-[title]' : showControls ? 'col-start-2' : 'col-start-1',
              )}
            >
              {files.map((file, index) => (
                <Tag
                  key={`${file.name}-${index}`}
                  hue='neutral'
                  classNames='inline-flex items-center gap-1'
                  data-testid='taskList.edit.file'
                >
                  <Icon icon='ph--paperclip--regular' size={3} />
                  <span data-testid='taskList.edit.file.name'>{file.name}</span>
                  <IconButton
                    variant='ghost'
                    density='sm'
                    iconOnly
                    icon='ph--x--regular'
                    size={3}
                    label={t('remove-file.label', { name: file.name })}
                    classNames='p-0 min-h-0 h-auto'
                    onClick={() => setFiles((files) => files.filter((_, position) => position !== index))}
                  />
                </Tag>
              ))}
            </div>
          )}

        {/* Save and Cancel belong to creating: the held-open description has no blur to commit it, so
            the add row needs both. Editing, the fields commit themselves — and a host carrying the
            task's controls in its own toolbar (`showControls` off) has no use for a second bar of
            chrome floating over the title. */}
        {(showControls ? current || draft.trim().length > 0 : !current && draft.trim().length > 0) && (
          <Toolbar.Root
            density='sm'
            classNames={mx(
              'row-start-1 justify-end p-0 bg-transparent',
              // `-2` is the icon column once the pane has only two tracks, which would put the
              // controls where the title goes and squeeze the field into the min-content track.
              showControls ? 'col-start-[-2]' : 'col-start-2',
            )}
          >
            {/* Only when editing an existing task: the create row has nothing to set an estimate or
                priority on until it is saved. */}
            {showControls && task && showEstimates && <TaskEstimateControl task={task} />}
            {showControls && task && <TaskPriorityIcon task={task} />}
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

TaskListEditor.displayName = 'TaskList.Editor';
