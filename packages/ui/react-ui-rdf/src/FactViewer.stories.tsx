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

import { type RDF } from '@dxos/pipeline-rdf';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { FactViewer, type FactViewerProps } from './FactViewer';

const extractor = {
  id: 'default',
  model: 'ai.claude.model.claude-haiku-4-5',
  version: '1',
};

/**
 * Static demo facts that exercise the viewer: an entity→entity conflict (f1 vs f2,
 * same subject + predicate, different objects/sources) plus a coherent pair (f3/f4).
 */
const DEMO_FACTS: RDF.Fact[] = [
  {
    id: 'f1',
    assertion: {
      subject: { entity: 'alice' },
      predicate: 'travelsTo',
      object: { entity: 'paris' },
      validFrom: '2026-06-12',
      quote: "I think I'm probably going to Paris next week",
    },
    factuality: { value: 'PR+', polarity: '+', confidence: 0.6, nature: 'epistemic' },
    attribution: { agent: 'alice', source: 'dxn:gmail:msg-1', generatedAtTime: '2026-06-06T09:00:00.000Z' },
    recordedAt: '2026-06-06T09:00:00.000Z',
    extractor,
    sourceHash: 'demo',
  },
  {
    id: 'f2',
    assertion: {
      subject: { entity: 'alice' },
      predicate: 'travelsTo',
      object: { entity: 'rome' },
      quote: "Alice told me she's definitely going to Rome, not Paris.",
    },
    factuality: { value: 'CT+', polarity: '+', confidence: 0.95 },
    attribution: { agent: 'bob', source: 'dxn:gmail:msg-2', generatedAtTime: '2026-06-07T10:00:00.000Z' },
    recordedAt: '2026-06-07T10:00:00.000Z',
    extractor,
    sourceHash: 'demo',
  },
  {
    id: 'f3',
    assertion: {
      subject: { entity: 'q3-board-meeting' },
      predicate: 'scheduledFor',
      object: { literal: '2026-07-15' },
      quote: 'The Q3 board meeting is confirmed for July 15 in London.',
    },
    factuality: { value: 'CT+', polarity: '+' },
    attribution: { agent: 'carol', source: 'dxn:gmail:msg-3', generatedAtTime: '2026-06-08T11:00:00.000Z' },
    recordedAt: '2026-06-08T11:00:00.000Z',
    extractor,
    sourceHash: 'demo',
  },
  {
    id: 'f4',
    assertion: {
      subject: { entity: 'q3-board-meeting' },
      predicate: 'locatedIn',
      object: { entity: 'london' },
    },
    factuality: { value: 'CT+', polarity: '+' },
    attribution: { agent: 'carol', source: 'dxn:gmail:msg-3', generatedAtTime: '2026-06-08T11:00:00.000Z' },
    recordedAt: '2026-06-08T11:00:00.000Z',
    extractor,
    sourceHash: 'demo',
  },
] satisfies RDF.Fact[];

const DefaultStory = (props: FactViewerProps) => <FactViewer {...props} />;

const meta = {
  title: 'ui/react-ui-rdf/FactViewer',
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
