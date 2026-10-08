//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type AiContext } from '@dxos/assistant';
import { type Database, Obj } from '@dxos/echo';
import { useLabel } from '@dxos/echo-react';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Theme from '@dxos/react-ui/Theme';
import type * as Util from '@dxos/react-ui/Util';
import { mx } from '@dxos/ui-theme';

import { type UseContextObjects, useContextObjects } from '#hooks';
import { meta } from '#meta';

export type ChatReferencesProps = Util.ThemedClassName<{
  context: AiContext.Binder;
  db: Database.Database;
}>;

export const ChatReferences = ({ classNames, context, db }: ChatReferencesProps) => {
  const { objects, onUpdateObject } = useContextObjects({ db, context });

  return (
    <ul className={mx('flex gap-1', classNames)}>
      {objects.map((obj) => (
        <ChatReference key={Obj.getURI(obj).toString()} object={obj} onUpdateObject={onUpdateObject} />
      ))}
    </ul>
  );
};

type ChatReferenceProps = {
  object: Obj.Unknown;
  onUpdateObject: UseContextObjects['onUpdateObject'];
};

const ChatReference = ({ object, onUpdateObject }: ChatReferenceProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const uri = Obj.getURI(object);
  const typename = Obj.getTypename(object);
  const objectLabel = useLabel(object);
  const label: Theme.Label = objectLabel ?? (typename ? ['object-name.placeholder', { ns: typename }] : object.id);
  const { icon } = Obj.getIcon(object) ?? { icon: DEFAULT_OBJECT_ICON };

  return (
    <li className='dx-tag dx-tag-inline py-0 flex items-center gap-1' data-hue='neutral'>
      <Icon.Icon icon={icon} size='md' />
      {Theme.toLocalizedString(label, t)}
      <Button.Root
        icon='ph--x--bold'
        iconOnly
        variant='ghost'
        label={t('remove-object.label')}
        classNames='p-0 hover:bg-transparent'
        iconSize='xs'
        onClick={() => onUpdateObject(uri, false)}
      />
    </li>
  );
};

// TODO(dmaretskyi): Extract those somewhere else.
const DEFAULT_OBJECT_ICON = 'ph--cube--regular';
