//
// Copyright 2026 DXOS.org
//

/**
 * Read-only viewer for extracted semantic facts, rendered against static fixtures (no engine/AI).
 *
 * - `Default` passes `DEMO_FACTS` (includes an Alice→Paris/Rome conflict and a coherent Q3-meeting pair).
 * - `Empty` passes `[]` to show the empty state.
 * - Renders `FactViewer`, which groups facts by subject, flags predicate-level conflicts, and filters.
 * - Minimal decorators (`withTheme` + `withLayout`); purely presentational.
 */

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { SAMPLE_FACTS } from '../../testing';
import { FactViewer, type FactViewerProps } from './FactViewer';

const DefaultStory = (props: FactViewerProps) => <FactViewer {...props} />;

const meta = {
  title: 'stories/stories-brain/components/FactViewer',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    facts: SAMPLE_FACTS,
  },
};
