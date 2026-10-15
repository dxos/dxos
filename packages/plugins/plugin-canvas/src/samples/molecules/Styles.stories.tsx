//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { THEME_IDS } from '@dxos/react-ui-canvas/scene';
import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';

import { DataFlowView, type DataFlowViewProps } from './DataFlowView.tsx';
import { type DataFlowSpec } from './layout.ts';

const APPS: DataFlowSpec = {
  variant: 'silos',
  sources: [
    { id: 'mail', label: 'Mail', hue: 'blue' },
    { id: 'docs', label: 'Docs', hue: 'orange' },
    { id: 'sheets', label: 'Sheets', hue: 'green' },
    { id: 'realtime', label: 'Realtime', hue: 'fuchsia' },
    { id: 'chat', label: 'Chat', hue: 'teal' },
  ],
  hub: { label: 'Hypergraph' },
  sinks: [
    { label: 'Inbox', app: 'list' },
    { label: 'Document', app: 'document' },
    { label: 'Sheets', app: 'spreadsheet' },
    { label: 'Board', app: 'kanban' },
    { label: 'Messaging', app: 'messaging' },
  ],
};

const PREFILL = { prefill: true };

/**
 * A gallery of the canvas themes, each on the same five silos with every application view already holding content:
 * mostly settled, a little fresh.
 *
 * Test:
 * 1. Each story draws the five sources, channels and apps in its theme.
 * 2. The bar at the bottom right opens the theme list and picks the grid; in the playground the controls do too.
 */
const meta: Meta<DataFlowViewProps> = {
  title: 'plugins/plugin-canvas/samples/Styles',
  render: (args) => <DataFlowView {...args} />,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'fullscreen' })],
  args: { spec: APPS, options: PREFILL, running: true, theme: 'paper' },
};

export default meta;

type Story = StoryObj<DataFlowViewProps>;

/** Every theme and grid to pick from. */
export const Playground: Story = {
  argTypes: {
    theme: { control: 'inline-radio', options: THEME_IDS },
    grid: { control: 'inline-radio', options: [undefined, 'dots', 'lines', 'none'] },
  },
};

/** Glass on warm paper: white cards with dark hairlines and mid-gray content, held light. */
export const Paper: Story = {};

/** The original dark look: translucent frosted cards over two colour washes and dots. */
export const GlassNight: Story = { name: 'Glass night', args: { theme: 'glass-night' } };

/** Glass on the bare dark canvas, as the glass look first looked. */
export const Night: Story = { args: { theme: 'night' } };

/** Cards with hairline borders and solid muted channels over dots, held dark. */
export const Flat: Story = { args: { theme: 'flat' } };

/** Line art over grid lines, following the app's mode. */
export const Outline: Story = { args: { theme: 'outline' } };

/** The original look: raised gray frames on darker bases, white inset wells and shaded tubes. */
export const Classic: Story = { args: { theme: 'classic' } };

/** The original dark look over lines along the minor and major grid, in place of dots. */
export const Lines: Story = { args: { theme: 'glass-night', grid: 'lines' } };
