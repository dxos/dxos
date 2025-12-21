//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { mx } from '@dxos/ui-theme';

import { Button, type ButtonProps, IconButton } from '../Button';
import { Icon, type IconProps } from '../Icon';
import { useTranslation } from '../ThemeProvider';
import { type TooltipScopedProps, useTooltipContext } from '../Tooltip';

import { useClipboard } from './ClipboardProvider';

export type CopyButtonProps = ButtonProps &
  Pick<IconProps, 'size'> & {
    value: string;
  };

const inactiveLabelStyles = 'invisible bs-px -mbe-px overflow-hidden';

export const CopyButton = ({ classNames, value, size = 5, ...props }: CopyButtonProps) => {
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
        <Icon icon='ph--copy--regular' size={size} />
      </div>
      <div role='none' className={mx('flex gap-1 items-center', !isCopied && inactiveLabelStyles)}>
        <span className='pli-1'>{t('copy success label')}</span>
        <Icon icon='ph--check--regular' size={size} />
      </div>
    </Button>
  );
};

type CopyButtonIconOnlyProps = CopyButtonProps & {
  label?: string;
};

export const CopyButtonIconOnly = ({
  __scopeTooltip,
  value,
  classNames,
  size,
  variant,
  ...props
}: TooltipScopedProps<CopyButtonIconOnlyProps>) => {
  const { t } = useTranslation('os');
  const { textValue, setTextValue } = useClipboard();
  const isCopied = textValue === value;
  const label = isCopied ? t('copy success label') : (props.label ?? t('copy label'));
  const { onOpen } = useTooltipContext('CopyButton', __scopeTooltip);
  return (
    <IconButton
      iconOnly
      label={label!}
      icon='ph--copy--regular'
      size={size}
      variant={variant}
      classNames={['inline-flex flex-col justify-center', classNames]}
      onClick={() => setTextValue(value).then(onOpen)}
      data-testid='copy-invitation'
    />
  );
};
