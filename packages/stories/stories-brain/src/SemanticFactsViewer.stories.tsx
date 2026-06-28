//
// Copyright 2026 DXOS.org
//

/**
 * Read-only viewer for extracted semantic facts, rendered against static fixtures (no engine/AI).
 *
 * - `Default` passes `DEMO_FACTS` (includes an Alice→Paris/Rome conflict and a coherent Q3-meeting pair).
 * - `Empty` passes `[]` to show the empty state.
 * - Renders `SemanticFactsViewer`, which groups facts by subject, flags predicate-level conflicts, and filters.
 * - Minimal decorators (`withTheme` + `withLayout`); purely presentational.
 */

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { SemanticFactsViewer, type SemanticFactsViewerProps } from './SemanticFactsViewer';
import { DEMO_FACTS } from './testing';

const DefaultStory = (props: SemanticFactsViewerProps) => <SemanticFactsViewer {...props} />;

const meta = {
  title: 'stories/stories-brain/SemanticFactsViewer',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    facts: DEMO_FACTS,
  },
};

export const Empty: Story = {
  args: {
    facts: [],
  },
};
