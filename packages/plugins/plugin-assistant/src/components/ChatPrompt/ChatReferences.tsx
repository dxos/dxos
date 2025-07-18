//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { type ContextBinder } from '@dxos/assistant';
import { type Space } from '@dxos/client/echo';
import { type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { TagPicker, type TagPickerOptions } from '@dxos/react-ui-tag-picker';

import { meta } from '../../meta';

export type ChatReferencesProps = ThemedClassName<{
  space?: Space;
  context?: ContextBinder;
}>;

export const ChatReferences = ({ classNames }: ChatReferencesProps) => {
  const { t } = useTranslation(meta.id);

  // TODO(burdon): Query space.
  const handleSearch = useCallback<NonNullable<TagPickerOptions['onSearch']>>((text, ids) => {
    console.log(text, ids);
    return [];
  }, []);

  // TODO(burdon): Update context (add and remove?)
  const handleUpdate = useCallback<NonNullable<TagPickerOptions['onUpdate']>>((ids) => {
    console.log(ids);
  }, []);

  return (
    <TagPicker
      classNames={classNames}
      mode='multi-select'
      placeholder={t('context objects placeholder')}
      items={[]}
      onSearch={handleSearch}
      onUpdate={handleUpdate}
    />
  );
};
