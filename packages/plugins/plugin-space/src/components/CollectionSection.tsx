//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type SurfaceComponentProps } from '@dxos/app-framework/react';
import { useTranslation } from '@dxos/react-ui';
import { type Collection } from '@dxos/schema';

import { meta } from '../meta';

export const CollectionSection = ({ role, subject }: SurfaceComponentProps<Collection.Collection>) => {
  const { t } = useTranslation(meta.id);

  // TODO(wittjosiah): Better placeholder.
  return (
    <div role={role} className='min-bs-[3.5rem] grid grid-rows-subgrid grid-cols-subgrid items-center'>
      <span className='truncate'>{subject.name ?? t('unnamed collection label')}</span>
    </div>
  );
};
