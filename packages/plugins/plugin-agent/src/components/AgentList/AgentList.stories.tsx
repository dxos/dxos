//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { AgentList, type AgentListEntry } from './AgentList.tsx';

const agents: AgentListEntry[] = [
  {
    spaceId: 'B3VRDXJYFXQYMTVUGFUKHNHZ2ZHGMS4A',
    name: 'Kai',
    identityKey: '6f8c2d7e1b3a4c5d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d',
    admins: [
      { identityKey: '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b', name: 'Alice', you: true },
      { identityKey: '9f8e7d6c5b4a39281706f5e4d3c2b1a09f8e7d6c5b4a39281706f5e4d3c2b1a0', name: 'Bob' },
    ],
  },
  {
    spaceId: 'BZ6VJ3NUWL2Q4MKC7RPX5TYD4HGFA2SE',
    name: 'Scout',
    identityKey: 'c0ffee00c0ffee00c0ffee00c0ffee00c0ffee00c0ffee00c0ffee00c0ffee00',
    admins: [
      { identityKey: '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b', name: 'Alice', you: true },
    ],
  },
];

const meta = {
  title: 'plugins/plugin-agent/components/AgentList',
  component: AgentList,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof AgentList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { agents },
};

export const Empty: Story = {
  args: { agents: [] },
};
