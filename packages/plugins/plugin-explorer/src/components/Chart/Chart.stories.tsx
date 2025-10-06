//
// Copyright 2023 DXOS.org
//

import { type Meta } from '@storybook/react-vite';
import React from 'react';

import { ClientRepeater } from '@dxos/react-client/testing';
import { withTheme } from '@dxos/react-ui/testing';

import CitiesData from '../../../data/cities.js';

import { Chart } from './Chart';

// TODO(burdon): Generate data with geo lat/lng.
// TODO(burdon): How to provide geo service via agent?

const Story = () => {
  if (!CitiesData) {
    return null;
  }

  const items = CitiesData.features.map((feature: any) => ({
    x: feature.geometry.coordinates[0],
    y: feature.geometry.coordinates[1],
  }));

  return <Chart items={items} accessor={(obj) => ({ x: obj.x, y: obj.y })} options={{ stroke: 'blue' }} />;
};

// TODO(burdon): Change to decorator.
export const Default = () => <ClientRepeater component={Story} />;

const meta = {
  title: 'plugins/plugin-explorer/Chart',
  component: Chart,
  decorators: [withTheme],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof Chart>;

export default meta;
