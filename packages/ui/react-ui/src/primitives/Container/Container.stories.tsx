//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Container } from './Container';

const meta: Meta<typeof Container> = {
  title: 'ui/react-ui-core/primitives/Container',
  component: Container,
  decorators: [withTheme, withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i}>Item {i}</div>
        ))}
      </>
    ),
  },
};
