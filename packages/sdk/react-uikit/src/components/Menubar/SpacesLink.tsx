//
// Copyright 2022 DXOS.org
//

import { CaretLeft, Planet } from 'phosphor-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { Button, getSize, Tooltip } from '@dxos/react-ui';

export interface SpacesLinkProps {
  onClickGoToSpaces?: () => void;
}

export const SpacesLink = ({ onClickGoToSpaces }: SpacesLinkProps) => {
  const { t } = useTranslation('uikit');
  return (
    <Tooltip content={t('back to spaces label')} side='right' tooltipLabelsTrigger triggerIsInToolbar>
      <Button compact onClick={onClickGoToSpaces} className='flex gap-1'>
        <CaretLeft className={getSize(4)} />
        <Planet className={getSize(4)} />
      </Button>
    </Tooltip>
  );
};
