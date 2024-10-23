//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import React from 'react';

import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Map } from './Map';

const Story = () => {
  return (
    <Map.Root>
      <Map.Canvas />
      <Map.ActionControls />
      <Map.ZoomControls />
    </Map.Root>
  );
};

export const Default = {};

const meta: Meta = {
  title: 'plugins/plugin-map/Map',
  component: Map.Root,
  render: Story,
  decorators: [withTheme, withLayout({ fullscreen: true })],
};

export default meta;
