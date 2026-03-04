//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { useThemeContext } from '../../hooks';
import { withLayout, withTheme } from '../../testing';

import { ThemeProvider } from './ThemeProvider';

const meta = {
  title: 'ui/react-ui-core/components/ThemeProvider',
  component: ThemeProvider,
  render: () => {
    const { themeMode, platform } = useThemeContext();
    return (
      <div className='p-4 flex flex-col gap-4'>
        <h1>ThemeProvider</h1>
        <pre className='text-sm text-description'>{JSON.stringify({ themeMode, platform }, null, 2)}</pre>
      </div>
    );
  },
  decorators: [withTheme(), withLayout()],
} satisfies Meta<typeof ThemeProvider>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
