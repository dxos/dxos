//
// Copyright 2026 DXOS.org
//

import React, {
  type ClipboardEvent,
  type DragEvent,
  type KeyboardEvent,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Filter, Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { log } from '@dxos/log';
import { MarkdownEditable, type MarkdownEditableController, type MarkdownEditableProps } from '@dxos/react-ui-markdown';
import * as Button from '@dxos/react-ui/Button';
import * as Field from '@dxos/react-ui/Field';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Input from '@dxos/react-ui/Input';
import * as Layout from '@dxos/react-ui/Layout';
import * as SystemButton from '@dxos/react-ui/SystemButton';
import * as Tag from '@dxos/react-ui/Tag';
import * as Util from '@dxos/react-ui/Util';
import { Person, type Task } from '@dxos/types';
import { submitOnModEnter } from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';
import { type ComposableProps } from '@dxos/ui-types';

import { translationKey } from '#translations';

import { type TaskCreateHandler, type TaskCreateResult } from './TaskList.tsx';
import { useTaskListContext } from './TaskListContext.ts';
import { TaskPropertyPills, type TaskPropertyValues } from './TaskPropertyPills.tsx';

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
export const TaskListEditor = Util.composable<HTMLDivElement, TaskListEditorProps>(
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
    const { t } = Hooks.useTranslation(translationKey);
    const { className, ...rest } = Util.composableProps(props);
    const descriptionRef = useRef<MarkdownEditableController>(null);
    const { tasks, selected, members, flush, onTaskCreate, onTaskUpdate, onTaskSelect } =
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
    // Set on the create row's pills before the task exists, and sent with its draft.
    const [draftProperties, setDraftProperties] = useState<TaskPropertyValues>({});
    // Bumped when the draft's properties are cleared, to rebuild the pills' form, which holds an edit until its values
    // catch up and so would keep showing a value cleared under it.
    const [propertiesEpoch, setPropertiesEpoch] = useState(0);
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
          setDraftProperties({});
          setPropertiesEpoch((epoch) => epoch + 1);
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
              ...draftProperties,
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
    }, [draft, draftProperties, files, task, current, onTaskCreate, onTaskUpdate]);

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
    const submitRef = Hooks.useDynamicRef(handleSubmit);
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
      setDraftProperties({});
      setPropertiesEpoch((epoch) => epoch + 1);
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

    // A draft's cleared field is dropped rather than held as `null`, since a draft has nothing to clear.
    const handlePropertyChange = useCallback(
      (patch: Task.Edit) => {
        if (task && current) {
          onTaskUpdate?.(task, patch);
        } else {
          setDraftProperties((properties) => {
            const next: Record<string, unknown> = { ...properties, ...patch };
            for (const key of Object.keys(patch)) {
              if (next[key] == null) {
                delete next[key];
              }
            }
            return next as TaskPropertyValues;
          });
        }
      },
      [task, current, onTaskUpdate],
    );

    // The space's contacts, for the assignee picker: read off the task being edited, or any task in the list while
    // creating, since a draft has no database of its own.
    const people = useCallback(() => {
      const subject = task ?? tasks[0];
      const db = subject && Obj.getDatabase(subject);
      return db?.query(Filter.type(Person.Person)).runSync() ?? [];
    }, [task, tasks]);

    // Nothing to create with and nothing to edit: the pane has no purpose.
    if (!onTaskCreate && !(current && onTaskUpdate)) {
      return null;
    }

    const hasDescription = !!(showDescription && (current ? onTaskUpdate : onTaskCreate));
    // Valid only with a title: a task cannot be created, or renamed, to nothing.
    const canSave = draft.trim().length > 0;
    // Something to throw away: an edit in progress, or a draft.
    const canCancel = !!current || canSave;
    const values: TaskPropertyValues = current
      ? {
          status: current.status ?? undefined,
          priority: current.priority ?? undefined,
          estimate: current.estimate ?? undefined,
          assignee: current.assignee ?? undefined,
        }
      : draftProperties;

    return (
      // A form of its own rather than a row on the list's columns: the title and description take the full width, and
      // the task's other fields sit under them as pills, so they can all be set as the task is added.
      <div
        {...rest}
        className={mx(
          'flex flex-col gap-2 w-full min-w-0 shrink-0',
          // The drop target is the pane itself, marked while files are held over it.
          dragOver && 'ring-2 ring-inset ring-accent-bg',
          // The tree's rows pad their ends by the same gap, so the pane's fields start where the rows' cells do.
          !flush && 'px-(--dx-gap-size)',
          className,
        )}
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
        <Field.Root classNames='min-w-0'>
          <Input.Root
            // An input clips its overflow rather than wrapping it, so a long title ends mid-word against the save button
            // with nothing to say it continues; the ellipsis says so.
            classNames='grow text-ellipsis'
            data-testid='taskList.edit.title'
            // A host may name the row ("Add a step"), but the default is the package's own string: an English literal
            // in the component is a string no translation can reach.
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
        {hasDescription && (
          // A control frame, as the title's Input is: the well, and the focus ring while the editor has focus.
          <Input.Frame rows={2} data-testid='taskList.edit.description' classNames='min-w-0'>
            {/* A description is markdown, so it is edited as markdown. `editing` is held open — the pane IS the editor,
                so there is nothing to click into — and the key remounts it per task, since a field held open never
                re-reads its subject. Creating, the field is uncontrolled: there is no task to read a value from, so it
                holds the draft itself until the create collects it. */}
            <MarkdownEditable
              key={current?.id ?? `create-${createEpoch}`}
              ref={descriptionRef}
              // A long description scrolls within the field rather than growing the pane past the list it edits from:
              // eight lines, with the scroller's line-height set to the lines' (CodeMirror's base theme gives it a
              // smaller one) so `lh` measures a real line.
              classNames='[&_.cm-scroller]:!leading-normal [&_.cm-scroller]:max-h-[8lh] [&_.cm-scroller]:overflow-y-auto'
              editing
              multiline
              placeholder={descriptionPlaceholder ?? t('task-description.placeholder')}
              extensions={extensions}
              // Held open, so it must not pull focus: selecting a row by keyboard would otherwise land the reader in
              // the description instead of the list.
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
          </Input.Frame>
        )}

        {takesFiles &&
          files.length > 0 && (
            // Under the description: what the task will be created with.
            <div className='flex flex-wrap items-center gap-1 min-w-0'>
              {files.map((file, index) => (
                <Tag.Tag
                  key={`${file.name}-${index}`}
                  hue='neutral'
                  classNames='inline-flex items-center gap-1'
                  data-testid='taskList.edit.file'
                >
                  <Icon.Icon icon='ph--paperclip--regular' size='xs' />
                  <span data-testid='taskList.edit.file.name'>{file.name}</span>
                  <Button.Root
                    variant='ghost'
                    size='sm'
                    iconOnly
                    icon='ph--x--regular'
                    iconSize='xs'
                    label={t('remove-file.label', { name: file.name })}
                    classNames='p-0 min-h-0 h-auto'
                    onClick={() => setFiles((files) => files.filter((_, position) => position !== index))}
                  />
                </Tag.Tag>
              ))}
            </div>
          )}

        <Layout.Flex wrap align='center' gap='xs' classNames='min-w-0' data-testid='taskList.edit.properties'>
          <TaskPropertyPills
            key={current?.id ?? `create-${propertiesEpoch}`}
            values={values}
            members={members}
            people={people}
            onChange={handlePropertyChange}
          />
          {canCancel && (
            // At the end of the pills: the way out of the pane, there while it holds something to throw away.
            <SystemButton.Cancel
              variant='ghost'
              classNames='ms-auto'
              data-testid='taskList.edit.cancel'
              onClick={handleCancel}
              onMouseDown={(event) => event.preventDefault()}
            />
          )}
        </Layout.Flex>
      </div>
    );
  },
);

/** Whether a drag carries files from outside the page, rather than an element dragged within it. */
const isFileDrag = (event: DragEvent): boolean => Array.from(event.dataTransfer.types).includes('Files');

TaskListEditor.displayName = 'TaskList.Editor';
