//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import * as TypeOptions from '@dxos/app-toolkit/TypeOptions';
import { type Database, Filter, Obj } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import * as Hooks from '@dxos/react-ui/Hooks';

import { meta } from '#meta';

export type ObjectOption = { id: string; label: string; object: Obj.Unknown };

/**
 * The space's listed objects as picker options, labelled as the navtree labels them. Pass a database only while
 * the picker is open, so a mounted toolbar does not watch every object.
 */
export const useObjectOptions = (
  db: Database.Database | undefined,
  include: (object: Obj.Unknown) => boolean = () => true,
): ObjectOption[] => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const objects = useQuery(db, Filter.everything());
  return useMemo(
    () =>
      TypeOptions.filterListedObjects(objects)
        .filter(include)
        .map((object) => {
          const typename = Obj.getTypename(object) ?? '';
          return {
            id: object.id,
            object,
            label:
              Obj.getLabel(object) ||
              t('object-name.placeholder', { ns: typename, defaultValue: '' }) ||
              t('untitled-object.label', {
                type: t('typename.label', { ns: typename, defaultValue: typename }) ?? typename,
              }) ||
              object.id,
          };
        })
        .sort((a, b) => a.label.localeCompare(b.label)),
    [objects, include, t],
  );
};
