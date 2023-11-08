//
// Copyright 2023 DXOS.org
//

import { Check, Copy, type IconProps } from '@phosphor-icons/react';
import React, { useState } from 'react';

import { Button, type ButtonProps, Tooltip, useTranslation } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';

import { useClipboardContext } from './ClipboardProvider';

export type CopyButtonProps = ButtonProps & {
  value: string;
  iconProps?: IconProps;
};

const inactiveLabelStyles = 'invisible bs-px -mbe-px overflow-hidden';

export const CopyButton = ({ value, classNames, iconProps, ...props }: CopyButtonProps) => {
  const { t } = useTranslation('os');
  const { textValue, setTextValue } = useClipboardContext();
  const isCopied = textValue === value;
  return (
    <Button
      {...props}
      classNames={['inline-flex flex-col justify-center', classNames]}
      onClick={() => setTextValue(value)}
      data-testid='copy-invitation'
    >
      <div role='none' className={mx('flex gap-1 items-center', isCopied && inactiveLabelStyles)}>
        <span className='pli-1'>{t('copy invitation code label')}</span>
        <Copy className={getSize(4)} weight='bold' {...iconProps} />
      </div>
      <div role='none' className={mx('flex gap-1 items-center', !isCopied && inactiveLabelStyles)}>
        <span className='pli-1'>{t('copy invitation code success label')}</span>
        <Check className={getSize(4)} weight='bold' {...iconProps} />
      </div>
    </Button>
  );
};

export const CopyButtonIconOnly = ({ value, classNames, iconProps, variant, ...props }: CopyButtonProps) => {
  const { t } = useTranslation('os');
  const { textValue, setTextValue } = useClipboardContext();
  const isCopied = textValue === value;
  const label = isCopied ? t('copy invitation code success label') : t('copy invitation code label');
  const [open, setOpen] = useState(false);
  return (
    <Tooltip.Root delayDuration={1500} open={open} onOpenChange={setOpen}>
      <Tooltip.Portal>
        <Tooltip.Content side='bottom' sideOffset={12} classNames='z-30'>
          <span>{label}</span>
          <Tooltip.Arrow />
        </Tooltip.Content>
      </Tooltip.Portal>
      <Tooltip.Trigger
        aria-label={label}
        {...props}
        onClick={() => setTextValue(value).then(() => setOpen(true))}
        data-testid='copy-invitation'
        asChild
      >
        <Button variant={variant} classNames={['inline-flex flex-col justify-center', classNames]}>
          <Copy className={getSize(5)} weight='bold' {...iconProps} />
        </Button>
      </Tooltip.Trigger>
    </Tooltip.Root>
  );
};
