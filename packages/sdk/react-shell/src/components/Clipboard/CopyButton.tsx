//
// Copyright 2023 DXOS.org
//

import { Check, Copy } from '@phosphor-icons/react';
import React from 'react';

import { Button, ButtonProps, useTranslation } from '@dxos/aurora';
import { getSize, mx } from '@dxos/aurora-theme';

import { useClipboardContext } from './ClipboardProvider';

export type CopyButtonProps = Pick<ButtonProps, 'disabled' | 'classNames'> & {
  value: string;
};

const inactiveLabelStyles = 'invisible bs-px -mbe-px';

export const CopyButton = ({ value, classNames, disabled }: CopyButtonProps) => {
  const { t } = useTranslation('os');
  const { textValue, setTextValue } = useClipboardContext();
  const isCopied = textValue === value;
  return (
    <Button
      disabled={disabled}
      classNames={['inline-flex flex-col justify-center', classNames]}
      onClick={() => setTextValue(value)}
      data-testid='copy-invitation'
    >
      <div role='none' className={mx('flex gap-1', isCopied && inactiveLabelStyles)}>
        <span className='pli-1'>{t('copy invitation code label')}</span>
        <Copy className={getSize(4)} weight='bold' />
      </div>
      <div role='none' className={mx('flex gap-1', !isCopied && inactiveLabelStyles)}>
        <span className='pli-1'>{t('copy invitation code success label')}</span>
        <Check className={getSize(4)} weight='bold' />
      </div>
    </Button>
  );
};
