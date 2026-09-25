//
// Copyright 2026 DXOS.org
//

import React, { type KeyboardEvent, useCallback, useRef, useState } from 'react';

import { useObject } from '@dxos/echo-react';
import { Field, composable, composableProps, useTranslation } from '@dxos/react-ui';
import { MarkdownEditable, type MarkdownEditableController, type MarkdownEditableProps } from '@dxos/react-ui-markdown';
import { type Task } from '@dxos/types';
import { mx } from '@dxos/ui-theme';
import { type ComposableProps } from '@dxos/ui-types';

import { translationKey } from '#translations';

export type TaskEditorProps = ComposableProps<{
  task: Task.Task;
  /** Absent renders the fields read-only. */
  onUpdate?: (task: Task.Task, patch: Task.Edit) => void;
  /** Edit a description under the title. Off by default: a markdown field is several rows tall. */
  showDescription?: boolean;
  /** Placeholder for the description field; translated by default. */
  descriptionPlaceholder?: string;
  /** Editor extensions for the description beyond its own — what the host's plugins contribute. */
  descriptionExtensions?: MarkdownEditableProps['extensions'];
}>;

/**
 * A task's own fields: its title, and its description as markdown.
 *
 * The editing half of `TaskList.Editor` without the list around it — no create case, no selection to
 * read, no Save or Cancel, and no `TaskList.Root` to provide them. A detail surface has a subject
 * and edits it; the strip under a list has neither until a row is selected, which is what all of
 * that machinery is for.
 *
 * Both fields commit themselves — the title on blur and on Enter, the description through its own
 * editor — so a host wires one callback and nothing else.
 */
export const TaskEditor = composable<HTMLDivElement, TaskEditorProps>(
  (
    { task, onUpdate, showDescription = false, descriptionPlaceholder, descriptionExtensions, ...props },
    forwardedRef,
  ) => {
    const { t } = useTranslation(translationKey);
    const { className, ...rest } = composableProps(props);
    const descriptionRef = useRef<MarkdownEditableController>(null);

    // Subscribe to the task, so the fields follow a rename made anywhere else.
    const [snapshot] = useObject(task);
    const current = snapshot ?? task;

    const [draft, setDraft] = useState(current?.title ?? '');
    // The editor is a view onto whichever task it is given, so a new subject replaces the text it
    // holds rather than carrying the previous one's across. State rather than a ref for the previous
    // id (React's adjust-state-on-prop-change pattern): a render React abandons leaves a ref already
    // mutated, so the retry would skip the reset and keep the previous task's text.
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

    const handleKeyDown = useCallback(
      (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
          commitTitle();
        }
      },
      [commitTitle],
    );

    return (
      <div
        {...rest}
        data-testid='taskEditor'
        className={mx('flex flex-col w-full min-w-0 gap-2', className)}
        ref={forwardedRef}
      >
        <Field.Root>
          <Field.Input
            variant='subdued'
            // An input clips its overflow rather than wrapping it, so a long title ends mid-word with
            // nothing to say it continues; the ellipsis says so. (Shown while the field is not
            // focused, which is how a pane holds it open.)
            classNames='px-0 text-ellipsis'
            data-testid='taskEditor.title'
            placeholder={t('task-title.placeholder')}
            value={draft}
            readOnly={!onUpdate}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={commitTitle}
          />
        </Field.Root>

        {showDescription && (
          <div data-testid='taskEditor.description' className='flex min-w-0'>
            {/* A description is markdown, so it is edited as markdown. `editing` is held open — the
                pane IS the editor, so there is nothing to click into — and the key remounts it per
                task, since a field held open never re-reads its subject. */}
            <MarkdownEditable
              key={task.id}
              ref={descriptionRef}
              editing={!!onUpdate}
              multiline
              placeholder={descriptionPlaceholder ?? t('task-description.placeholder')}
              extensions={descriptionExtensions}
              // Held open, so it must not pull focus: selecting a task by keyboard would otherwise
              // land the reader in the description instead of the list it was selected from.
              autoFocus={false}
              value={current?.description ?? ''}
              onValueChange={(description) => onUpdate?.(task, { description })}
            />
          </div>
        )}
      </div>
    );
  },
);

TaskEditor.displayName = 'TaskEditor';
