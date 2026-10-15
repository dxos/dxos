//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { BACKGROUND_IDS } from '@dxos/react-ui-canvas/scene';
import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';

import { DataFlowView, type DataFlowViewProps } from './DataFlowView.tsx';
import { type DataFlowSpec } from './layout.ts';
import { GRIDS, LOOKS } from './MoleculeOverlay.tsx';

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
 * A gallery of the looks, each on the same five silos with every application view already holding content: mostly
 * settled, a little fresh.
 *
 * Test:
 * 1. Each story draws the five sources, channels and apps in its look.
 * 2. In the playground, pick a `look`, `background` and `grid`; a light background (paper) retunes the look for it.
 */
const meta: Meta<DataFlowViewProps> = {
  title: 'plugins/plugin-canvas/samples/Styles',
  render: (args) => <DataFlowView {...args} />,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'fullscreen' })],
  args: { spec: APPS, options: PREFILL, running: true, look: 'glass', background: 'paper' },
};

export default meta;

type Story = StoryObj<DataFlowViewProps>;

/** Every look, background and grid to pick from. */
export const Playground: Story = {
  argTypes: {
    look: { control: 'inline-radio', options: LOOKS },
    background: { control: 'inline-radio', options: BACKGROUND_IDS },
    grid: { control: 'inline-radio', options: [undefined, ...GRIDS] },
  },
};

/** Translucent frosted cards and channels over two colour washes and dots, on a dark canvas. */
export const Glass: Story = { args: { background: 'glow' } };

/** The glass look retuned for warm paper: white cards with dark hairlines, mid-gray content. */
export const GlassOnPaper: Story = { name: 'Glass on paper' };

/** Cards with hairline borders, panels for wells and solid muted channels; no gradients or shadows. */
export const Flat: Story = { args: { look: 'flat' } };

/** Line art: outlined cards, wells and content with no fills, and channels drawn as rails. */
export const Outline: Story = { args: { look: 'outline' } };

/** The original look: raised gray frames on darker bases, white inset wells, and shaded tubes. */
export const Classic: Story = { args: { look: 'classic' } };

/** The glass look over lines along the minor and major grid, in place of dots. */
export const Lines: Story = { args: { background: 'glow', grid: 'lines' } };
