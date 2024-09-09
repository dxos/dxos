//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { mx } from '@dxos/react-ui-theme';
import { withFullscreen, withTheme } from '@dxos/storybook-utils';

import { Mesh } from './Mesh';

// TODO(burdon): Create waves/game of life.
const Story = () => {
  return (
    <Mesh.Root>
      <Mesh.SVG
        className={mx(
          '[&>.mesh]:fill-none',
          '[&>.hexagon>path.fill]:fill-green-500 [&>.hexagon]:stroke-[#002200]',
          '[&>.border]:fill-none [&>.border]:stroke-red-500 [&>.border]:stroke-2',
        )}
      />
      <Mesh.Hex radius={12} />
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
