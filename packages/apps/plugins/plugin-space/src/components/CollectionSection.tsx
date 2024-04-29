//
// Copyright 2023 DXOS.org
//

import React from 'react';

import type { Collection } from '@braneframe/types';
import { useTranslation } from '@dxos/react-ui';

import { SPACE_PLUGIN } from '../meta';

export const CollectionSection = ({ collection }: { collection: Collection }) => {
  const { t } = useTranslation(SPACE_PLUGIN);
  // TODO(wittjosiah): Better placeholder.
  return (
    <div className='min-bs-[3.5rem] grid grid-rows-subgrid grid-cols-subgrid items-center rounded-sm mlb-1 mie-1'>
      <span className='truncate'>{collection.name ?? t('unnamed collection label')}</span>
    </div>
  );
};
