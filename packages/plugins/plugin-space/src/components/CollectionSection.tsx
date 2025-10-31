//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type SectionComponentProps } from '@dxos/app-framework';
import { useTranslation } from '@dxos/react-ui';
import { type DataType } from '@dxos/schema';

import { meta } from '../meta';

export const CollectionSection = ({ object }: SectionComponentProps<DataType.Collection>) => {
  const { t } = useTranslation(meta.id);

  // TODO(wittjosiah): Better placeholder.
  return (
    <div className='min-bs-[3.5rem] grid grid-rows-subgrid grid-cols-subgrid items-center'>
      <span className='truncate'>{object.name ?? t('unnamed collection label')}</span>
    </div>
  );
};
