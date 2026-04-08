//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { type Collection } from '@dxos/echo';
import { useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

export type CollectionSectionProps = AppSurface.ObjectProps<Collection.Collection>;

export const CollectionSection = ({ role, subject }: CollectionSectionProps) => {
  const { t } = useTranslation(meta.id);

  // TODO(wittjosiah): Better placeholder.
  return (
    <div role={role} className='min-h-[3.5rem] grid grid-rows-subgrid grid-cols-subgrid items-center'>
      <span className='truncate'>{subject.name ?? t('unnamed-collection.label')}</span>
    </div>
  );
};
