//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { surfaceDetail, surfaceProfilerStats } from '../testing/fixtures.ts';
import { SurfaceProfilerCard } from './SurfaceProfilerCard.tsx';

const meta = {
  title: 'devtools/devtools/cards/SurfaceProfilerCard',
  component: SurfaceProfilerCard,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
} satisfies Meta<typeof SurfaceProfilerCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { stats: surfaceProfilerStats, debug: false, onDebugChange: () => {}, onClear: () => {} },
};

export const Selected: Story = {
  args: {
    stats: surfaceProfilerStats,
    debug: true,
    onDebugChange: () => {},
    onClear: () => {},
    selected: 'org.dxos.role.article',
    onSelect: () => {},
    detail: surfaceDetail,
  },
};

export const Empty: Story = {};
