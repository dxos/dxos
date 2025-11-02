//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type ButtonProps, Icon, type IconProps, type ThemedClassName, useTranslation } from '@dxos/react-ui';

import { PickerButton, type PickerButtonProps } from '../PickerButton';

export type IconPickerProps = {
  disabled?: boolean;
  defaultValue?: string;
  value?: string;
  onChange?: (nextHue: string) => void;
  onReset?: ButtonProps['onClick'];
} & Pick<
  PickerButtonProps,
  'disabled' | 'defaultValue' | 'value' | 'onChange' | 'onReset' | 'rootVariant' | 'iconSize'
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
  console.log(size);
  return <Icon icon={`ph--${value}--regular`} size={size} />;
};

/**
 * https://phosphoricons.com
 * NOTE: Select icons that we are unlikely to use for the UI.
 */
export const icons = [
  'ph--house-line--regular',
  'ph--planet--regular',
  'ph--castle-turret--regular',
  'ph--snowflake--regular',
  'ph--virus--regular',
  'ph--graph--regular',
  'ph--air-traffic-control--regular',
  'ph--asterisk--regular',
  'ph--atom--regular',
  'ph--basketball--regular',
  'ph--butterfly--regular',
  'ph--cactus--regular',
  'ph--cake--regular',
  'ph--calendar-dots--regular',
  'ph--campfire--regular',
  'ph--command--regular',
  'ph--confetti--regular',
  'ph--detective--regular',
  'ph--disco-ball--regular',
  'ph--dna--regular',
  'ph--factory--regular',
  'ph--flag-banner-fold--regular',
  'ph--flask--regular',
  'ph--flower-lotus--regular',
  'ph--flying-saucer--regular',
  'ph--game-controller--regular',
  'ph--gavel--regular',
  'ph--gift--regular',
  'ph--guitar--regular',
  'ph--hamburger--regular',
  'ph--handshake--regular',
  'ph--heart--regular',
  'ph--lightbulb--regular',
  'ph--lock--regular',
  'ph--martini--regular',
  'ph--medal-military--regular',
  'ph--moped-front--regular',
  'ph--office-chair--regular',
  'ph--paint-brush-household--regular',
  'ph--peace--regular',
  'ph--person-simple-hike--regular',
  'ph--piggy-bank--regular',
  'ph--potted-plant--regular',
  'ph--radioactive--regular',
  'ph--rocket-launch--regular',
  'ph--shield-star--regular',
  'ph--shopping-cart--regular',
  'ph--stethoscope--regular',
  'ph--student--regular',
  'ph--sun--regular',
  'ph--tote--regular',
  'ph--tree--regular',
  'ph--users-three--regular',
  'ph--yin-yang--regular',
];

export const iconValues = icons.map((icon) => icon.match(/ph--(.+)--regular/)?.[1] ?? icon);
