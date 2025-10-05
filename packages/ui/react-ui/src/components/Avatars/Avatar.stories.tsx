//
// Copyright 2022 DXOS.org
//

import { type Meta } from '@storybook/react-vite';
import React, { type PropsWithChildren } from 'react';

import { type HuePalette } from '@dxos/react-ui-theme';
import { type Size } from '@dxos/react-ui-types';
import { withTheme } from '@dxos/storybook-utils';
import { hexToFallback } from '@dxos/util';

import { Avatar, type AvatarAnimation, type AvatarStatus, type AvatarVariant } from './Avatar';

type StoryProps = PropsWithChildren<{
  id?: string;
  imgSrc?: string;
  fallbackText?: string;
  label?: string;
  description?: string;
  status?: AvatarStatus;
  variant?: AvatarVariant;
  animation?: AvatarAnimation;
  size?: Size;
  hue?: HuePalette;
}>;

const DefaultStory = (props: StoryProps) => {
  const {
    id = '20970b563fc49b5bb194a6ffdff376031a3a11f9481360c071c3fed87874106b',
    status,
    size = 12,
    variant = 'circle',
    label = 'Alice',
    description = 'Online',
    fallbackText = '',
    animation,
    imgSrc,
  } = props;
  const { emoji, hue } = hexToFallback(id);
  return (
    <div className='flex flex-row gap-3 align-middle items-center'>
      <Avatar.Root>
        <Avatar.Content
          {...{ size, variant, status, animation, imgSrc, hue: props.hue || hue, fallback: fallbackText || emoji }}
        />
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

const meta = {
  title: 'ui/react-ui-core/Avatar',
  component: Avatar.Root,
  decorators: [withTheme],
} satisfies Meta<typeof Avatar.Root>;

export default meta;

const sampleImage =
  'https://png.pngtree.com/thumb_back/fh260/background/20230614/pngtree-the-photo-of-a-woman-with-red-sunglasses-is-surrounded-by-image_2931163.jpg';

const brokenImage = 'https://png.pngtree.com/potato_squirrel.png';

const row = (size: Size) => (
  <>
    <DefaultStory size={size} status='inactive' description='Offline' />
    <DefaultStory size={size} status='active' />
    <DefaultStory size={size} status='active' imgSrc={sampleImage} />
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
    <DefaultStory variant='circle' imgSrc={sampleImage} />
  </div>
);

export const BrokenImage = () => (
  <div>
    <DefaultStory variant='circle' imgSrc={brokenImage} />
  </div>
);

export const Square = () => (
  <div className='flex flex-row gap-4'>
    <DefaultStory variant='square' status='inactive' description='Offline' />
    <DefaultStory variant='square' status='active' />
    <DefaultStory variant='square' status='error' />
    <DefaultStory variant='square' status='warning' />
  </div>
);

export const DefaultEmoji = () => (
  <div className='flex flex-row gap-4'>
    <DefaultStory fallbackText='🦄' status='active' animation='pulse' />
    <DefaultStory fallbackText='🐒' status='warning' animation='pulse' />
    <DefaultStory fallbackText='🪲' status='inactive' />
    <DefaultStory fallbackText='🦁' />
  </div>
);

export const SquareEmoji = () => <DefaultStory variant='square' fallbackText='🦄' />;

export const DefaultText = () => (
  <div className='flex flex-row gap-4'>
    <DefaultStory fallbackText='PT' />
    <DefaultStory fallbackText='AP' />
    <DefaultStory fallbackText='Z' />
    <DefaultStory fallbackText='pt' />
    <DefaultStory fallbackText='ap' />
    <DefaultStory fallbackText='z' />
  </div>
);

export const Error = () => <DefaultStory status='error' description='Errored' />;

export const Pulse = () => (
  <div className='flex flex-row gap-4'>
    <DefaultStory description='Online' status='active' animation='pulse' />
    <DefaultStory description='Offline' status='inactive' animation='pulse' />
    <DefaultStory description='Error' status='error' animation='pulse' />
    <DefaultStory description='Warning' status='warning' animation='pulse' />
  </div>
);
