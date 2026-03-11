//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';
import React from 'react';

import { type AiContextBinder } from '@dxos/assistant';
import { Annotation, type Database, Obj } from '@dxos/echo';
import { Icon, IconButton, type Label, type ThemedClassName, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { getStyles, mx } from '@dxos/ui-theme';

import { useContextObjects } from '../../hooks';
import { meta } from '../../meta';

export type ChatReferencesProps = ThemedClassName<{
  context: AiContextBinder;
  db: Database.Database;
}>;

export const ChatReferences = ({ classNames, context, db }: ChatReferencesProps) => {
  const { t } = useTranslation(meta.id);
  const { objects, onUpdateObject } = useContextObjects({ db, context });

  return (
    <ul className={mx('flex', classNames)}>
      {objects.map((obj) => {
        const dxn = Obj.getDXN(obj);
        const typename = Obj.getTypename(obj);
        const label: Label = Obj.getLabel(obj) ?? (typename ? ['object name placeholder', { ns: typename }] : obj.id);
        const { icon, hue } = Option.fromNullable(Obj.getSchema(obj)).pipe(
          Option.flatMap(Annotation.IconAnnotation.get),
          Option.getOrElse(() => ({ icon: DEFAULT_OBJECT_ICON, hue: undefined as string | undefined })),
        );
        const styles = hue ? getStyles(hue) : undefined;
        return (
          <li key={dxn.toString()} className='dx-tag py-0 ps-2 flex items-center gap-1' data-hue='neutral'>
            <Icon icon={icon} size={4} classNames={styles?.surfaceText} />
            {toLocalizedString(label, t)}
            <IconButton
              icon='ph--x--bold'
              iconOnly
              variant='ghost'
              label={t('remove object in context label')}
              classNames='p-0 hover:bg-transparent'
              size={3}
              onClick={() => onUpdateObject?.(dxn, false)}
            />
          </li>
        );
      })}
    </ul>
  );
};

// TODO(dmaretskyi): Extract those somewhere else.
const DEFAULT_OBJECT_ICON = 'ph--cube--regular';
