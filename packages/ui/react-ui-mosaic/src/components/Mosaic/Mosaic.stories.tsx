//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { type Obj } from '@dxos/echo';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Mosaic } from './Mosaic';

const DefaultStory = () => {
  const items = useMemo<Obj.Any[]>(() => [], []);

  return (
    <Mosaic.Root>
      <Mosaic.Container
        handler={{
          id: 'container',
          onDrop: () => {},
          onDrag: () => {},
          onCancel: () => {},
          canDrop: () => true,
        }}
      >
        {items.map((item) => (
          <Mosaic.Cell key={item.id} id={item.id} object={item} />
        ))}
      </Mosaic.Container>
    </Mosaic.Root>
  );
};

const meta = {
  title: 'ui/react-ui-mosaic/Mosaic',
  render: DefaultStory,
  decorators: [withTheme, withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
