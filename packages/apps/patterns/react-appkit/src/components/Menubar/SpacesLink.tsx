//
// Copyright 2022 DXOS.org
//

import { CaretLeft, Planet } from 'phosphor-react';
import React from 'react';

import { Button, getSize, useTranslation } from '@dxos/react-components';

import { Tooltip } from '../Tooltip';

export interface SpacesLinkProps {
  onClickGoToSpaces?: () => void;
}

export const SpacesLink = ({ onClickGoToSpaces }: SpacesLinkProps) => {
  const { t } = useTranslation('appkit');
  return (
    <Tooltip content={t('back to spaces label')} side='right' tooltipLabelsTrigger triggerIsInToolbar>
      <Button onClick={onClickGoToSpaces} className='pointer-events-auto flex gap-1'>
        <CaretLeft className={getSize(4)} />
        <Planet className={getSize(4)} />
      </Button>
    </Tooltip>
  );
};
