//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type AiContextBinder } from '@dxos/assistant';
import { Obj } from '@dxos/echo';
import { type Space } from '@dxos/react-client/echo';
import { IconButton, type Label, type ThemedClassName, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { useContextObjects } from '../../hooks';
import { meta } from '../../meta';

export type ChatReferencesProps = ThemedClassName<{
  context: AiContextBinder;
  space: Space;
}>;

export const ChatReferences = ({ classNames, context, space }: ChatReferencesProps) => {
  const { t } = useTranslation(meta.id);
  const { objects, onUpdateObject } = useContextObjects({ space, context });

  return (
    <ul className={mx('flex flex-wrap', classNames)}>
      {objects.map((obj) => {
        const dxn = Obj.getDXN(obj);
        const typename = Obj.getTypename(obj);
        const label: Label = Obj.getLabel(obj) ?? (typename ? ['object name placeholder', { ns: typename }] : obj.id);
        return (
          <li key={dxn.toString()} className='dx-tag plb-0 pis-2 flex items-center' data-hue='neutral'>
            {toLocalizedString(label, t)}
            <IconButton
              iconOnly
              variant='ghost'
              label={t('remove object in context label')}
              classNames='p-0 hover:bg-transparent'
              size={3}
              icon='ph--x--bold'
              onClick={() => onUpdateObject?.(dxn, false)}
            />
          </li>
        );
      })}
    </ul>
  );
};
