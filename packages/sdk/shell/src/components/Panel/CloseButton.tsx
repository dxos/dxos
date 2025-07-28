//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Button, type ButtonProps, Icon, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

export const CloseButton = ({ onDone, ...props }: Omit<ButtonProps, 'onClick'> & { onDone?: () => void }) => {
  const { t } = useTranslation('os');
  return (
    <Button
      variant='ghost'
      classNames={mx('plb-0 pli-2 absolute block-start-0 inline-end-0 z-[1]')}
      onClick={() => onDone?.()}
      {...props}
    >
      <Icon icon='ph--x--bold' size={4} />
      <span className='sr-only'>{t('exit label')}</span>
    </Button>
  );
};
