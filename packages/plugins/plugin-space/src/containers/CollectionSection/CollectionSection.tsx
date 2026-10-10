//
// Copyright 2023 DXOS.org
//

import React from 'react';

import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { type Collection } from '@dxos/echo';
import * as Hooks from '@dxos/react-ui/Hooks';

import { meta } from '#meta';

export type CollectionSectionProps = AppSurface.ObjectSectionProps<Collection.Collection>;

export const CollectionSection = ({ role, subject }: CollectionSectionProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);

  // TODO(wittjosiah): Better placeholder.
  return (
    <div role={role} className='min-h-[3.5rem] grid grid-rows-subgrid grid-cols-subgrid items-center'>
      <span className='truncate'>{subject.name ?? t('unnamed-collection.label')}</span>
    </div>
  );
};

CollectionSection.displayName = 'CollectionSection';
