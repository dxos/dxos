//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/react-ui';
import { baseSurface, descriptionMessage, mx } from '@dxos/react-ui-theme';

import { SPACE_PLUGIN } from '../meta';
import type { CollectionType } from '../types';

export const CollectionMain = ({ collection }: { collection: CollectionType }) => {
  const { t } = useTranslation(SPACE_PLUGIN);

  return (
    <div
      role='none'
      className={mx(baseSurface, 'min-bs-screen is-full flex items-center justify-center p-8')}
      data-testid='composer.firstRunMessage'
    >
      <p
        role='alert'
        className={mx(descriptionMessage, 'rounded-lg p-8 font-normal text-lg max-is-[24rem] break-words')}
      >
        {collection.name ?? t('unnamed collection label')}
      </p>
    </div>
  );
};
