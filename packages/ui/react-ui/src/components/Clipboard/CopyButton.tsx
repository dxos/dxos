//
// Copyright 2023 DXOS.org
//

import { type IconProps } from '@phosphor-icons/react';
import React, { useState } from 'react';

import { mx } from '@dxos/react-ui-theme';

import { useClipboard } from './ClipboardProvider';
import { Button, type ButtonProps } from '../Buttons';
import { Icon } from '../Icon';
import { useTranslation } from '../ThemeProvider';
import { Tooltip } from '../Tooltip';

export type CopyButtonProps = ButtonProps & {
  value: string;
  iconProps?: IconProps;
};

const inactiveLabelStyles = 'invisible bs-px -mbe-px overflow-hidden';

export const CopyButton = ({ value, classNames, iconProps, ...props }: CopyButtonProps) => {
  const { t } = useTranslation('os');
  const { textValue, setTextValue } = useClipboard();
  const isCopied = textValue === value;
  return (
    <Button
      {...props}
      classNames={['inline-flex flex-col justify-center', classNames]}
      onClick={() => setTextValue(value)}
      data-testid='copy-invitation'
    >
      <div role='none' className={mx('flex gap-1 items-center', isCopied && inactiveLabelStyles)}>
        <span className='pli-1'>{t('copy label')}</span>
        {/* TODO(wittjosiah): Why do these need as any? */}
        <Icon icon='ph--copy--regular' size={5 as any} {...iconProps} />
      </div>
      <div role='none' className={mx('flex gap-1 items-center', !isCopied && inactiveLabelStyles)}>
        <span className='pli-1'>{t('copy success label')}</span>
        <Icon icon='ph--check--regular' size={5 as any} {...iconProps} />
      </div>
    </Button>
  );
};

export const CopyButtonIconOnly = ({ value, classNames, iconProps, variant, ...props }: CopyButtonProps) => {
  const { t } = useTranslation('os');
  const { textValue, setTextValue } = useClipboard();
  const isCopied = textValue === value;
  const label = isCopied ? t('copy success label') : t('copy label');
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
          <Icon icon='ph--copy--regular' size={5 as any} {...iconProps} />
        </Button>
      </Tooltip.Trigger>
    </Tooltip.Root>
  );
};
