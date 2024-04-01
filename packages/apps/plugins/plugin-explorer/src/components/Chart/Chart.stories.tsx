//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import * as Plot from '@observablehq/plot';
import React, { useEffect, useState } from 'react';

import { types } from '@braneframe/types/proto';
import { ClientRepeater, FullscreenDecorator } from '@dxos/react-client/testing';

import { Chart } from './Chart';

// TODO(burdon): Generate data with geo lat/lng.
// TODO(burdon): How to provide geo service via agent?

export default {
  title: 'plugin-explorer/Chart',
  component: Plot,
  decorators: [FullscreenDecorator()],
};

export const Default = () => <ClientRepeater component={DefaultStory} types={types} />;
const DefaultStory = () => {
  const [data, setData] = useState<{ cities: any }>();
  useEffect(() => {
    setTimeout(async () => {
      const cities = await (await fetch('/cities.json')).json();
      setData({
        cities,
      });
    });
  }, []);

  if (!data) {
    return null;
  }

  const cities = data.cities.features.map((feature: any) => ({
    x: feature.geometry.coordinates[0],
    y: feature.geometry.coordinates[1],
  }));

  return <Chart items={cities} accessor={(obj) => ({ x: obj.x, y: obj.y })} options={{ stroke: 'blue' }} />;
};
