//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { mx, osTranslations } from '@dxos/ui-theme';

import { useTranslation } from '../../providers/index.ts';
import { Button, type ButtonProps } from '../Button/index.ts';
import { Icon, type IconProps } from '../Icon/index.ts';
import { useClipboard } from './ClipboardContext.ts';

const inactiveLabelStyles = 'invisible h-px -mb-px overflow-hidden';

export type CopyButtonProps = ButtonProps &
  Pick<IconProps, 'size'> & {
    value: string;
  };

export const CopyButton = ({ classNames, value, size = 5, ...props }: CopyButtonProps) => {
  const { t } = useTranslation(osTranslations);
  const { textValue, setTextValue } = useClipboard();
  const isCopied = textValue === value;
  return (
    <Button
      {...props}
      classNames={['inline-flex flex-col justify-center', classNames]}
      onClick={() => setTextValue(value)}
      data-testid='copy-invitation'
    >
      <div className={mx('flex gap-1 items-center', isCopied && inactiveLabelStyles)}>
        <span className='px-1'>{t('copy.label')}</span>
        <Icon icon='ph--copy--regular' size={size} />
      </div>
      <div className={mx('flex gap-1 items-center', !isCopied && inactiveLabelStyles)}>
        <span className='px-1'>{t('copy-success.label')}</span>
        <Icon icon='ph--check--regular' size={size} />
      </div>
    </Button>
  );
};
