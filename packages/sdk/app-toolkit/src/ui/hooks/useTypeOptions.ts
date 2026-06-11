//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import { type Database } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';
import { useTranslation } from '@dxos/react-ui';

import { type TypeInputOptions, allTypesQuery, filterTypeOptions } from '../../type-options';

export const useTypeOptions = ({ db, annotation }: { db?: Database.Database; annotation: TypeInputOptions }) => {
  const { t } = useTranslation();
  const types = useQuery(db, allTypesQuery);
  // `annotation` is recreated each render; depend on its primitive contents, not its identity.
  const options = useMemo(
    () => filterTypeOptions(types, annotation),
    [types, annotation.location.join(','), annotation.kind.join(',')],
  );
  return useMemo(
    () =>
      options
        .map(({ typename, label }): { value: string; label: string } => ({
          value: typename,
          // Use the entity's label (e.g. the `name` field on persisted schemas) when available;
          // fall back to i18n with the typename as the namespace key for code-shipped types.
          label: label ?? t('typename.label', { ns: typename, defaultValue: typename }) ?? typename,
        }))
        .toSorted((a, b) => a.label.localeCompare(b.label)),
    [t, options],
  );
};
