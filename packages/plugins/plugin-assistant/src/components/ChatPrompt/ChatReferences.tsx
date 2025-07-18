//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { type ContextBinder } from '@dxos/assistant';
import { type Space } from '@dxos/client/echo';
import { Filter, Obj, Ref } from '@dxos/echo';
import { getLabelForObject } from '@dxos/echo-schema';
import { type ThemedClassName, useAsyncState, useTranslation } from '@dxos/react-ui';
import { TagPicker, type TagPickerItemData, type TagPickerOptions } from '@dxos/react-ui-tag-picker';
import { isNonNullable } from '@dxos/util';

import { meta } from '../../meta';

export type ChatReferencesProps = ThemedClassName<{
  space: Space;
  context: ContextBinder;
  onUpdate?: (ids: string[]) => void;
}>;

export const ChatReferences = ({ classNames, space, context, onUpdate }: ChatReferencesProps) => {
  const { t } = useTranslation(meta.id);

  const [items] = useAsyncState<TagPickerItemData[]>(async () => {
    const objects = await Ref.Array.loadAll(context.objects.value ?? []);
    return objects.filter(isNonNullable).map((obj) => ({ id: obj.id, label: getLabelForObject(obj) ?? obj.id }));
  }, [context]);

  const handleSearch = useCallback<NonNullable<TagPickerOptions['onSearch']>>(
    (text, ids) => {
      // TODO(burdon): Query by object label.
      const objects = space.db.query(Filter.everything()).runSync();
      return objects
        .map(({ object }) => {
          return { id: object.id, label: Obj.getLabel(object) ?? '' };
        })
        .filter(({ id, label }) => !ids.includes(id) && label.toLocaleLowerCase().includes(text.toLocaleLowerCase()));
    },
    [space],
  );

  return (
    <TagPicker
      classNames={classNames}
      mode='multi-select'
      placeholder={t('context objects placeholder')}
      items={items}
      onSearch={handleSearch}
      onUpdate={onUpdate}
    />
  );
};
