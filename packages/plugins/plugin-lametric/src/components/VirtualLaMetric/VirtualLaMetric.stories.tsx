//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { type MetricSpec } from '@dxos/plugin-space/dashboard';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { toFrames } from '#render';

import { VirtualLaMetric } from './VirtualLaMetric.tsx';

const stats: MetricSpec[] = [
  { kind: 'stat', title: 'Objects', value: '128' },
  { kind: 'stat', title: 'Feeds', value: '3' },
  { kind: 'stat', title: 'Types', value: '9' },
  { kind: 'stat', title: 'Plugins', value: '21' },
];

const progress: MetricSpec[] = [{ kind: 'progress', title: 'Syncing mailbox', ratio: 0.42, detail: '42/100' }];

const indeterminate: MetricSpec[] = [{ kind: 'progress', title: 'Indexing', detail: '128' }];

const overflowing: MetricSpec[] = [{ kind: 'stat', title: 'Unindexed attachments', value: '1284' }];

type StoryProps = { metrics?: (MetricSpec | null)[] };

// Frames are built through the same `toFrames` the driver uses, so the story shows exactly what the
// device is sent rather than a hand-written approximation of it.
const DefaultStory = ({ metrics = stats }: StoryProps) => <VirtualLaMetric frames={toFrames(metrics)} />;

const meta = {
  title: 'plugins/plugin-lametric/VirtualLaMetric',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'centered' })],
  parameters: { translations: [] },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Progress: Story = { args: { metrics: progress } };

export const Indeterminate: Story = { args: { metrics: indeterminate } };

/** Wider than the 37-pixel matrix, so the device scrolls it; the replica scrolls it too. */
export const Scrolling: Story = { args: { metrics: overflowing } };

export const Empty: Story = { args: { metrics: [null, null] } };
