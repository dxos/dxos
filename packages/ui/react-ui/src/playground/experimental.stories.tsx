//
// Copyright 2026 DXOS.org
//

import { type Meta } from '@storybook/react-vite';
import React, { CSSProperties, type PropsWithChildren } from 'react';

import { useIconHref } from '../hooks/index.ts';
import { withLayout, withTheme } from '../testing/index.ts';

type Metrics = {
  fontSize: string;
  blockSize: string;
  lineHeight: string;
  iconSize: string;
};

type Size = 'xs' | 'sm' | 'md' | 'lg';

const SIZES: Size[] = ['xs', 'sm', 'md', 'lg'];

const metrics: Record<Size, Metrics> = {
  xs: {
    fontSize: '12px',
    blockSize: '20px',
    lineHeight: '20px',
    iconSize: '12px',
  },
  sm: {
    fontSize: '14px',
    blockSize: '24px',
    lineHeight: '24px',
    iconSize: '16px',
  },
  md: {
    fontSize: '16px',
    blockSize: '32px',
    lineHeight: '32px',
    iconSize: '24px',
  },
  lg: {
    fontSize: '18px',
    blockSize: '40px',
    lineHeight: '40px',
    iconSize: '32px',
  },
};

const Toolbar = ({ children, size = 'md' }: PropsWithChildren<{ size?: Size }>) => {
  const { fontSize, blockSize, lineHeight, iconSize } = metrics[size];
  return (
    <div
      className='shrink-0 w-full flex items-center overflow-x-auto scrollbar-none'
      style={
        {
          '--font-size': fontSize,
          '--block-size': blockSize,
          '--line-height': lineHeight,
          '--icon-size': iconSize,
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
};

const Block = ({ children }: PropsWithChildren) => {
  return <div className='shrink-0 grid place-items-center w-(--block-size) h-(--block-size)'>{children}</div>;
};

const Icon = ({ icon }: { icon: string }) => {
  const href = useIconHref(icon);
  return (
    <svg className='w-(--icon-size,24px) h-(--icon-size,24px)'>
      <use href={href} />
    </svg>
  );
};

const Input = () => {
  return (
    <input
      type='text'
      placeholder='Input'
      className='w-full bg-base-surface border-none outline-none ring-0 p-0 text-[length:var(--font-size,1rem)] leading-(--line-height)'
    />
  );
};

const Button = ({ children }: PropsWithChildren) => {
  return (
    <button className='w-fit bg-base-surface hover:bg-hover-surface border-none outline-none p-0 text-[length:var(--font-size,1rem)] leading-(--line-height)'>
      {children}
    </button>
  );
};

const Typography = ({ children }: PropsWithChildren) => {
  return <span className='text-[length:var(--font-size,1rem)]'>{children}</span>;
};

const DefaultStory = () => {
  return (
    <div className='flex flex-col gap-2'>
      {SIZES.map((size) => (
        <Toolbar key={size} size={size}>
          <Block>
            <Icon icon='ph--circle--regular' />
          </Block>
          <Input />
          <Button>Save</Button>
          <Block>
            <Icon icon='ph--circle--regular' />
          </Block>
        </Toolbar>
      ))}

      <div className='flex'>
        <Block>
          <Icon icon='ph--circle--regular' />
        </Block>
        <Typography>Hello world</Typography>
      </div>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-core/playground/experimental',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'centered', classNames: 'w-[300px]' })],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta;

export default meta;

export const Default = {};
