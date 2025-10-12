//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/react-ui';
import { baseSurface, descriptionMessage, mx } from '@dxos/react-ui-theme';
import { type DataType } from '@dxos/schema';

import { meta } from '../meta';

export const CollectionMain = ({ collection }: { collection: DataType.Collection }) => {
  const { t } = useTranslation(meta.id);

  return (
    <div
      role='none'
      className={mx(baseSurface, 'min-bs-screen is-full flex items-center justify-center p-8')}
      data-testid='composer.firstRunMessage'
    >
      <p
        role='alert'
        className={mx(descriptionMessage, 'rounded-md p-8 font-normal text-lg max-is-[24rem] break-words')}
      >
        {collection.name ?? t('unnamed collection label')}
      </p>
    </div>
  );
};

export default CollectionMain;
