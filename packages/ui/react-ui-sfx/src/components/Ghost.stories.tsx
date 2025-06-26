//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import type { Meta, StoryObj } from '@storybook/react';

import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Ghost, type GhostProps } from './Ghost';

const meta: Meta<GhostProps> = {
  title: 'ui/react-ui-sfx/Ghost',
  component: Ghost,
  decorators: [withTheme, withLayout({ fullscreen: true })],
};

export default meta;

type Story = StoryObj<GhostProps>;

export const Default: Story = {
  args: {},
};

export const Variant: Story = {
  args: {
    SIM_RESOLUTION: 128,
    DYE_RESOLUTION: 1440,
    CAPTURE_RESOLUTION: 512,
    DENSITY_DISSIPATION: 3.5,
    VELOCITY_DISSIPATION: 2,
    PRESSURE: 0.1,
    PRESSURE_ITERATIONS: 20,
    CURL: 2,
    SPLAT_RADIUS: 0.1,
    SPLAT_FORCE: 9000,
    SHADING: true,
    COLOR_UPDATE_SPEED: 10,
    BACK_COLOR: { r: 1.3, g: 0.1, b: 0.1 },
    TRANSPARENT: false,
  },
};

export const Trace: Story = {
  args: {
    SIM_RESOLUTION: 128,
    DYE_RESOLUTION: 1440,
    CAPTURE_RESOLUTION: 512,
    DENSITY_DISSIPATION: 1.5,
    VELOCITY_DISSIPATION: 20,
    PRESSURE: 0.1,
    PRESSURE_ITERATIONS: 20,
    CURL: 3,
    SPLAT_RADIUS: 0.1,
    SPLAT_FORCE: 6000,
    SHADING: true,
    COLOR_UPDATE_SPEED: 10,
    BACK_COLOR: { r: 1.3, g: 0.1, b: 0.1 },
    TRANSPARENT: false,
  },
};
