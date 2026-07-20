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
} from '@dxos/ui-editor';

import { Editor, type EditorViewProps } from '../components';

// The parent (main) content and a branch proposal that rewrites three words — three independent,
// reviewable changes (like a branch's edits against a style guide).
const ORIGINAL = 'The quick brown fox jumps over the lazy dog.';
const PROPOSAL = 'The fast brown fox leaps over the sleepy dog.';

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
    const acceptButtons = () => canvasElement.querySelectorAll<HTMLElement>('.cm-suggest-accept');
    const rejectButtons = () => canvasElement.querySelectorAll<HTMLElement>('.cm-suggest-reject');

    // Three suggestions (quick→fast, jumps→leaps, lazy→sleepy) over the original document.
    await waitFor(() => expect(documentText(canvasElement)).toContain('quick'), { timeout: 15_000 });
    await waitFor(() => expect(acceptButtons()).toHaveLength(3));

    // Accept the first change: the document updates to the proposal's wording.
    await userEvent.click(acceptButtons()[0]);
    await waitFor(() => expect(documentText(canvasElement)).toContain('fast'));
    await waitFor(() => expect(documentText(canvasElement)).not.toContain('quick'));
    await waitFor(() => expect(acceptButtons()).toHaveLength(2));

    // Reject the next change: the suggestion disappears, but the document keeps the original.
    const before = documentText(canvasElement);
    await userEvent.click(rejectButtons()[0]);
    await waitFor(() => expect(acceptButtons()).toHaveLength(1));
    await waitFor(() => expect(documentText(canvasElement)).toBe(before));
  },
};
