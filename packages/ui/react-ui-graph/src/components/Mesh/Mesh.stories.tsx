//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { type SVGRootProps, SVG } from '../SVG';
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
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

// Selectors use the descendant combinator (`[&_X]`) — the mesh / hexagon / border elements
// live inside the SVG inside the div, so direct-child (`>`) selectors don't match.
export const Default: Story = {
  args: {
    classNames: [
      '[&_.mesh]:fill-none',
      '[&_.hexagon>path.fill]:fill-blue-800 [&_.hexagon]:stroke-blue-700',
      '[&_.border]:fill-none [&_.border]:stroke-blue-500 [&_.border]:stroke-2',
    ],
  },
};

export const Outline: Story = {
  args: {
    classNames: ['[&_.mesh]:fill-none', '[&_.border]:fill-none [&_.border]:stroke-red-500 [&_.border]:stroke-2'],
  },
};
