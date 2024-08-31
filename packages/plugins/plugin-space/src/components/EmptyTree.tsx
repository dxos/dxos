//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/react-ui';
import { descriptionText, mx } from '@dxos/react-ui-theme';

import { SPACE_PLUGIN } from '../meta';

export const EmptyTree = () => {
  const { t } = useTranslation(SPACE_PLUGIN);
  return (
    <div
      role='none'
      className={mx(
        'mli-2 mbe-2 rounded-lg border border-dashed border-neutral-400/50 p-2 text-center',
        descriptionText,
      )}
    >
      {t('empty tree message')}
    </div>
  );
};
