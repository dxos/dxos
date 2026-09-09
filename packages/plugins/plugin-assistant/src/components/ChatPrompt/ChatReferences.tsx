//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type AiContext } from '@dxos/assistant';
import { type Database, Obj } from '@dxos/echo';
import { useObjectValue } from '@dxos/echo-react';
import { Icon, IconButton, type Label, type ThemedClassName, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { type UseContextObjects, useContextObjects } from '#hooks';
import { meta } from '#meta';

export type ChatReferencesProps = ThemedClassName<{
  context: AiContext.Binder;
  db: Database.Database;
}>;

export const ChatReferences = ({ classNames, context, db }: ChatReferencesProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { objects, onUpdateObject } = useContextObjects({ db, context });

  return (
    <ul className={mx('flex', classNames)}>
      {objects.map((obj) => (
        <ChatReference key={Obj.getURI(obj).toString()} obj={obj} onRemove={onUpdateObject} />
      ))}
    </ul>
  );
};

type ChatReferenceProps = {
  obj: Obj.Unknown;
  onRemove: UseContextObjects['onUpdateObject'];
};

/**
 * One reference tag.
 *
 * Its own component so that the label can be read through a subscription: rendering the tags inline
 * would read a mutable field from the loop body, where no hook can go, and the referenced object
 * keeps its identity when renamed.
 */
const ChatReference = ({ obj, onRemove }: ChatReferenceProps) => {
  const { t } = useTranslation(meta.profile.key);
  const snapshot = useObjectValue(obj) ?? obj;

  const uri = Obj.getURI(obj);
  const typename = Obj.getTypename(obj);
  const label: Label = Obj.getLabel(snapshot) ?? (typename ? ['object-name.placeholder', { ns: typename }] : obj.id);
  const { icon } = Obj.getIcon(obj) ?? { icon: DEFAULT_OBJECT_ICON };

  return (
    <li className='dx-tag py-0 flex items-center gap-1' data-hue='neutral'>
      <Icon icon={icon} size={4} />
      {toLocalizedString(label, t)}
      <IconButton
        icon='ph--x--bold'
        iconOnly
        variant='ghost'
        label={t('remove-object.label')}
        classNames='p-0 hover:bg-transparent'
        size={3}
        onClick={() => void onRemove(uri, false)}
      />
    </li>
  );
};

// TODO(dmaretskyi): Extract those somewhere else.
const DEFAULT_OBJECT_ICON = 'ph--cube--regular';
