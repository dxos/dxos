//
// Copyright 2025 DXOS.org
//

import React from 'react';

import type * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import type * as Util from '@dxos/react-ui/Util';
import { osTranslations } from '@dxos/ui-theme';
import { iconValues } from '@dxos/ui-types';

import { PickerButton, type PickerButtonProps } from '../PickerButton/index.ts';

export type IconPickerProps = {
  disabled?: boolean;
  defaultValue?: string;
  value?: string;
  onChange?: (nextHue: string) => void;
  onReset?: Button.ButtonProps['onClick'];
} & Pick<
  PickerButtonProps,
  'disabled' | 'rootVariant' | 'iconSize' | 'defaultValue' | 'value' | 'onChange' | 'onReset'
>;

export const IconPicker = ({ ...props }: Util.ThemedClassName<IconPickerProps>) => {
  const { t } = Hooks.useTranslation(osTranslations);

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

const IconPreview = ({ value, size }: { value: string; size?: Icon.IconProps['size'] }) => {
  return <Icon.Icon icon={`ph--${value}--regular`} size={size} />;
};
