//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { DXOS } from '@dxos/brand';
import { log } from '@dxos/log';
import { withTheme } from '@dxos/react-ui/testing';

import { Ghost, type GhostProps } from './Ghost';

const DefaultStory = (props: Partial<GhostProps>) => (
  <>
    <Ghost {...props} />
    <div className='inset-0 absolute grid place-content-center'>
      <DXOS className='w-[40rem] h-[40rem] opacity-5' />
    </div>
  </>
);

const meta = {
  title: 'ui/react-ui-sfx/Ghost',
  component: Ghost,
  render: DefaultStory,
  decorators: [withTheme],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<GhostProps>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async () => {
    log.info('started');
  },
  args: {},
};

export const Variant: Story = {
  args: {
    DENSITY_DISSIPATION: 3.5,
    VELOCITY_DISSIPATION: 2,
    PRESSURE: 0.1,
    PRESSURE_ITERATIONS: 20,
    CURL: 2,
    COLOR_UPDATE_SPEED: 0.3,
    COLOR_MASK: { r: 0.1, g: 0.1, b: 0.1 },
  },
};

export const Trace: Story = {
  args: {
    DENSITY_DISSIPATION: 1.5,
    VELOCITY_DISSIPATION: 20,
    SPLAT_RADIUS: 0.02,
    CURL: 3,
    COLOR_UPDATE_SPEED: 10,
  },
};

export const Fireball: Story = {
  args: {
    DENSITY_DISSIPATION: 1.5,
    VELOCITY_DISSIPATION: 20,
    CURL: 100,
    COLOR_UPDATE_SPEED: 0.1,
  },
};

export const Atomic: Story = {
  args: {
    DENSITY_DISSIPATION: 1.5,
    VELOCITY_DISSIPATION: 15,
    SPLAT_RADIUS: 5,
    CURL: 100,
    COLOR_UPDATE_SPEED: 0.1,
  },
};
