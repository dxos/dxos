//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { hues } from './tokens';

const Swatch = ({ hue }: { hue: string }) => (
  <div className='shrink-0 flex flex-col rounded-sm overflow-hidden'>
    <div className='aspect-video w-24' style={{ background: `var(--dx-${hue}Fill)` }} />
    <span className='text-xs bg-baseSurface px-2 py-1'>{hue}</span>
  </div>
);

const DefaultStory = () => (
  <div className='p-4'>
    <h1 className='text-lg mb-4'>Color tokens</h1>
    <div className='flex flex-wrap gap-2'>
      {hues.map((hue) => (
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
        <div className='p-test text-test border border-separator rounded-md'>Experimental</div>
      </div>
    );
  },
};
