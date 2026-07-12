//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import { fn } from 'storybook/test';

import { withAttention } from '@dxos/react-ui-attention/testing';
import { withTheme } from '@dxos/react-ui/testing';

import { AttentionSigil, type AttentionSigilAction } from './AttentionSigil';

const sampleActions: AttentionSigilAction[][] = [
  [
    {
      id: 'edit',
      properties: {
        label: 'Edit',
        icon: 'ph--pencil--regular',
        keyBinding: { macos: 'Meta+E', windows: 'Ctrl+E', linux: 'Ctrl+E' },
      },
      data: () => Effect.void,
    },
    {
      id: 'share',
      properties: {
        label: 'Share',
        icon: 'ph--share--regular',
      },
      data: () => Effect.void,
    },
  ],
  [
    {
      id: 'delete',
      properties: {
        label: 'Delete',
        icon: 'ph--trash--regular',
      },
      data: () => Effect.void,
    },
  ],
];

const meta = {
  title: 'sdk/app-toolkit/components/AttentionSigil',
  component: AttentionSigil,
  decorators: [withTheme(), withAttention()],
  parameters: { layout: 'centered' },
  args: {
    icon: 'ph--file--regular',
    triggerLabel: 'Document actions',
    onAction: fn(),
  },
} satisfies Meta<typeof AttentionSigil>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    actions: sampleActions,
  },
};

export const IconOnly: Story = {
  args: {
    actions: undefined,
  },
};

export const Attended: Story = {
  decorators: [withAttention('document')],
  args: {
    attendableId: 'document',
    actions: sampleActions,
  },
};
