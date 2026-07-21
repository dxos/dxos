//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo, useState } from 'react';
import { expect, userEvent, waitFor } from 'storybook/test';

import { withTheme } from '@dxos/react-ui/testing';
import { type SuggestionSource } from '@dxos/ui-editor';

import { type SuggestionGroup, buildSuggestionSources } from '../../hooks';
import { translations } from '../../translations';
import { SuggestionList, suggestionGroupKey } from './SuggestionList';

// A base document and two reviewers' proposals over it. Alice and Bob both rewrite "quick" (an
// overlap); each has one further, non-overlapping change.
const BASE = 'The quick brown fox jumps over the lazy dog.';
const SOURCES: SuggestionSource[] = buildSuggestionSources([
  { author: 'did:alice', content: 'The fast brown fox jumps over the sleepy dog.' },
  { author: 'did:bob', content: 'The swift brown fox leaps over the lazy dog.' },
]);

const AUTHOR_LABELS = { 'did:alice': 'Alice', 'did:bob': 'Bob' };

const Render = () => {
  // Accept mutates the base (the change merges in and re-diffs away); reject hides the card for the
  // session without altering the base — mirroring the durable AcceptChange / RejectChange ops.
  const [base, setBase] = useState(BASE);
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set());

  const onAccept = useMemo(
    () => (group: SuggestionGroup) =>
      setBase((current) => current.slice(0, group.from) + group.inserted + current.slice(group.to)),
    [],
  );
  const onReject = useMemo(
    () => (group: SuggestionGroup) => setDismissed((current) => new Set(current).add(suggestionGroupKey(group))),
    [],
  );

  return (
    <div className='grid grid-cols-2 h-full'>
      <div className='pli-3 plb-2 border-ie border-separator'>
        <h2 className='text-sm text-subdued mbe-2'>Document</h2>
        <p data-testid='base-text' className='text-sm whitespace-pre-wrap'>
          {base}
        </p>
      </div>
      <div>
        <h2 className='text-sm text-subdued pli-3 plb-2 border-be border-separator'>Suggestions</h2>
        <SuggestionList
          base={base}
          sources={SOURCES}
          authorLabels={AUTHOR_LABELS}
          dismissed={dismissed}
          onAccept={onAccept}
          onReject={onReject}
        />
      </div>
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-comments/components/SuggestionCard',
  render: Render,
  decorators: [withTheme()],
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
    translations,
  },
} satisfies Meta<typeof Render>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Two authors' suggestions over one document, each an independently accept/rejectable card. */
export const Default: Story = {};

/**
 * Accept merges a change into the document (and re-diffs the rest); Reject hides a card without
 * altering the document. Deterministic — no AI, so it runs in CI.
 */
export const AcceptReject: Story = {
  play: async ({ canvasElement }) => {
    const cards = () => canvasElement.querySelectorAll('[data-testid="suggestion-card"]');
    const acceptButtons = () => canvasElement.querySelectorAll<HTMLElement>('[data-testid="suggestion-accept"]');
    const rejectButtons = () => canvasElement.querySelectorAll<HTMLElement>('[data-testid="suggestion-reject"]');
    const baseText = () => canvasElement.querySelector('[data-testid="base-text"]')?.textContent ?? '';

    // Four cards: Alice{fast, sleepy} + Bob{swift, leaps}; "fast"/"swift" overlap on "quick".
    await waitFor(() => expect(cards()).toHaveLength(4));

    // Accept the first card (offset then author ⇒ Alice's "quick"→"fast"): the document takes "fast",
    // Bob's overlapping "quick"→"swift" re-diffs against the new base and remains.
    await userEvent.click(acceptButtons()[0]);
    await waitFor(() => expect(baseText()).toContain('fast'));
    await waitFor(() => expect(baseText()).not.toContain('quick'));
    await waitFor(() => expect(cards()).toHaveLength(3));

    // Reject the next card: it disappears, but the document is unchanged.
    const before = baseText();
    await userEvent.click(rejectButtons()[0]);
    await waitFor(() => expect(cards()).toHaveLength(2));
    await waitFor(() => expect(baseText()).toBe(before));
  },
};
