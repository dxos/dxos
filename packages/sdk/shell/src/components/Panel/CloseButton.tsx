//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/react-ui';
import { Next } from '@dxos/react-ui/next';

import { translationKey } from '../../translations.ts';

/**
 * @deprecated use IconButton directly
 */
export const CloseButton = ({ onDone, ...props }: Omit<Next.ButtonProps, 'onClick'> & { onDone?: () => void }) => {
  const { t } = useTranslation(translationKey);
  return (
    <Next.Button
      icon='ph--x--bold'
      iconSize='md'
      label={t('exit.label')}
      iconOnly
      variant='ghost'
      classNames='py-0 px-2 absolute top-0 right-0 z-[1]'
      onClick={() => onDone?.()}
      {...props}
    />
  );
};
