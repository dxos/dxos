//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { withTheme } from '../../testing';
import { Slider } from './Slider';

const meta = {
  title: 'ui/react-ui-core/components/Slider',
  component: Slider,
  decorators: [withTheme()],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof Slider>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className='w-64'>
      <Slider defaultValue={[50]} max={100} step={1} thumbLabels={['Value']} />
    </div>
  ),
};

export const Controlled: Story = {
  render: () => {
    const ControlledSlider = () => {
      const [value, setValue] = useState([25]);
      return (
        <div className='flex flex-col gap-2 w-64'>
          <Slider value={value} onValueChange={setValue} max={100} step={1} />
          <div className='text-sm text-description'>{value[0]}</div>
        </div>
      );
    };
    return <ControlledSlider />;
  },
};

export const MinMaxStep: Story = {
  render: () => (
    <div className='w-64'>
      <Slider defaultValue={[0.4]} min={0.2} max={0.7} step={0.01} />
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className='w-64'>
      <Slider defaultValue={[50]} max={100} step={1} disabled />
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div className='h-64'>
      <Slider defaultValue={[50]} max={100} step={1} orientation='vertical' />
    </div>
  ),
};

export const Range: Story = {
  render: () => (
    <div className='w-64'>
      <Slider defaultValue={[25, 75]} max={100} step={1} thumbLabels={['Minimum', 'Maximum']} />
    </div>
  ),
};

/**
 * Regression guard for the thumb-visibility bug (an invalid `is-*`/`bs-*` size utility collapsed
 * the thumb to zero size). Exercises default/disabled/vertical/two-thumb side by side so a visual
 * pass catches a missing knob in any state at a glance.
 */
export const ThumbVisibility: Story = {
  render: () => (
    <div className='flex items-start gap-8'>
      <div className='flex flex-col gap-2 w-48'>
        <span className='text-sm text-description'>Default</span>
        <Slider defaultValue={[50]} max={100} step={1} />
      </div>
      <div className='flex flex-col gap-2 w-48'>
        <span className='text-sm text-description'>Disabled</span>
        <Slider defaultValue={[50]} max={100} step={1} disabled />
      </div>
      <div className='flex flex-col gap-2 w-48'>
        <span className='text-sm text-description'>Two-thumb</span>
        <Slider defaultValue={[25, 75]} max={100} step={1} />
      </div>
      <div className='flex flex-col gap-2 items-center'>
        <span className='text-sm text-description'>Vertical</span>
        <div className='h-48'>
          <Slider defaultValue={[50]} max={100} step={1} orientation='vertical' />
        </div>
      </div>
    </div>
  ),
};
