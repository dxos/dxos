//
// Copyright 2025 DXOS.org
//

import React, { type Ref } from 'react';

import { type Database, Filter, Tag } from '@dxos/echo';
import { type EditorController } from '@dxos/react-ui-editor';
import { QueryEditor } from '@dxos/react-ui-query';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';

import { InboxNamespace } from '../../namespace.ts';

export type QueryFilterProps = {
  db?: Database.Database;
  tags: Tag.Map;
  value: string;
  /** Parsed filter; save is enabled only when the text parses. */
  filter?: Filter.Any;
  onChange: (value: string) => void;
  /** The editor's own parse of the text, so the filter is not rebuilt again per keystroke here. */
  onFilterChange: (filter: Filter.Any | undefined) => void;
  onClear: () => void;
  onSave: () => void;
  editorRef: Ref<EditorController>;
  saveButtonRef: Ref<HTMLButtonElement>;
};

/** Filter row slotted into a list article's toolbar (query editor + save/clear actions). */
export const QueryFilter = ({
  db,
  tags,
  value,
  filter,
  onChange,
  onFilterChange,
  onClear,
  onSave,
  editorRef,
  saveButtonRef,
}: QueryFilterProps) => {
  const { t } = Hooks.useTranslation(InboxNamespace.key);
  return (
    <>
      <QueryEditor
        classNames='grow min-w-0 ps-1'
        db={db}
        tags={tags}
        value={value}
        onChange={onChange}
        onFilterChange={({ filter }) => onFilterChange(filter)}
        // The editor's own placeholder already names `#`; the trigger hint would render run into it.
        commandHint={false}
        ref={editorRef}
      />
      <Button.Root
        disabled={!filter}
        icon='ph--folder-plus--regular'
        iconOnly
        label={t('query-filter-save-button.label')}
        onClick={onSave}
        ref={saveButtonRef}
      />
      <Button.Root icon='ph--x--regular' iconOnly label={t('query-filter-clear-button.label')} onClick={onClear} />
    </>
  );
};
