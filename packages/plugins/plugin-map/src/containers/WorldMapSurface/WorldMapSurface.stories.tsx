//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { timezones } from '@dxos/react-ui-geo/data';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { WorldMapSurface } from './WorldMapSurface.tsx';

const meta = {
  title: 'plugins/plugin-map/containers/WorldMapSurface',
  component: WorldMapSurface,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    view: { control: 'inline-radio', options: ['map', 'globe'] },
  },
} satisfies Meta<typeof WorldMapSurface>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    view: 'map',
    markers: ['Europe/London', 'Asia/Tokyo'].map((zone) => ({ id: zone, title: zone, location: timezones[zone] })),
  },
};
