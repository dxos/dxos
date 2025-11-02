//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type ButtonProps, IconButton, useTranslation } from '@dxos/react-ui';

export const CloseButton = ({ onDone, ...props }: Omit<ButtonProps, 'onClick'> & { onDone?: () => void }) => {
  const { t } = useTranslation('os');
  return (
    <IconButton
      icon='ph--x--bold'
      size={4}
      label={t('exit label')}
      iconOnly
      variant='ghost'
      classNames='plb-0 pli-2 absolute block-start-0 inline-end-0 z-[1]'
      onClick={() => onDone?.()}
      {...props}
    />
  );
};
