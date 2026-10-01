//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { Next } from '@dxos/react-ui/next';
import { osTranslations } from '@dxos/ui-theme';
import { iconValues } from '@dxos/ui-types';

import { PickerButton, type PickerButtonProps } from '../PickerButton/index.ts';

export type IconPickerProps = {
  disabled?: boolean;
  defaultValue?: string;
  value?: string;
  onChange?: (nextHue: string) => void;
  onReset?: Next.ButtonProps['onClick'];
} & Pick<
  PickerButtonProps,
  'disabled' | 'rootVariant' | 'iconSize' | 'defaultValue' | 'value' | 'onChange' | 'onReset'
>;

export const IconPicker = ({ ...props }: ThemedClassName<IconPickerProps>) => {
  const { t } = useTranslation(osTranslations);

  return (
    <PickerButton
      Component={IconPreview}
      label={t('select-icon.label')}
      icon='ph--selection--regular'
      values={iconValues}
      {...props}
    />
  );
};

const IconPreview = ({ value, size }: { value: string; size?: Next.IconProps['size'] }) => {
  return <Next.Icon icon={`ph--${value}--regular`} size={size} />;
};
