//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type AiContextBinder } from '@dxos/assistant';
import { Obj, Ref } from '@dxos/echo';
import { IconButton, type ThemedClassName, useAsyncState, useTranslation } from '@dxos/react-ui';
import { type TagPickerItemData } from '@dxos/react-ui-tag-picker';
import { mx } from '@dxos/react-ui-theme';
import { isNonNullable } from '@dxos/util';

import { meta } from '../../meta';

export type ChatReferencesProps = ThemedClassName<{
  context: AiContextBinder;
  onReferenceChange?: (dxn: string, checked: boolean) => void;
}>;

export const ChatReferences = ({ classNames, context, onReferenceChange }: ChatReferencesProps) => {
  const { t } = useTranslation(meta.id);
  const [items] = useAsyncState<TagPickerItemData[]>(async () => {
    const objects = await Ref.Array.loadAll(context.objects.value ?? []);
    return objects
      .filter(isNonNullable)
      .map((obj) => ({ id: Obj.getDXN(obj).toString(), label: Obj.getLabel(obj) ?? Obj.getTypename(obj) ?? obj.id }));
  }, [context.objects]);

  return (
    <ul className={mx('flex flex-wrap', classNames)}>
      {items?.map((item) => {
        return (
          <li key={item.id} className='dx-tag plb-0 pis-2 flex items-center' data-hue='neutral'>
            {item.label}
            <IconButton
              iconOnly
              variant='ghost'
              label={t('remove object in context label')}
              classNames='p-0 hover:bg-transparent'
              size={3}
              icon='ph--x--bold'
              onClick={() => onReferenceChange?.(item.id, false)}
            />
          </li>
        );
      })}
    </ul>
  );
};
