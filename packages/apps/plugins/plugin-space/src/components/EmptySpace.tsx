//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/aurora';
import { descriptionText, mx } from '@dxos/aurora-theme';

import { SPACE_PLUGIN } from '../types';

export const EmptySpace = () => {
  const { t } = useTranslation(SPACE_PLUGIN);
  return (
    <div
      role='none'
      className={mx(
        'p-2 mli-2 mbe-2 text-center border border-dashed border-neutral-400/50 rounded-xl',
        descriptionText,
      )}
    >
      {t('empty space message')}
    </div>
  );
};
