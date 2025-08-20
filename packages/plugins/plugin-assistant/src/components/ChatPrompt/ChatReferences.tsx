//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type AiContextBinder } from '@dxos/assistant';
import { Obj } from '@dxos/echo';
import { type Space } from '@dxos/react-client/echo';
import { IconButton, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { isNonNullable } from '@dxos/util';

import { useActiveReferences, useReferencesHandlers } from '../../hooks';
import { meta } from '../../meta';

export type ChatReferencesProps = ThemedClassName<{
  context: AiContextBinder;
  space: Space;
}>;

export const ChatReferences = ({ classNames, context, space }: ChatReferencesProps) => {
  const { t } = useTranslation(meta.id);
  const activeReferences = useActiveReferences({ context });
  const { onUpdateReference } = useReferencesHandlers({ context, space });

  return (
    <ul className={mx('flex flex-wrap', classNames)}>
      {activeReferences
        .values()
        .filter(isNonNullable)
        .map((obj) => ({ id: Obj.getDXN(obj).toString(), label: Obj.getLabel(obj) ?? Obj.getTypename(obj) ?? obj.id }))
        .map(({ id, label }) => {
          return (
            <li key={id} className='dx-tag plb-0 pis-2 flex items-center' data-hue='neutral'>
              {label}
              <IconButton
                iconOnly
                variant='ghost'
                label={t('remove object in context label')}
                classNames='p-0 hover:bg-transparent'
                size={3}
                icon='ph--x--bold'
                onClick={() => onUpdateReference?.(id, false)}
              />
            </li>
          );
        })}
    </ul>
  );
};
