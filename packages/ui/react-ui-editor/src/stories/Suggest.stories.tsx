//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';
import { expect, userEvent, waitFor } from 'storybook/test';

import { createObject } from '@dxos/echo-client';
import { Doc } from '@dxos/echo-doc';
import { useThemeContext } from '@dxos/react-ui';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';
import {
  automerge,
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  suggestChanges,
  suggestions,
} from '@dxos/ui-editor';

import { Editor, type EditorViewProps } from '../components';

// The parent (main) content and a branch proposal that rewrites three words — three independent,
// reviewable changes (like a branch's edits against a style guide).
const ORIGINAL = 'The quick brown fox jumps over the lazy dog.';
const PROPOSAL = 'The fast brown fox leaps over the sleepy dog.';

/**
 * Simulate hovering a change to surface its tooltip-layer controls. CodeMirror's `hoverTooltip` reads
 * pointer coordinates from a bubbling `mousemove`, which `userEvent.hover` does not reliably provide, so
 * dispatch one at the element's centre.
 */
const hoverChange = (element: HTMLElement): void => {
  const rect = element.getBoundingClientRect();
  element.dispatchEvent(
    new MouseEvent('mousemove', {
      bubbles: true,
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
    }),
  );
};

/** The document text (struck-through deletions included), excluding the proposal preview widgets. */
const documentText = (canvasElement: HTMLElement): string => {
  const content = canvasElement.querySelector('.cm-content');
  if (!content) {
    return '';
  }
  const clone = content.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('.cm-suggest-actions').forEach((node) => node.remove());
  return clone.textContent ?? '';
};

const Render = (args: EditorViewProps) => {
  const { themeMode } = useThemeContext();
  const extensions = useMemo(
    () => [
      createBasicExtensions(),
      createThemeExtensions({ themeMode }),
      createMarkdownExtensions(),
      // The editor is bound to the parent (ORIGINAL); the branch is the proposal.
      automerge(Doc.createAccessor(createObject(Text.make({ content: ORIGINAL })), ['content'])),
      suggestChanges({ proposal: PROPOSAL }),
    ],
    [themeMode],
  );

  return (
    <Editor.Root>
      <Editor.View {...args} extensions={extensions} />
    </Editor.Root>
  );
};

// Two reviewers proposing over the same base: Alice and Bob both rewrite "quick" (an overlap), and
// each has one further, non-overlapping change — a multi-author suggestion overlay.
const ALICE = 'The fast brown fox jumps over the sleepy dog.';
const BOB = 'The swift brown fox leaps over the lazy dog.';

const MultiAuthorRender = (args: EditorViewProps) => {
  const { themeMode } = useThemeContext();
  const extensions = useMemo(
    () => [
      createBasicExtensions(),
      createThemeExtensions({ themeMode }),
      createMarkdownExtensions(),
      automerge(Doc.createAccessor(createObject(Text.make({ content: ORIGINAL })), ['content'])),
      // Author colours come from the shared hue palette (the same `--color-<hue>-text` tokens used
      // for a user's avatar/tag), so a suggestion reads with its author's consistent colour.
      suggestions({
        sources: [
          { author: 'did:alice', colour: 'var(--color-lime-text)', content: ALICE },
          { author: 'did:bob', colour: 'var(--color-violet-text)', content: BOB },
        ],
      }),
    ],
    [themeMode],
  );

  return (
    <Editor.Root>
      <Editor.View {...args} extensions={extensions} />
    </Editor.Root>
  );
};

const meta = {
  title: 'ui/react-ui-editor/Suggest',
  render: Render,
  decorators: [withTheme(), withLayout({ layout: 'column' }), withAttention()],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof Render>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The branch's changes rendered over the parent as accept/reject suggestions. */
export const Default: Story = {};

/**
 * Accept applies a change to the document (merging it into the parent); Reject hides a change without
 * altering the document. Deterministic — no AI, so it runs in CI.
 */
export const AcceptReject: Story = {
  play: async ({ canvasElement }) => {
    // Each change carries a strikethrough of the replaced word; its accept/reject controls live in the
    // (non-clipped) tooltip layer and surface on hover.
    const deletes = () => Array.from(canvasElement.querySelectorAll<HTMLElement>('.cm-suggest-delete'));
    const inserts = () => canvasElement.querySelectorAll<HTMLElement>('.cm-suggest-insert');
    const acceptButton = () => canvasElement.querySelector<HTMLElement>('.cm-tooltip .cm-suggest-accept');
    const rejectButton = () => canvasElement.querySelector<HTMLElement>('.cm-tooltip .cm-suggest-reject');

    // Three suggestions (quick→fast, jumps→leaps, lazy→sleepy) over the original document.
    await waitFor(() => expect(documentText(canvasElement)).toContain('quick'), { timeout: 15_000 });
    await waitFor(() => expect(inserts()).toHaveLength(3));

    // Hover the first change: its controls mount in the tooltip layer (a `.cm-tooltip`, not clipped by
    // the scroller). Accept applies that change to the document.
    hoverChange(deletes()[0]);
    await waitFor(() => expect(acceptButton()).not.toBeNull());
    await userEvent.click(acceptButton()!);
    await waitFor(() => expect(documentText(canvasElement)).toContain('fast'));
    await waitFor(() => expect(documentText(canvasElement)).not.toContain('quick'));
    await waitFor(() => expect(inserts()).toHaveLength(2));

    // Reject the next change: the suggestion disappears, but the document keeps the original.
    const before = documentText(canvasElement);
    hoverChange(deletes()[0]);
    await waitFor(() => expect(rejectButton()).not.toBeNull());
    await userEvent.click(rejectButton()!);
    await waitFor(() => expect(inserts()).toHaveLength(1));
    await waitFor(() => expect(documentText(canvasElement)).toBe(before));
  },
};

/**
 * Two authors reviewing the same base, overlapping on one word. Each change is independently
 * attributable and accepting one re-diffs the rest (the overlapping author's change persists).
 * Deterministic — no AI, so it runs in CI.
 */
export const MultipleAuthors: Story = {
  render: MultiAuthorRender,
  play: async ({ canvasElement }) => {
    const deletes = () => Array.from(canvasElement.querySelectorAll<HTMLElement>('.cm-suggest-delete'));
    const acceptButton = () => canvasElement.querySelector<HTMLElement>('.cm-tooltip .cm-suggest-accept');
    const insertText = () =>
      Array.from(canvasElement.querySelectorAll<HTMLElement>('.cm-suggest-insert')).map((node) => node.textContent);

    const insertColours = () =>
      Array.from(canvasElement.querySelectorAll<HTMLElement>('.cm-suggest-insert')).map((node) => node.style.color);

    // Four suggestions total: Alice{fast, sleepy} + Bob{swift, leaps}; "fast"/"swift" overlap on "quick".
    await waitFor(() => expect(documentText(canvasElement)).toContain('quick'), { timeout: 15_000 });
    await waitFor(() => expect(insertText()).toEqual(expect.arrayContaining(['fast', 'swift', 'sleepy', 'leaps'])));

    // Each author's inline markers carry that author's palette colour (Alice lime, Bob violet).
    await waitFor(() => expect(insertColours().some((colour) => colour.includes('lime'))).toBe(true));
    await waitFor(() => expect(insertColours().some((colour) => colour.includes('violet'))).toBe(true));

    // Hover the overlapping "quick" change; offset-then-author order surfaces Alice's "quick"→"fast"
    // first. Accepting it makes the base take "fast"; Bob's "quick"→"swift" re-diffs and remains.
    const quick = deletes().find((node) => node.textContent?.includes('quick'));
    void expect(quick).toBeDefined();
    hoverChange(quick!);
    await waitFor(() => expect(acceptButton()).not.toBeNull());
    await userEvent.click(acceptButton()!);
    await waitFor(() => expect(documentText(canvasElement)).toContain('fast'));
    await waitFor(() => expect(documentText(canvasElement)).not.toContain('quick'));
    await waitFor(() => expect(insertText()).toEqual(expect.arrayContaining(['swift'])));
    await waitFor(() => expect(insertText()).toHaveLength(3));
  },
};
