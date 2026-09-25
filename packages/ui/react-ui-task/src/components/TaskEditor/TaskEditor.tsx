//
// Copyright 2026 DXOS.org
//

import React, {
  type KeyboardEvent,
  type PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';

import { type Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { Field, composable, composableProps, useTranslation } from '@dxos/react-ui';
import { MarkdownEditable, type MarkdownEditableController, type MarkdownEditableProps } from '@dxos/react-ui-markdown';
import { type Task } from '@dxos/types';
import { mx } from '@dxos/ui-theme';
import { type ComposableProps, type ThemedClassName } from '@dxos/ui-types';

import { translationKey } from '#translations';

//
// Root
//

type TaskEditorContextValue = {
  task: Task.Task;
  /** The live view of `task`: a snapshot while one is in hand, which carries the fields read here. */
  current: Task.Task | Obj.Snapshot<Task.Task>;
  onUpdate?: (task: Task.Task, patch: Task.Edit) => void;
  draft: string;
  setDraft: (title: string) => void;
  commitTitle: () => void;
  descriptionRef: React.RefObject<MarkdownEditableController | null>;
};

const TaskEditorContext = createContext<TaskEditorContextValue | undefined>(undefined);

const useTaskEditorContext = (consumer: string): TaskEditorContextValue => {
  const context = useContext(TaskEditorContext);
  if (!context) {
    throw new Error(`${consumer} must be used within TaskEditor.Root`);
  }
  return context;
};

export type TaskEditorRootProps = PropsWithChildren<{
  task: Task.Task;
  /** Absent renders the fields read-only. */
  onUpdate?: (task: Task.Task, patch: Task.Edit) => void;
}>;

/**
 * Holds what editing a known task needs: the title's pending text, the commit that writes it, and a
 * handle on the description's own editor.
 *
 * Headless, because its two hosts place the fields differently — a detail pane stacks them, the
 * list's strip puts the title on its header row beside the status control and the toolbar, with the
 * description on the row below. Sharing the state rather than the markup is what lets both keep
 * their own layout and still commit the same way.
 */
const TaskEditorRoot = ({ task, onUpdate, children }: TaskEditorRootProps) => {
  const descriptionRef = useRef<MarkdownEditableController>(null);
  // Subscribe to the task, so the fields follow a rename made anywhere else.
  const [snapshot] = useObject(task);
  const current = snapshot ?? task;

  const [draft, setDraft] = useState(current?.title ?? '');
  // A new subject replaces the text held rather than carrying the previous one's across. State
  // rather than a ref for the previous id (React's adjust-state-on-prop-change pattern): a render
  // React abandons leaves a ref already mutated, so the retry would skip the reset.
  const [editingId, setEditingId] = useState<string | undefined>(task.id);
  if (editingId !== task.id) {
    setEditingId(task.id);
    setDraft(current?.title ?? '');
  }

  const commitTitle = useCallback(() => {
    const title = draft.trim();
    if (title.length > 0 && title !== current?.title) {
      onUpdate?.(task, { title });
    }
  }, [draft, task, current, onUpdate]);

  return (
    <TaskEditorContext.Provider value={{ task, current, onUpdate, draft, setDraft, commitTitle, descriptionRef }}>
      {children}
    </TaskEditorContext.Provider>
  );
};

TaskEditorRoot.displayName = 'TaskEditor.Root';

//
// Title
//

export type TaskEditorTitleProps = ThemedClassName<{}>;

/** The task's title, committing on blur and on Enter. */
const TaskEditorTitle = ({ classNames }: TaskEditorTitleProps) => {
  const { t } = useTranslation(translationKey);
  const { draft, setDraft, commitTitle, onUpdate } = useTaskEditorContext('TaskEditor.Title');

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        commitTitle();
      }
    },
    [commitTitle],
  );

  return (
    <Field.Root>
      <Field.Input
        variant='subdued'
        // An input clips its overflow rather than wrapping it, so a long title ends mid-word with
        // nothing to say it continues; the ellipsis says so. (Shown while the field is not focused,
        // which is how a pane holds it open.)
        classNames={mx('px-0 text-ellipsis', classNames)}
        data-testid='taskEditor.title'
        placeholder={t('task-title.placeholder')}
        value={draft}
        readOnly={!onUpdate}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commitTitle}
      />
    </Field.Root>
  );
};

TaskEditorTitle.displayName = 'TaskEditor.Title';

//
// Description
//

export type TaskEditorDescriptionProps = ThemedClassName<{
  /** Placeholder for the field; translated by default. */
  placeholder?: string;
  /** Editor extensions beyond the field's own — what the host's plugins contribute. */
  extensions?: MarkdownEditableProps['extensions'];
}>;

/** The task's description, as the markdown it is. */
const TaskEditorDescription = ({ placeholder, extensions, classNames }: TaskEditorDescriptionProps) => {
  const { t } = useTranslation(translationKey);
  const { task, current, onUpdate, descriptionRef } = useTaskEditorContext('TaskEditor.Description');

  return (
    <div data-testid='taskEditor.description' className={mx('flex min-w-0', classNames)}>
      {/* `editing` is held open — the pane IS the editor, so there is nothing to click into — and
          the key remounts it per task, since a field held open never re-reads its subject. */}
      <MarkdownEditable
        key={task.id}
        ref={descriptionRef}
        editing={!!onUpdate}
        multiline
        placeholder={placeholder ?? t('task-description.placeholder')}
        extensions={extensions}
        // Held open, so it must not pull focus: selecting a task by keyboard would otherwise land
        // the reader in the description instead of the list it was selected from.
        autoFocus={false}
        value={current?.description ?? ''}
        onValueChange={(description) => onUpdate?.(task, { description })}
      />
    </div>
  );
};

TaskEditorDescription.displayName = 'TaskEditor.Description';

//
// Editor
//

export type TaskEditorProps = ComposableProps<
  TaskEditorRootProps & {
    /** Edit a description under the title. Off by default: a markdown field is several rows tall. */
    showDescription?: boolean;
  } & Pick<TaskEditorDescriptionProps, 'extensions'>
>;

/**
 * A task's fields, stacked: its title, and its description as markdown.
 *
 * The editing half of `TaskList.Editor` without the list around it — no create case, no selection to
 * read, no Save or Cancel, and no `TaskList.Root` to provide them. A detail surface has a subject
 * and edits it; the strip under a list has neither until a row is selected, which is what all of
 * that machinery is for.
 */
const TaskEditorComposite = composable<HTMLDivElement, TaskEditorProps>(
  ({ task, onUpdate, showDescription = false, extensions, ...props }, forwardedRef) => {
    const { className, ...rest } = composableProps(props);
    return (
      <TaskEditorRoot task={task} onUpdate={onUpdate}>
        <div {...rest} className={mx('flex flex-col w-full min-w-0 gap-2', className)} ref={forwardedRef}>
          <TaskEditorTitle />
          {showDescription && <TaskEditorDescription extensions={extensions} />}
        </div>
      </TaskEditorRoot>
    );
  },
);

TaskEditorComposite.displayName = 'TaskEditor';

export const TaskEditor = Object.assign(TaskEditorComposite, {
  Root: TaskEditorRoot,
  Title: TaskEditorTitle,
  Description: TaskEditorDescription,
});
