//
// Copyright 2026 DXOS.org
//

import { type Meta } from '@storybook/react-vite';
import React, { CSSProperties, type PropsWithChildren } from 'react';

import { useIconHref } from '../hooks/index.ts';
import { withLayout, withTheme } from '../testing/index.ts';

// Issues
// - [ ] Sizes (check all make sense for all inputs)
// - [ ] Focus ring (clipping?)
// - [ ] Padding

type Metrics = {
  blockSize: string;
  lineHeight: string;
  fontSize: string;
  iconSize: string;
  gapSize: string;
};

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZES: Size[] = ['xs', 'sm', 'md', 'lg', 'xl'];

// Type sizes are the theme's own tokens (`md` is Tailwind's `base`), so the toolbar tracks the scale.
const metrics: Record<Size, Metrics> = {
  xs: {
    blockSize: '1.25rem',
    lineHeight: 'var(--text-xs--line-height)',
    fontSize: 'var(--text-xs)',
    iconSize: '0.75rem',
    gapSize: '0.25rem',
  },
  sm: {
    blockSize: '1.5rem',
    lineHeight: 'var(--text-sm--line-height)',
    fontSize: 'var(--text-sm)',
    iconSize: '1rem',
    gapSize: '0.25rem',
  },
  md: {
    blockSize: '2rem',
    lineHeight: 'var(--text-base--line-height)',
    fontSize: 'var(--text-base)',
    iconSize: '1.5rem',
    gapSize: '0.5rem',
  },
  lg: {
    blockSize: '2.5rem',
    lineHeight: 'var(--text-lg--line-height)',
    fontSize: 'var(--text-lg)',
    iconSize: '2rem',
    gapSize: '0.5rem',
  },
  xl: {
    blockSize: '3rem',
    lineHeight: 'var(--text-xl--line-height)',
    fontSize: 'var(--text-xl)',
    iconSize: '2.5rem',
    gapSize: '0.5rem',
  },
};

const Toolbar = ({ children, size = 'md' }: PropsWithChildren<{ size?: Size }>) => {
  const { blockSize, lineHeight, fontSize, iconSize, gapSize } = metrics[size];
  return (
    <div
      className='shrink-0 w-full flex items-center overflow-x-auto scrollbar-none'
      style={
        {
          '--block-size': blockSize,
          '--line-height': lineHeight,
          '--font-size': fontSize,
          '--icon-size': iconSize,
          '--gap-size': gapSize,
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
    <svg className='w-(--icon-size,1.5rem) h-(--icon-size,1.5rem)'>
      <use href={href} />
    </svg>
  );
};

const Input = () => {
  return (
    <input
      type='text'
      placeholder='Input'
      className={[
        'w-full px-(--gap-size) py-0',
        'text-[length:var(--font-size,1rem)] leading-(--line-height)',
        'bg-base-surface border-none dx-focus-ring-inset',
      ].join(' ')}
    />
  );
};

const Button = ({ children }: PropsWithChildren) => {
  return (
    <button
      className={[
        'w-fit px-(--gap-size) py-0',
        'text-[length:var(--font-size,1rem)] leading-(--line-height)',
        'bg-base-surface hover:bg-hover-surface border-none dx-focus-ring-inset',
      ].join(' ')}
    >
      {children}
    </button>
  );
};

const Typography = ({ children }: PropsWithChildren) => {
  return <span className='text-[length:var(--font-size,1rem)]'>{children}</span>;
};

const DefaultStory = () => {
  return (
    <div className='flex flex-col divide-y divide-separator'>
      <div className='grid grid-cols-[min-content_1fr] gap-1'>
        <div>
          <Block>
            <Icon icon='ph--circle--regular' />
          </Block>
        </div>
        <Typography>Lorem ipsum dolor sit amet</Typography>
      </div>

      <div className='grid grid-cols-[min-content_1fr] gap-1'>
        <div>
          <Block>
            <Icon icon='ph--circle--regular' />
          </Block>
        </div>
        <Typography>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore
          magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo
          consequat.
        </Typography>
      </div>

      <div>
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
      </div>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-core/playground/experimental',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'centered', classNames: 'w-[30rem]' })],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta;

export default meta;

export const Default = {};
