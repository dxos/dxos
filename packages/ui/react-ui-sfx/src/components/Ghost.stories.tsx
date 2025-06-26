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
  args: {
    SIM_RESOLUTION: 128,
    DYE_RESOLUTION: 1440,
    CAPTURE_RESOLUTION: 512,
    DENSITY_DISSIPATION: 3.5,
    VELOCITY_DISSIPATION: 2,
    PRESSURE: 0.1,
    PRESSURE_ITERATIONS: 20,
    CURL: 3,
    SPLAT_RADIUS: 0.2,
    SPLAT_FORCE: 6000,
    SHADING: false,
    COLOR_UPDATE_SPEED: 10,
    BACK_COLOR: { r: 0.3, g: 0.1, b: 0.1 },
    TRANSPARENT: false,
  },
};
