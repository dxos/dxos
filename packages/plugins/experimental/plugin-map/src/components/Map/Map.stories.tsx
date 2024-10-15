//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Map } from './Map';

const Story = (props: any) => {
  return (
    <Map.Root>
      <Map.Canvas />
      <Map.ActionControls />
      <Map.ZoomControls />
    </Map.Root>
  );
};

export default {
  title: 'plugin-map/Map',
  component: Map,
  decorators: [withTheme, withLayout({ fullscreen: true })],
  render: (...args: any[]) => <Story {...args} />,
};

export const Default = {};
