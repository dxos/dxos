//
// Copyright 2026 DXOS.org
//

import React, { type Ref } from 'react';

import { type Database, type Tag } from '@dxos/echo';
import { IconButton, useTranslation } from '@dxos/react-ui';
import { QueryEditor } from '@dxos/react-ui-components';
import { type EditorController } from '@dxos/react-ui-editor';
import { type Task } from '@dxos/types';

import { meta } from '#meta';

import { ALL_STATUSES, TaskStatusFilter } from './TaskStatusFilter.tsx';

export type TaskFilterProps = {
  db?: Database.Database;
  tags: Tag.Map;
  value: string;
  /** The statuses the list shows; every status is the unfiltered state. */
  statuses: readonly Task.Status[];
  onChange: (value: string) => void;
  onStatusesChange: (statuses: readonly Task.Status[]) => void;
  onClear: () => void;
  editorRef?: Ref<EditorController>;
};

/**
 * Filter row for a task list's toolbar — the query editor, the status selector and a clear button,
 * as the mailbox toolbar composes `MailboxFilter`. No save action: a task set has no saved views to
 * file one in.
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
      <IconButton
        icon='ph--x--regular'
        iconOnly
        // Live while either term is set, since clearing resets both: a reader who only hid a status
        // would otherwise have no way to undo the one filter they had applied.
        disabled={value.length === 0 && statuses.length === ALL_STATUSES.length}
        label={t('filter-clear.label')}
        data-testid='tasks.filter.clear'
        onClick={onClear}
      />
    </>
  );
};

TaskFilter.displayName = 'TaskFilter';
