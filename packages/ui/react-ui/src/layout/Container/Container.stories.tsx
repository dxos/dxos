//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withTheme } from '../../testing/index.ts';
import * as Container from './Container.tsx';

const DefaultStory = () => (
  <Container.Root asChild>
    <div className='grid place-items-center border border-red-500'>Hello</div>
  </Container.Root>
);

const meta: Meta = {
  title: 'ui/react-ui-core/layout/Container',
  component: Container.Root,
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
