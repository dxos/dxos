//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React from 'react';

import { withFullscreen, withTheme } from '@dxos/storybook-utils';

import { SketchComponent } from './SketchComponent';

const Story = () => {
  return (
    <div className='flex flex-col grow overflow-hidden'>
      <div className='flex grow overflow-hidden'>
        <SketchComponent />
      </div>
    </div>
  );
};

export default {
  title: 'plugin-sketch/Excalidraw',
  component: SketchComponent,
  render: Story,
  decorators: [withTheme, withFullscreen()],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {};
