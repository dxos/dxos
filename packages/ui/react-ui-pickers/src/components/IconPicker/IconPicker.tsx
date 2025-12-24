//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type ButtonProps, Icon, type IconProps, type ThemedClassName, useTranslation } from '@dxos/react-ui';

import { PickerButton, type PickerButtonProps } from '../PickerButton';

import { iconValues } from './icons';

export type IconPickerProps = {
  disabled?: boolean;
  defaultValue?: string;
  value?: string;
  onChange?: (nextHue: string) => void;
  onReset?: ButtonProps['onClick'];
} & Pick<
  PickerButtonProps,
  'disabled' | 'rootVariant' | 'iconSize' | 'defaultValue' | 'value' | 'onChange' | 'onReset'
>;

export const IconPicker = ({ ...props }: ThemedClassName<IconPickerProps>) => {
  const { t } = useTranslation('os');

  return (
    <PickerButton
      Component={IconPreview}
      label={t('select icon label')}
      icon='ph--selection--regular'
      values={iconValues}
      {...props}
    />
  );
};

const IconPreview = ({ value, size }: { value: string; size?: IconProps['size'] }) => {
  return <Icon icon={`ph--${value}--regular`} size={size} />;
};
