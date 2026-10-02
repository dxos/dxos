//
// Copyright 2025 DXOS.org
//

import React from 'react';

import type * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import type * as Icon from '@dxos/react-ui/Icon';
import type * as Util from '@dxos/react-ui/Util';
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
  onReset?: Button.RootProps['onClick'];
} & Pick<PickerButtonProps, 'disabled' | 'defaultValue' | 'value' | 'onChange' | 'onReset' | 'rootVariant'>;

export const HuePicker = ({ label, ...props }: Util.ThemedClassName<HuePickerProps>) => {
  const { t } = Hooks.useTranslation(osTranslations);

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

const HuePreview = ({ value, size = 5 }: { value: string; size?: Icon.RootProps['size'] }) => {
  return (
    <div className='flex justify-center items-center'>
      <svg viewBox={`0 0 ${size} ${size}`} className={getSize(size)}>
        <rect x={0} y={0} width={size} height={size} fill={`var(--color-${value}-surface)`} strokeWidth={4} />
      </svg>
    </div>
  );
};
