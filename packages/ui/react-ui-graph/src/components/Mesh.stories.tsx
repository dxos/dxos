//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React, { useEffect, useState } from 'react';

import { type Meta, withLayout, withTheme } from '@dxos/storybook-utils';

import { Mesh } from './Mesh';
import { type SVGProps } from './SVG';

// TODO(burdon): Create waves/game of life.
const DefaultStory = (props: SVGProps) => {
  const [value, setValue] = useState(1);
  useEffect(() => {
    const i = setInterval(() => {
      setValue((value) => {
        if (value === 50) {
          clearInterval(i);
        }

        return value + 1;
      });
    }, 500);
    return () => clearInterval(i);
  }, []);

  return (
    <Mesh.Root>
      <Mesh.SVG {...props} />
      <Mesh.Hex radius={12} value={value / 100} />
    </Mesh.Root>
  );
};

const meta: Meta<typeof Mesh.Root> = {
  title: 'ui/react-ui-graph/Mesh',
  component: Mesh.Root,
  render: DefaultStory,
  decorators: [withTheme, withLayout({ fullscreen: true })],
};

export default meta;

export const Default = {
  args: {
    classNames: [
      //
      '[&>.mesh]:fill-none',
      '[&>.hexagon>path.fill]:fill-blue-800 [&>.hexagon]:stroke-blue-700',
      '[&>.border]:fill-none [&>.border]:stroke-blue-500 [&>.border]:stroke-2',
    ],
  },
};

export const Outline = {
  args: {
    classNames: [
      //
      '[&>.mesh]:fill-none',
      '[&>.border]:fill-none [&>.border]:stroke-red-500 [&>.border]:stroke-2',
    ],
  },
};
