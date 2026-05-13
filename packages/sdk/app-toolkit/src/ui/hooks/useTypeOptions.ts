//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import { type Database } from '@dxos/echo';
import { useTranslation } from '@dxos/react-ui';

import { type TypeInputOptions, getTypenames } from '../../type-options';

export const useTypeOptions = ({ db, annotation }: { db?: Database.Database; annotation: TypeInputOptions }) => {
  const { t } = useTranslation();
  const typenames = getTypenames({ annotation, db });
  return useMemo(
    () =>
      typenames
        .map((typename) => ({
          value: typename,
          label: t('typename.label', { ns: typename, defaultValue: typename }),
        }))
        .toSorted((a, b) => a.label.localeCompare(b.label)),
    [t, typenames],
  );
};
