//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React, { PropsWithChildren } from 'react';

import { Size } from '@dxos/aurora-types';

import { Avatar, useJdenticonHref, AvatarVariant, AvatarStatus, AvatarAnimation } from './Avatar';

type StorybookAvatarProps = {
  imgSrc?: string;
  fallbackValue?: string;
  fallbackText?: string;
  label?: string;
  description?: string;
  status?: AvatarStatus;
  variant?: AvatarVariant;
  animation?: AvatarAnimation;
  size?: Size;
};

const StorybookAvatar = (props: PropsWithChildren<StorybookAvatarProps>) => {
  const {
    status,
    size = 12,
    variant = 'circle',
    label = 'Alice',
    description = 'Online',
    fallbackValue = '20970b563fc49b5bb194a6ffdff376031a3a11f9481360c071c3fed87874106b',
    fallbackText = '',
    animation,
    imgSrc,
  } = props;
  const jdenticon = useJdenticonHref(fallbackValue ?? '', size);
  return (
    <Avatar.Root {...{ size, variant, status, animation }}>
      <Avatar.Frame>
        <Avatar.Image href={imgSrc} />
        <Avatar.Fallback href={fallbackValue ? jdenticon : ''} text={fallbackText} />
      </Avatar.Frame>
      <Avatar.Label classNames='block'>{label}</Avatar.Label>
      <Avatar.Description classNames='block'>{description}</Avatar.Description>
    </Avatar.Root>
  );
};

export default {
  component: StorybookAvatar,
};

export const Default = () => <StorybookAvatar />;
export const Square = () => <StorybookAvatar variant='square' />;

export const DefaultEmoji = () => (
  <>
    <StorybookAvatar fallbackText='🦄' fallbackValue='' status='active' animation='pulse' />
    <StorybookAvatar fallbackText='🐒' fallbackValue='' animation='pulse'/>
    <StorybookAvatar fallbackText='🪲' fallbackValue='' />
  </>
);

export const SquareEmoji = () => <StorybookAvatar variant='square' fallbackText='🦄' fallbackValue='' />;

export const DefaultText = () => (
  <>
    <StorybookAvatar fallbackText='PT' fallbackValue='' />
    <StorybookAvatar fallbackText='AP' fallbackValue='' />
    <StorybookAvatar fallbackText='Z' fallbackValue='' />
    <StorybookAvatar fallbackText='pt' fallbackValue='' />
    <StorybookAvatar fallbackText='ap' fallbackValue='' />
    <StorybookAvatar fallbackText='z' fallbackValue='' />
  </>
);

export const Inactive = () => <StorybookAvatar status='inactive' description='Inactive' />;
export const InactiveSquare = () => <StorybookAvatar variant='square' status='inactive' description='Inactive' />;

export const Error = () => <StorybookAvatar status='error' description='Errored' />;
export const Pending = () => <StorybookAvatar description='Pending' animation='pulse' />;
