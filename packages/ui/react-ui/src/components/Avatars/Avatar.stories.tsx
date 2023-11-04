//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';

import React, { type PropsWithChildren } from 'react';

import { type Size } from '@dxos/react-ui-types';

import { Avatar, useJdenticonHref, type AvatarVariant, type AvatarStatus, type AvatarAnimation } from './Avatar';

const cursorColors = [
  { color: '#30bced', light: '#30bced33' },
  { color: '#6eeb83', light: '#6eeb8333' },
  { color: '#ffbc42', light: '#ffbc4233' },
  { color: '#ecd444', light: '#ecd44433' },
  { color: '#ee6352', light: '#ee635233' },
  { color: '#9ac2c9', light: '#9ac2c933' },
  { color: '#8acb88', light: '#8acb8833' },
  { color: '#1be7ff', light: '#1be7ff33' },
];

const randomColor = () => cursorColors[Math.round(Math.random() * cursorColors.length)];
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
  color?: string;
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
    color = randomColor(),
  } = props;
  const jdenticon = useJdenticonHref(fallbackValue ?? '', size);
  return (
    <Avatar.Root {...{ size, variant, status, animation }}>
      <Avatar.Frame>
        {!imgSrc && (fallbackValue || fallbackText) && (
          <Avatar.Fallback href={fallbackValue ? jdenticon : ''} text={fallbackText} />
        )}
        {imgSrc && <Avatar.Image href={imgSrc} />}
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

const sampleImage =
  'https://png.pngtree.com/thumb_back/fh260/background/20230614/pngtree-the-photo-of-a-woman-with-red-sunglasses-is-surrounded-by-image_2931163.jpg';

export const Default = () => (
  <div className='flex flex-col gap-6'>
    <div className='flex flex-row gap-4'>
      <StorybookAvatar description='Offline' />
      <StorybookAvatar status='active' />
      <StorybookAvatar status='error' description='Error' />
      <StorybookAvatar status='warning' description='Warning' />
      <StorybookAvatar status='active' imgSrc={sampleImage} />
    </div>
    <div className='flex flex-row gap-4'>
      <StorybookAvatar size={8} description='Offline' />
      <StorybookAvatar size={8} status='active' />
      <StorybookAvatar size={8} status='error' description='Error' />
      <StorybookAvatar size={8} status='warning' description='Warning' />
      <StorybookAvatar size={8} status='active' imgSrc={sampleImage} />
    </div>
    <div className='flex flex-row gap-4'>
      <StorybookAvatar size={5} description='Offline' />
      <StorybookAvatar size={5} status='active' />
      <StorybookAvatar size={5} status='error' description='Error' />
      <StorybookAvatar size={5} status='warning' description='Warning' />
      <StorybookAvatar size={5} status='active' imgSrc={sampleImage} />
    </div>
    <div className='flex flex-row gap-4'>
      <StorybookAvatar size={3} description='Offline' />
      <StorybookAvatar size={3} status='active' />
      <StorybookAvatar size={3} status='error' description='Error' />
      <StorybookAvatar size={3} status='warning' description='Warning' />
      <StorybookAvatar size={3} status='active' imgSrc={sampleImage} />
    </div>
  </div>
);

export const Image = () => (
  <div>
    <StorybookAvatar variant='circle' imgSrc={sampleImage} />
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
