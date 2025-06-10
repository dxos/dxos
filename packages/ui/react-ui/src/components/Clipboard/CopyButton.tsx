//
// Copyright 2023 DXOS.org
//

import { type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { mx } from '@dxos/react-ui-theme';

import { useClipboard } from './ClipboardProvider';
import { Button, type ButtonProps, IconButton } from '../Buttons';
import { Icon } from '../Icon';
import { useTranslation } from '../ThemeProvider';
import { type TooltipScopedProps, useTooltipContext } from '../Tooltip';

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

type CopyButtonIconOnlyProps = CopyButtonProps & {
  label?: string;
};

export const CopyButtonIconOnly = ({
  __scopeTooltip,
  value,
  classNames,
  iconProps,
  variant,
  ...props
}: TooltipScopedProps<CopyButtonIconOnlyProps>) => {
  const { t } = useTranslation('os');
  const { textValue, setTextValue } = useClipboard();
  const isCopied = textValue === value;
  const label = isCopied ? t('copy success label') : props.label ?? t('copy label');
  const { onOpen } = useTooltipContext('CopyButton', __scopeTooltip);
  return (
    <IconButton
      iconOnly
      label={label!}
      icon='ph--copy--regular'
      size={5}
      variant={variant}
      classNames={['inline-flex flex-col justify-center', classNames]}
      onClick={() => setTextValue(value).then(onOpen)}
      data-testid='copy-invitation'
    />
  );
};
