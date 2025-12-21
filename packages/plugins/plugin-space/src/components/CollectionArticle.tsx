//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type SurfaceComponentProps } from '@dxos/app-framework/react';
import { useTranslation } from '@dxos/react-ui';
import { baseSurface, descriptionMessage, mx } from '@dxos/ui-theme';
import { type Collection } from '@dxos/schema';

import { meta } from '../meta';

export const CollectionArticle = ({ subject }: SurfaceComponentProps<Collection.Collection>) => {
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
        {subject.name ?? t('unnamed collection label')}
      </p>
    </div>
  );
};

export default CollectionArticle;
