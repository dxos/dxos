//
// Copyright 2026 DXOS.org
//

import React, { type Ref } from 'react';

import { type Database, type Tag } from '@dxos/echo';
import { IconButton, useTranslation } from '@dxos/react-ui';
import { QueryEditor } from '@dxos/react-ui-components';
import { type EditorController } from '@dxos/react-ui-editor';

import { meta } from '#meta';

export type TaskFilterProps = {
  db?: Database.Database;
  tags: Tag.Map;
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  editorRef?: Ref<EditorController>;
};

/**
 * Filter row for a task list's toolbar — the query editor plus a clear button, as the mailbox
 * toolbar composes `MailboxFilter`. No save action: a task set has no saved views to file one in.
 */
export const TaskFilter = ({ db, tags, value, onChange, onClear, editorRef }: TaskFilterProps) => {
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
      <IconButton
        icon='ph--x--regular'
        iconOnly
        disabled={value.length === 0}
        label={t('filter-clear.label')}
        data-testid='tasks.filter.clear'
        onClick={onClear}
      />
    </>
  );
};

TaskFilter.displayName = 'TaskFilter';
