//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import CitiesData from '../../../data/cities.js';
import { Chart } from './Chart';

const items = CitiesData.features.map((feature: any) => ({
  x: feature.geometry.coordinates[0],
  y: feature.geometry.coordinates[1],
}));

const DefaultStory = () => (
  <Chart items={items} accessor={(obj) => ({ x: obj.x, y: obj.y })} options={{ stroke: 'blue' }} />
);

const meta = {
  title: 'plugins/plugin-explorer/components/Chart',
  component: Chart,
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof Chart>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
