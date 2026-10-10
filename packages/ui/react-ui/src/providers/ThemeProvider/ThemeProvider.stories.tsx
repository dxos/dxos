//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { useThemeContext } from '../../hooks/useThemeContext.ts';
import { withLayout, withTheme } from '../../testing/index.ts';
import * as Theme from './Theme.tsx';

const meta = {
  title: 'ui/react-ui-core/providers/ThemeProvider',
  component: Theme.Provider,
  render: () => {
    const { themeMode, platform } = useThemeContext();
    return (
      <div className='p-4 flex flex-col gap-4'>
        <h1>ThemeProvider</h1>
        <pre className='text-sm text-fg-muted'>{JSON.stringify({ themeMode, platform }, null, 2)}</pre>
      </div>
    );
  },
  decorators: [withTheme(), withLayout()],
} satisfies Meta<typeof Theme.Provider>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
