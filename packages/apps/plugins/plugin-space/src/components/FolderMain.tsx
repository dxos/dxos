//
// Copyright 2023 DXOS.org
//

import React from 'react';

import type { FolderType } from '@braneframe/types';
import { useTranslation } from '@dxos/react-ui';
import { baseSurface, descriptionText, mx } from '@dxos/react-ui-theme';

import { SPACE_PLUGIN } from '../meta';

export const FolderMain = ({ folder }: { folder: FolderType }) => {
  const { t } = useTranslation(SPACE_PLUGIN);

  return (
    <div
      role='none'
      className={mx(baseSurface, 'min-bs-screen is-full flex items-center justify-center p-8')}
      data-testid='composer.firstRunMessage'
    >
      <p
        role='alert'
        className={mx(
          descriptionText,
          'border border-dashed border-neutral-400/50 rounded-lg p-8 font-normal text-lg max-is-[24rem] break-words',
        )}
      >
        {folder.name ?? t('unnamed folder label')}
      </p>
    </div>
  );
};
