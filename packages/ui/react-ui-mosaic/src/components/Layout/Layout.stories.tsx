//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Scrollable } from '../Scrollable';

import { Layout } from './Layout';

// TODO(burdon): Scrollable (asChild); with standard padding.
// TODO(burdon): Statusbar (with density appropriate buttons).

const DefaultStory = () => {
  return (
    <Layout.Main toolbar statusbar>
      <Toolbar.Root>
        <Toolbar.IconButton icon='ph--plus--regular' label='Add' />
      </Toolbar.Root>
      <Scrollable>
        <Layout.Flex column classNames='p-1 gap-1'>
          {Array.from({ length: 100 }).map((_, index) => (
            <div key={index} className='border border-separator pli-2 plb-1'>
              {index}
            </div>
          ))}
        </Layout.Flex>
      </Scrollable>
      <Toolbar.Root classNames='justify-between'>
        <Toolbar.IconButton icon='ph--house--regular' iconOnly label='Add' size={3} />
        <Toolbar.IconButton icon='ph--circle--regular' iconOnly label='Status' size={3} />
      </Toolbar.Root>
    </Layout.Main>
  );
};

const meta: Meta<typeof DefaultStory> = {
  title: 'ui/react-ui-mosaic/Layout',
  component: DefaultStory,
  decorators: [withTheme, withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
