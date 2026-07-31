//
// Copyright 2025 DXOS.org
//

import React, { type Ref } from 'react';

import { type Database, Filter, Tag } from '@dxos/echo';
import { IconButton, useTranslation } from '@dxos/react-ui';
import { QueryEditor } from '@dxos/react-ui-components';
import { type EditorController } from '@dxos/react-ui-editor';

import { meta } from '#meta';

export type MailboxFilterProps = {
  db?: Database.Database;
  tags: Tag.Map;
  value: string;
  /** Parsed filter; save is enabled only when the text parses. */
  filter?: Filter.Any;
  onChange: (value: string) => void;
  onSave: () => void;
  onClear: () => void;
  editorRef: Ref<EditorController>;
  saveButtonRef: Ref<HTMLButtonElement>;
};

/** Filter row slotted into the mailbox toolbar (query editor + save/clear actions). */
export const MailboxFilter = ({
  db,
  tags,
  value,
  filter,
  onChange,
  onSave,
  onClear,
  editorRef,
  saveButtonRef,
}: MailboxFilterProps) => {
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
        disabled={!filter}
        icon='ph--folder-plus--regular'
        iconOnly
        label={t('mailbox-toolbar-save-button.label')}
        onClick={onSave}
        ref={saveButtonRef}
      />
      <IconButton icon='ph--x--regular' iconOnly label={t('mailbox-toolbar-clear-button.label')} onClick={onClear} />
    </>
  );
};
