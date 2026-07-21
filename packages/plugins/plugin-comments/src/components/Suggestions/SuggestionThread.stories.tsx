//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useState } from 'react';
import { expect, userEvent, waitFor } from 'storybook/test';

import { translations as threadTranslations } from '@dxos/react-ui-thread/translations';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { type SuggestionSource } from '@dxos/ui-editor';

import { type SuggestionGroup, buildSuggestionSources, suggestionGroupKey } from '../../hooks';
import { translations } from '../../translations';
import { SuggestionThread } from './SuggestionThread';

// A base document and two reviewers' proposals over it. Alice and Bob both rewrite "quick"
// (an overlap); each has one further, non-overlapping change.
const BASE = 'The quick brown fox jumps over the lazy dog.';

const SOURCES: SuggestionSource[] = buildSuggestionSources([
  { author: 'did:alice', content: 'The fast brown fox jumps over the sleepy dog.' },
  { author: 'did:bob', content: 'The swift brown fox leaps over the lazy dog.' },
]);

const AUTHOR_LABELS = { 'did:alice': 'Alice', 'did:bob': 'Bob' };

const Render = () => {
  // Accept mutates the base (the change merges in and re-diffs away); reject hides the suggestion for
  // the session without altering the base — mirroring the durable AcceptChange / RejectChange ops.
  const [base, setBase] = useState(BASE);
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set());

  const onAccept = useCallback(
    (group: SuggestionGroup) =>
      setBase((current) => current.slice(0, group.from) + group.inserted + current.slice(group.to)),
    [],
  );
  const onReject = useCallback(
    (group: SuggestionGroup) => setDismissed((current) => new Set(current).add(suggestionGroupKey(group))),
    [],
  );

  return (
    <SuggestionThread
      base={base}
      sources={SOURCES}
      authorLabels={AUTHOR_LABELS}
      dismissed={dismissed}
      onAccept={onAccept}
      onReject={onReject}
    />
  );
};

const meta = {
  title: 'plugins/plugin-comments/components/SuggestionThread',
  render: Render,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
    translations: [...translations, ...threadTranslations],
  },
} satisfies Meta<typeof Render>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Two authors' suggestions over one document, each a change-block tile with Accept/Reject. */
export const Default: Story = {};

/**
 * Accept merges a change into the document (and re-diffs the rest); Reject hides a suggestion without
 * altering the document. Deterministic — no AI, so it runs in CI.
 */
export const AcceptReject: Story = {
  play: async ({ canvasElement }) => {
    const accepts = () => canvasElement.querySelectorAll<HTMLElement>('[data-testid="thread.message.accept-change"]');
    const rejects = () => canvasElement.querySelectorAll<HTMLElement>('[data-testid="thread.message.reject-change"]');
    const text = () => canvasElement.textContent ?? '';

    // Four suggestions: Alice{fast, sleepy} + Bob{swift, leaps}; "fast"/"swift" overlap on "quick".
    await waitFor(() => expect(accepts()).toHaveLength(4));

    // Accept the first (offset then author ⇒ Alice's "quick"→"fast"): it merges and re-diffs away, and
    // Bob's overlapping "quick"→"swift" re-expresses against the new base as "fast"→"swift".
    await userEvent.click(accepts()[0]);
    await waitFor(() => expect(accepts()).toHaveLength(3));
    await waitFor(() => expect(text()).toContain('swift'));

    // Reject the next suggestion: it disappears from the list.
    await userEvent.click(rejects()[0]);
    await waitFor(() => expect(accepts()).toHaveLength(2));
  },
};
