//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, type Ref } from 'react';

import { type Database, type Tag } from '@dxos/echo';
import { IconButton, useTranslation } from '@dxos/react-ui';
import { QueryEditor } from '@dxos/react-ui-components';
import { type EditorController } from '@dxos/react-ui-editor';
import { type Task } from '@dxos/types';

import { meta } from '#meta';

import { TaskStatusFilter } from './TaskStatusFilter.tsx';

export type TaskFilterProps = PropsWithChildren<{
  db?: Database.Database;
  tags: Tag.Map;
  value: string;
  /** The statuses `value`'s status terms keep; every status is the unfiltered state. */
  statuses: readonly Task.Status[];
  onChange: (value: string) => void;
  onStatusesChange: (statuses: readonly Task.Status[]) => void;
  onClear: () => void;
  editorRef?: Ref<EditorController>;
}>;

/**
 * Filter row for a task list's toolbar — the query editor, the status selector over the same query,
 * and a clear button, as the mailbox toolbar composes `MailboxFilter`. No save action: a task set has
 * no saved views to file one in.
 */
export const TaskFilter = ({
  db,
  tags,
  value,
  statuses,
  onChange,
  onStatusesChange,
  onClear,
  editorRef,
  children,
}: TaskFilterProps) => {
  const { t } = useTranslation(meta.profile.key);
  return (
    <>
      <QueryEditor
        classNames='grow min-w-0 ps-1'
        db={db}
        tags={tags}
        value={value}
        onChange={onChange}
        ref={editorRef}
      />
      <TaskStatusFilter value={statuses} onChange={onStatusesChange} />
      {/* The rest of the toolbar's view controls (order, grouping), between the filter and its clear. */}
      {children}
      <IconButton
        icon='ph--x--regular'
        iconOnly
        // The status choice is written into the text, so an empty text is the unfiltered list.
        disabled={value.trim().length === 0}
        label={t('filter-clear.label')}
        data-testid='tasks.filter.clear'
        onClick={onClear}
      />
    </>
  );
};

TaskFilter.displayName = 'TaskFilter';
