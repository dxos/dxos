//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import { type Space } from '@dxos/react-client/echo';
import { useTranslation } from '@dxos/react-ui';

import { type TypeInputOptions, getTypenames } from '../types';

export const useTypeOptions = ({ space, annotation }: { space?: Space; annotation: TypeInputOptions }) => {
  const { t } = useTranslation();
  const typenames = getTypenames({ annotation, space });
  return useMemo(
    () =>
      typenames
        .map((typename) => ({
          value: typename,
          label: t('typename label', { ns: typename, defaultValue: typename }),
        }))
        .toSorted((a, b) => a.label.localeCompare(b.label)),
    [t, typenames],
  );
};
