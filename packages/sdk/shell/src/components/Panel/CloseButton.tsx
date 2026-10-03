//
// Copyright 2023 DXOS.org
//

import React from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';

import { translationKey } from '../../translations.ts';

/**
 * @deprecated use IconButton directly
 */
export const CloseButton = ({ onDone, ...props }: Omit<Button.ButtonProps, 'onClick'> & { onDone?: () => void }) => {
  const { t } = Hooks.useTranslation(translationKey);
  return (
    <Button.Button
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
