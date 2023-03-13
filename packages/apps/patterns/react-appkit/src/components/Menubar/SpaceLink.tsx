//
// Copyright 2022 DXOS.org
//

import { Check } from '@phosphor-icons/react';
import { Button as ToolbarButtonItem } from '@radix-ui/react-toolbar';
import React from 'react';

import { Button, getSize, useTranslation } from '@dxos/react-components';

export interface SpaceLinkProps {
  onClickGoToSpace?: () => void;
}

export const SpaceLink = ({ onClickGoToSpace }: SpaceLinkProps) => {
  const { t } = useTranslation('appkit');
  return (
    <ToolbarButtonItem asChild>
      <Button className='pointer-events-auto flex gap-1 pli-2' onClick={onClickGoToSpace}>
        <span className='text-xs'>{t('go to space label')}</span>
        <Check className={getSize(4)} />
      </Button>
    </ToolbarButtonItem>
  );
};
