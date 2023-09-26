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
      <div>
        <Avatar.Label classNames='block'>{label}</Avatar.Label>
        <Avatar.Description classNames='block'>{description}</Avatar.Description>
      </div>
    </Avatar.Root>
  );
};

export default {
  component: StorybookAvatar,
};

export const Default = () => (
  <div className='flex flex-row gap-4'>
    <StorybookAvatar description='Offline' />
    <StorybookAvatar status='active' />
    <StorybookAvatar status='error' description='Error' />
    <StorybookAvatar status='warning' description='Warning' />
  </div>
);

export const Square = () => (
  <div className='flex flex-row gap-4'>
    <StorybookAvatar variant='square' description='Offline' />
    <StorybookAvatar variant='square' status='active' />
    <StorybookAvatar variant='square' status='error' />
    <StorybookAvatar variant='square' status='warning' />
  </div>
);

export const DefaultEmoji = () => (
  <div className='flex flex-row gap-4'>
    <StorybookAvatar fallbackText='🦄' fallbackValue='' status='active' animation='pulse' />
    <StorybookAvatar fallbackText='🐒' fallbackValue='' animation='pulse' />
    <StorybookAvatar fallbackText='🪲' fallbackValue='' />
  </div>
);

export const SquareEmoji = () => <StorybookAvatar variant='square' fallbackText='🦄' fallbackValue='' />;

export const DefaultText = () => (
  <div className='flex flex-row gap-4'>
    <StorybookAvatar fallbackText='PT' fallbackValue='' />
    <StorybookAvatar fallbackText='AP' fallbackValue='' />
    <StorybookAvatar fallbackText='Z' fallbackValue='' />
    <StorybookAvatar fallbackText='pt' fallbackValue='' />
    <StorybookAvatar fallbackText='ap' fallbackValue='' />
    <StorybookAvatar fallbackText='z' fallbackValue='' />
  </div>
);

export const Error = () => <StorybookAvatar status='error' description='Errored' />;

export const Pulse = () => (
  <div className='flex flex-row gap-4'>
    <StorybookAvatar description='Online' status='active' animation='pulse' />
    <StorybookAvatar description='Offline' status='inactive' animation='pulse' />
    <StorybookAvatar description='Error' status='error' animation='pulse' />
    <StorybookAvatar description='Warning' status='warning' animation='pulse' />
  </div>
);
