//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { hues } from './tokens';

const Swatch = ({ hue }: { hue: string }) => (
  <div
    className='shrink-0 aspect-square w-24 flex flex-col overflow-hidden border rounded-sm'
    style={{
      background: `var(--color-${hue}-surface)`,
      borderColor: `var(--color-${hue}-fill)`,
    }}
  >
    <span
      className='text-sm p-2'
      style={{
        color: `var(--color-${hue}-surface-text)`,
      }}
    >
      {hue}
    </span>
  </div>
);

const DefaultStory = () => (
  <div className='p-4'>
    <h1 className='text-lg mb-4'>Color tokens</h1>
    <div className='flex flex-wrap gap-2'>
      {['neutral', ...hues].map((hue) => (
        <Swatch key={hue} hue={hue} />
      ))}
    </div>
  </div>
);

const meta = {
  title: 'ui/ui-theme/Tokens',
  render: DefaultStory,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Experimental = {
  render: () => {
    return (
      <div className='absolute inset-0 grid place-items-center'>
        <div className='border border-separator rounded-md'>
          <div className='flex items-center font-mono p-test-experimental text-2xl text-test-experimental'>
            <span>experimental</span>
            <span className='animate-blink text-[var(--color-red-950)]'>!</span>
          </div>
        </div>
      </div>
    );
  },
};
