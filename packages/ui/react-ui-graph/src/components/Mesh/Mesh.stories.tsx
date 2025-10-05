//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';

import { withTheme } from '@dxos/storybook-utils';

import { SVG, type SVGRootProps } from '../SVG';

import { Mesh } from './Mesh';

// TODO(burdon): Create waves/game of life.
const DefaultStory = (props: SVGRootProps) => {
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
    <SVG.Root centered={false} {...props}>
      <Mesh radius={12} value={value / 100} />
    </SVG.Root>
  );
};

const meta = {
  title: 'ui/react-ui-graph/Mesh',
  render: DefaultStory,
  decorators: [withTheme],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    classNames: [
      '[&>.mesh]:fill-none',
      '[&>.hexagon>path.fill]:fill-blue-800 [&>.hexagon]:stroke-blue-700',
      '[&>.border]:fill-none [&>.border]:stroke-blue-500 [&>.border]:stroke-2',
    ],
  },
};

export const Outline: Story = {
  args: {
    classNames: ['[&>.mesh]:fill-none', '[&>.border]:fill-none [&>.border]:stroke-red-500 [&>.border]:stroke-2'],
  },
};
