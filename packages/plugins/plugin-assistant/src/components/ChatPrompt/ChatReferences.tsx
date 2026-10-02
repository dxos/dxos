//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type AiContext } from '@dxos/assistant';
import { type Database, Obj } from '@dxos/echo';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as IconButton from '@dxos/react-ui/IconButton';
import * as ThemeProvider from '@dxos/react-ui/ThemeProvider';
import type * as Util from '@dxos/react-ui/Util';
import { getStyles, mx } from '@dxos/ui-theme';

import { useContextObjects } from '#hooks';
import { meta } from '#meta';

export type ChatReferencesProps = Util.ThemedClassName<{
  context: AiContext.Binder;
  db: Database.Database;
}>;

export const ChatReferences = ({ classNames, context, db }: ChatReferencesProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const { objects, onUpdateObject } = useContextObjects({ db, context });

  return (
    <ul className={mx('flex gap-1', classNames)}>
      {objects.map((obj) => {
        const uri = Obj.getURI(obj);
        const typename = Obj.getTypename(obj);
        const label: ThemeProvider.Label =
          Obj.getLabel(obj) ?? (typename ? ['object-name.placeholder', { ns: typename }] : obj.id);
        const { icon, hue } = Obj.getIcon(obj) ?? { icon: DEFAULT_OBJECT_ICON, hue: undefined };
        const styles = hue ? getStyles(hue) : undefined;
        return (
          <li key={uri.toString()} className='dx-tag py-0 flex items-center gap-1' data-hue='neutral'>
            <Icon.Root icon={icon} size={4} />
            {ThemeProvider.toLocalizedString(label, t)}
            <IconButton.Root
              icon='ph--x--bold'
              iconOnly
              variant='ghost'
              label={t('remove-object.label')}
              classNames='p-0 hover:bg-transparent'
              size={3}
              onClick={() => onUpdateObject?.(uri, false)}
            />
          </li>
        );
      })}
    </ul>
  );
};

// TODO(dmaretskyi): Extract those somewhere else.
const DEFAULT_OBJECT_ICON = 'ph--cube--regular';
