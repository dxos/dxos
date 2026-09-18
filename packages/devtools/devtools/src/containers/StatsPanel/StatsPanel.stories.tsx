//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import {
  DatabaseCard,
  EdgeCard,
  MemoryCard,
  NetworkCard,
  PerformanceCard,
  QueriesCard,
  ReplicatorCard,
  ReplicatorMessagesCard,
  SurfaceProfilerCard,
  SwarmTraceCard,
  SyncCard,
} from '../cards/index.ts';
import * as fixtures from '../cards/testing/fixtures.ts';
import { StatsPanel } from './StatsPanel.tsx';

const DefaultStory = () => (
  <StatsPanel onRefresh={() => {}}>
    <MemoryCard memory={fixtures.memory} />
    <NetworkCard network={fixtures.network} />
    <EdgeCard edge={fixtures.edgeSocket} status={fixtures.edgeStatus} onRefresh={() => {}} onCopy={() => {}} />
    <PerformanceCard entries={fixtures.performanceEntries} />
    <SwarmTraceCard messages={fixtures.traceMessages} spaceCount={2} onClear={() => {}} />
    <SurfaceProfilerCard stats={fixtures.surfaceProfilerStats} onClear={() => {}} />
    <DatabaseCard database={fixtures.database} />
    <ReplicatorCard database={fixtures.database} />
    <ReplicatorMessagesCard database={fixtures.database} />
    <QueriesCard queries={fixtures.queries} />
    <SyncCard spaces={fixtures.syncRows} onCopy={() => {}} />
  </StatsPanel>
);

const meta = {
  title: 'devtools/devtools/StatsPanel',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column', classNames: 'w-[25rem]' })],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
