//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withTheme } from '../../testing';

import { Container } from './Container';

const DefaultStory = () => (
  <Container asChild>
    <div className='grid place-items-center border border-red-500'>Hello</div>
  </Container>
);

const meta: Meta = {
  title: 'ui/react-ui-core/primitives/Container',
  component: Container,
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
