//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { mx } from '@dxos/react-ui-theme';
import { type Meta, withLayout, withTheme } from '@dxos/storybook-utils';

import { Mesh } from './Mesh';

// TODO(burdon): Create waves/game of life.
const DefaultStory = () => {
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

const meta: Meta<typeof Mesh.Root> = {
  title: 'ui/react-ui-graph/Mesh',
  component: Mesh.Root,
  render: DefaultStory,
  decorators: [withTheme, withLayout({ fullscreen: true, classNames: 'bg-[#111]' })],
};

export default meta;

export const Default = {};
