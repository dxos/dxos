//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { type DialSpec, type KeySpec } from '#model';
import { Protocol } from '#protocol';

import { VirtualStreamDeck } from './VirtualStreamDeck';

const device = Protocol.streamDeckPlus;

const keys: (KeySpec | null)[] = [
  { target: 'eid:1', label: 'Inbox', icon: 'ph--tray--regular', hue: 'cyan' },
  { target: 'eid:2', label: 'Weekly team notes', icon: 'ph--note--regular', hue: 'amber' },
  { target: 'eid:3', label: 'Roadmap', icon: 'ph--kanban--regular', hue: 'emerald' },
  { target: 'eid:4', label: 'Contacts', icon: 'ph--address-book--regular', hue: 'violet' },
  { target: 'eid:5', label: 'Sketch', icon: 'ph--compass-tool--regular', hue: 'rose' },
  { target: 'eid:6', label: 'Assistant', icon: 'ph--sparkle--regular' },
  null,
  null,
];

const stats: DialSpec[] = [
  { kind: 'stat', title: 'Objects', value: '128' },
  { kind: 'stat', title: 'Feeds', value: '3' },
  { kind: 'stat', title: 'Types', value: '9' },
  { kind: 'stat', title: 'Plugins', value: '21' },
];

const progress: (DialSpec | null)[] = [
  { kind: 'progress', title: 'Syncing mailbox', ratio: 0.42, detail: '42/100' },
  { kind: 'progress', title: 'Indexing' },
  null,
  null,
];

const meta = {
  title: 'plugins/plugin-stream-deck/VirtualStreamDeck',
  component: VirtualStreamDeck,
  decorators: [withTheme(), withLayout({ layout: 'centered' })],
  parameters: { translations: [] },
} satisfies Meta<typeof VirtualStreamDeck>;

export default meta;

type Story = StoryObj<typeof VirtualStreamDeck>;

export const Default: Story = {
  args: { device, keys, dials: stats },
};

export const Progress: Story = {
  args: { device, keys, dials: progress },
};

export const Empty: Story = {
  args: { device, keys: Array.from({ length: device.keys }, () => null), dials: [null, null, null, null] },
};
