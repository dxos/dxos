//
// Copyright 2022 DXOS.org
//

import { Check } from 'phosphor-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { Button, getSize } from '@dxos/react-ui';

export interface SpaceLinkProps {
  onClickGoToSpace?: () => void;
}

export const SpaceLink = ({ onClickGoToSpace }: SpaceLinkProps) => {
  const { t } = useTranslation('uikit');
  return (
    <Button compact className='flex gap-1 pli-2' onClick={onClickGoToSpace}>
      <span className='text-xs'>{t('go to space label')}</span>
      <Check className={getSize(4)} />
    </Button>
  );
};
