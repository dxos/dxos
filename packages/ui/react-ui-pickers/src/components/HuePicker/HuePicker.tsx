//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type ThemedClassName, useTranslation } from '@dxos/react-ui';
import type { Next } from '@dxos/react-ui/next';
import { getSize, osTranslations } from '@dxos/ui-theme';
import { hues } from '@dxos/ui-types';

import { PickerButton, type PickerButtonProps } from '../PickerButton/index.ts';

export type HuePickerProps = {
  /** Replaces the generic "select hue" label (tooltip and screen-reader text). */
  label?: string;
  disabled?: boolean;
  defaultValue?: string;
  value?: string;
  onChange?: (nextHue: string) => void;
  onReset?: Next.ButtonProps['onClick'];
} & Pick<PickerButtonProps, 'disabled' | 'defaultValue' | 'value' | 'onChange' | 'onReset' | 'rootVariant'>;

export const HuePicker = ({ label, ...props }: ThemedClassName<HuePickerProps>) => {
  const { t } = useTranslation(osTranslations);

  return (
    <PickerButton
      Component={HuePreview}
      label={label ?? t('select-hue.label')}
      icon='ph--palette--regular'
      values={hues}
      {...props}
    />
  );
};

const HuePreview = ({ value, size = 5 }: { value: string; size?: Next.IconProps['size'] }) => {
  return (
    <div className='flex justify-center items-center'>
      <svg viewBox={`0 0 ${size} ${size}`} className={getSize(size)}>
        <rect x={0} y={0} width={size} height={size} fill={`var(--color-${value}-surface)`} strokeWidth={4} />
      </svg>
    </div>
  );
};
