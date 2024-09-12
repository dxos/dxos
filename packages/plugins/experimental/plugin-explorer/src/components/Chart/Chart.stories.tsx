//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import * as Plot from '@observablehq/plot';
import React from 'react';

import { ClientRepeater } from '@dxos/react-client/testing';
import { withFullscreen, withTheme } from '@dxos/storybook-utils';

import { Chart } from './Chart';
import CitiesData from '../../../data/cities.js';

// @ts-ignore

// TODO(burdon): Generate data with geo lat/lng.
// TODO(burdon): How to provide geo service via agent?

export default {
  title: 'plugin-explorer/Chart',
  component: Plot,
  decorators: [withTheme, withFullscreen()],
};

export const Default = () => <ClientRepeater component={DefaultStory} />;
const DefaultStory = () => {
  if (!CitiesData) {
    return null;
  }

  const items = CitiesData.features.map((feature: any) => ({
    x: feature.geometry.coordinates[0],
    y: feature.geometry.coordinates[1],
  }));

  return <Chart items={items} accessor={(obj) => ({ x: obj.x, y: obj.y })} options={{ stroke: 'blue' }} />;
};
