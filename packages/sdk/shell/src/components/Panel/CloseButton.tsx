//
// Copyright 2023 DXOS.org
//

import React from 'react';

import type * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as IconButton from '@dxos/react-ui/IconButton';

import { translationKey } from '../../translations.ts';

/**
 * @deprecated use IconButton directly
 */
export const CloseButton = ({ onDone, ...props }: Omit<Button.RootProps, 'onClick'> & { onDone?: () => void }) => {
  const { t } = Hooks.useTranslation(translationKey);
  return (
    <IconButton.Root
      icon='ph--x--bold'
      size={4}
      label={t('exit.label')}
      iconOnly
      variant='ghost'
      classNames='py-0 px-2 absolute top-0 right-0 z-[1]'
      onClick={() => onDone?.()}
      {...props}
    />
  );
};
