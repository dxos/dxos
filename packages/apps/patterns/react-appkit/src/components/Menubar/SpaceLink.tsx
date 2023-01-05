//
// Copyright 2022 DXOS.org
//

import { Button as ToolbarButtonItem } from '@radix-ui/react-toolbar';
import { Check } from 'phosphor-react';
import React from 'react';

import { Button, getSize, useTranslation } from '@dxos/react-ui';

export interface SpaceLinkProps {
  onClickGoToSpace?: () => void;
}

export const SpaceLink = ({ onClickGoToSpace }: SpaceLinkProps) => {
  const { t } = useTranslation('uikit');
  return (
    <ToolbarButtonItem asChild>
      <Button compact className='pointer-events-auto flex gap-1 pli-2' onClick={onClickGoToSpace}>
        <span className='text-xs'>{t('go to space label')}</span>
        <Check className={getSize(4)} />
      </Button>
    </ToolbarButtonItem>
  );
};
