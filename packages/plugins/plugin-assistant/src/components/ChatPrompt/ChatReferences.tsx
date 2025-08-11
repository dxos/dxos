//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { type AiContextBinder } from '@dxos/assistant';
import { type Space } from '@dxos/client/echo';
import { Filter, Obj, Ref } from '@dxos/echo';
import { type ThemedClassName, useAsyncState, useTranslation } from '@dxos/react-ui';
import { TagPicker, type TagPickerItemData, type TagPickerOptions } from '@dxos/react-ui-tag-picker';
import { mx } from '@dxos/react-ui-theme';
import { isNonNullable } from '@dxos/util';

import { meta } from '../../meta';

export type ChatReferencesProps = ThemedClassName<{
  space: Space;
  context: AiContextBinder;
  onUpdate?: (dxns: string[]) => void;
}>;

export const ChatReferences = ({ classNames, space, context, onUpdate }: ChatReferencesProps) => {
  const { t } = useTranslation(meta.id);

  const [items] = useAsyncState<TagPickerItemData[]>(async () => {
    const objects = await Ref.Array.loadAll(context.objects.value ?? []);
    return objects
      .filter(isNonNullable)
      .map((obj) => ({ id: Obj.getDXN(obj).toString(), label: Obj.getLabel(obj) ?? Obj.getTypename(obj) ?? obj.id }));
  }, [context]);

  const handleSearch = useCallback<NonNullable<TagPickerOptions['onSearch']>>(
    (text, dxns) => {
      // TODO(burdon): Filter by Item tag (e.g., exclude "contacts") and Query by object label.
      // TODO(burdon): Change to Filter.text().
      const objects = space.db.query(Filter.everything()).runSync();
      return objects
        .map(({ object }) => ({ id: Obj.getDXN(object).toString(), label: Obj.getLabel(object) ?? '' }))
        .filter(({ id, label }) => !dxns.includes(id) && label.toLocaleLowerCase().includes(text.toLocaleLowerCase()));
    },
    [space],
  );

  return (
    <TagPicker
      classNames={mx('h-[1.75rem] text-sm', classNames)}
      mode='multi-select'
      placeholder={t('context objects placeholder')}
      items={items}
      onSearch={handleSearch}
      onUpdate={onUpdate}
    />
  );
};
