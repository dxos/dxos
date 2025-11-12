//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import { useClient } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';
import { useTranslation } from '@dxos/react-ui';
import { type TypenameAnnotation, getTypenames } from '@dxos/schema';

export const useTypeOptions = ({ space, annotation }: { space?: Space; annotation: TypenameAnnotation }) => {
  const { t } = useTranslation();
  const client = useClient();
  const typenames = getTypenames({ annotation, space, client });
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
