//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React, { useState } from 'react';

import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Map, type MapController } from './Map';
import { useMapZoomHandler } from '../../hooks';

const Render = () => {
  const [controller, setController] = useState<MapController>();
  const handleZoomAction = useMapZoomHandler(controller);

  return (
    <Map.Root>
      <Map.Canvas ref={setController} />
      <Map.Zoom position='bottomleft' onAction={handleZoomAction} />
      <Map.Action position='bottomright' />
    </Map.Root>
  );
};

const meta: Meta = {
  title: 'ui/react-ui-geo/Map',
  component: Map.Root,
  render: Render,
  decorators: [withTheme, withLayout({ fullscreen: true, tooltips: true })],
};

export default meta;

type Story = StoryObj;

export const Default: Story = {};
