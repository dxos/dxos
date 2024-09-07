//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { mx } from '@dxos/react-ui-theme';
import { withFullscreen, withTheme } from '@dxos/storybook-utils';

import { Mesh } from './Mesh';

const Story = () => {
  return (
    <Mesh.Root>
      <Mesh.SVG
        className={mx('[&>.hexagon]:stroke-green-500/10 [&>.hexagon>path.fill]:fill-green-500/50 [&>.mesh]:fill-none')}
      />
      <Mesh.Hex />
    </Mesh.Root>
  );
};

export default {
  title: 'gem-core/Mesh',
  component: Mesh,
  render: () => <Story />,
  decorators: [withTheme, withFullscreen({ classNames: 'bg-[#111]' })],
};

export const Default = {};
