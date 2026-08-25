//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { type MetricSpec, type Shortcut } from '@dxos/plugin-space/dashboard';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import * as Protocol from '#protocol';
import { useFrame } from '#render';

import { VirtualStreamDeck } from './VirtualStreamDeck';

const device = Protocol.streamDeckPlus;

const keys: (Shortcut | null)[] = [
  { target: 'eid:1', label: 'Inbox', icon: 'ph--tray--regular', hue: 'cyan' },
  { target: 'eid:2', label: 'Weekly team notes', icon: 'ph--note--regular', hue: 'amber' },
  { target: 'eid:3', label: 'Roadmap', icon: 'ph--kanban--regular', hue: 'emerald' },
  { target: 'eid:4', label: 'Contacts', icon: 'ph--address-book--regular', hue: 'violet' },
  { target: 'eid:5', label: 'Sketch', icon: 'ph--compass-tool--regular', hue: 'rose' },
  { target: 'eid:6', label: 'Assistant', icon: 'ph--sparkle--regular' },
  null,
  null,
];

const stats: MetricSpec[] = [
  { kind: 'stat', title: 'Objects', value: '128' },
  { kind: 'stat', title: 'Feeds', value: '3' },
  { kind: 'stat', title: 'Types', value: '9' },
  { kind: 'stat', title: 'Plugins', value: '21' },
];

const progress: (MetricSpec | null)[] = [
  { kind: 'progress', title: 'Syncing mailbox', ratio: 0.42, detail: '42/100' },
  { kind: 'progress', title: 'Indexing' },
  null,
  null,
];

type StoryProps = {
  keys?: (Shortcut | null)[];
  dials?: (MetricSpec | null)[];
};

// The frame is built inside the story so it goes through the same `useFrame` the app uses, icons and
// all — the point of this component is that it shows exactly what the device is sent.
const DefaultStory = ({ keys: keySpecs = keys, dials = stats }: StoryProps) => {
  const frame = useFrame({ device, keys: keySpecs, dials });
  return <VirtualStreamDeck device={device} frame={frame} />;
};

const meta = {
  title: 'plugins/plugin-stream-deck/VirtualStreamDeck',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'centered' })],
  parameters: { translations: [] },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Progress: Story = { args: { dials: progress } };

export const Empty: Story = {
  args: { keys: Array.from({ length: device.keys }, () => null), dials: [null, null, null, null] },
};
