//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type ButtonProps, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { hues } from '@dxos/react-ui-theme';

import { ToolbarPickerButton, type ToolbarPickerProps } from './ToolbarPicker';

export type HuePickerProps = {
  disabled?: boolean;
  defaultValue?: string;
  value?: string;
  onChange?: (nextHue: string) => void;
  onReset?: ButtonProps['onClick'];
} & Pick<ToolbarPickerProps, 'disabled' | 'defaultValue' | 'value' | 'onChange' | 'onReset'>;

export const HuePicker = ({ disabled, value, onChange, ...props }: ThemedClassName<HuePickerProps>) => {
  const { t } = useTranslation('os');

  return (
    <ToolbarPickerButton
      Component={HuePreview}
      label={t('select hue label')}
      icon='ph--palette--regular'
      values={hues}
      {...props}
    />
  );
};

const HuePreview = ({ value }: { value: string }) => {
  const size = 20;
  return (
    <div className='!p-1'>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <rect
          x={0}
          y={0}
          width={size}
          height={size}
          fill={`var(--dx-${value}Surface)`}
          stroke={`var(--dx-${value}SurfaceText)`}
          strokeWidth={4}
        />
      </svg>
    </div>
  );
};
