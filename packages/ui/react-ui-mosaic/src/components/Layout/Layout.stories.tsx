//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Scrollable } from '../Scrollable';

import { Layout } from './Layout';

const DefaultStory = () => {
  return (
    <Layout.Main toolbar statusbar>
      <Toolbar.Root>
        <Toolbar.IconButton icon='ph--plus--regular' label='Add' />
      </Toolbar.Root>
      <Scrollable axis='vertical'>
        <Layout.Flex column role='list' classNames='pli-3 plb-1 gap-1'>
          {Array.from({ length: 100 }).map((_, index) => (
            <div key={index} role='listitem' className='border border-separator pli-2 plb-1'>
              {index}
            </div>
          ))}
        </Layout.Flex>
      </Scrollable>
      <Toolbar.Root classNames='justify-between'>
        <Toolbar.IconButton variant='ghost' icon='ph--house--regular' iconOnly label='Add' size={4} />
        <Toolbar.IconButton variant='ghost' icon='ph--alarm--regular' iconOnly label='Status' size={4} />
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
