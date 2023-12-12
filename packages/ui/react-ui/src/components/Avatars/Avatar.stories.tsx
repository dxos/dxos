//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';

import React, { type PropsWithChildren } from 'react';

import { getColorForValue } from '@dxos/react-ui-theme';
import { type Size } from '@dxos/react-ui-types';

import { Avatar, useJdenticonHref, type AvatarVariant, type AvatarStatus, type AvatarAnimation } from './Avatar';
import { withTheme } from '../../testing';

const randomColor = () => getColorForValue({ value: Math.random().toString(16), type: 'color' });

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
    <div className='flex flex-row gap-3 align-middle items-center'>
      <Avatar.Root {...{ size, variant, status, animation, color }}>
        <Avatar.Frame>
          {!imgSrc && (fallbackValue || fallbackText) && (
            <Avatar.Fallback href={fallbackValue ? jdenticon : ''} text={fallbackText} />
          )}
          {imgSrc && <Avatar.Image href={imgSrc} />}
        </Avatar.Frame>
        <div>
          <Avatar.Label classNames='block'>{label}</Avatar.Label>
          <Avatar.Description classNames='block'>
            {description} ({size})
          </Avatar.Description>
        </div>
      </Avatar.Root>
    </div>
  );
};

export default {
  component: StorybookAvatar,
  decorators: [withTheme],
};

const sampleImage =
  'https://png.pngtree.com/thumb_back/fh260/background/20230614/pngtree-the-photo-of-a-woman-with-red-sunglasses-is-surrounded-by-image_2931163.jpg';

const row = (size: Size) => (
  <>
    <StorybookAvatar size={size} description='Offline' color={''} />
    <StorybookAvatar size={size} status='active' />
    <StorybookAvatar size={size} status='active' imgSrc={sampleImage} />
  </>
);

export const Default = () => (
  <div className='grid grid-cols-3 gap-6 p-[4rem] min-h-screen bg-cubes'>
    {row(28)}
    {row(20)}
    {row(16)}
    {row(12)}
    {row(10)}
    {row(8)}
    {row(6)}
    {row(5)}
    {row(4)}
    {row(3)}
    {row(2)}
    {row(1)}
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
