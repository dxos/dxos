//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import type { StoryObj } from '@storybook/react';

import { withClientProvider } from '@dxos/react-client/testing';
import { Meta, withTheme } from '@dxos/storybook-utils';

import { SignalMessageTable } from './SignalMessageTable';

const meta: Meta<typeof SignalMessageTable> = {
  title: 'devtools/devtools/SignalMessageTable',
  component: SignalMessageTable,
  decorators: [withClientProvider(),withTheme],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof SignalMessageTable>;

export const Default: Story = {};
