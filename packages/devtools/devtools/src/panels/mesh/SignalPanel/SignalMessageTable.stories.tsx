//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withClientProvider } from '@dxos/react-client/testing';

import { SignalMessageTable } from './SignalMessageTable';

const meta = {
  title: 'devtools/devtools/SignalMessageTable',
  component: SignalMessageTable,
  decorators: [withClientProvider()],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof SignalMessageTable>;

export default meta;

type Story = StoryObj<typeof SignalMessageTable>;

export const Default: Story = {};
