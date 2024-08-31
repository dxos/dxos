//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/react-ui';

import { SPACE_PLUGIN } from '../meta';
import type { CollectionType } from '../types';

export const CollectionSection = ({ collection }: { collection: CollectionType }) => {
  const { t } = useTranslation(SPACE_PLUGIN);
  // TODO(wittjosiah): Better placeholder.
  return (
    <div className='min-bs-[3.5rem] grid grid-cols-subgrid grid-rows-subgrid items-center'>
      <span className='truncate'>{collection.name ?? t('unnamed collection label')}</span>
    </div>
  );
};
