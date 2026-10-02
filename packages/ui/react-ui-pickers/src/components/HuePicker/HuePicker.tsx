//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type Next, type ThemedClassName, useTranslation } from '@dxos/react-ui';
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

/** Next icon sizes as the Tailwind steps the preview's square is drawn at. */
const PREVIEW_SIZES: Record<Next.Size, 3 | 3.5 | 4 | 5 | 6> = { xs: 3, sm: 3.5, md: 4, lg: 5, xl: 6 };

const HuePreview = ({ value, size: iconSize = 'md' }: { value: string; size?: Next.Size }) => {
  const size = PREVIEW_SIZES[iconSize];
  return (
    <div className='flex justify-center items-center'>
      <svg viewBox={`0 0 ${size} ${size}`} className={getSize(size)}>
        <rect x={0} y={0} width={size} height={size} fill={`var(--color-${value}-surface)`} strokeWidth={4} />
      </svg>
    </div>
  );
};
