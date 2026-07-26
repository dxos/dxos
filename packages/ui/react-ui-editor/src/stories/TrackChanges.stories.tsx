//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';
import { expect, userEvent, waitFor } from 'storybook/test';

import { useThemeContext } from '@dxos/react-ui';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import {
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  documentSlots,
  suggestions,
  trackChanges,
} from '@dxos/ui-editor';

import { Editor, type EditorViewProps } from '../components';

// The accepted base (main). The editor is bound to a *branch* whose live edits are tracked against it.
const MAIN = 'The quick brown fox jumps over the lazy dog.';

// A second author's proposal against main ("lazy" -> "sleepy"). Milestone B decouples the diff base
// from the editor document, so this overlay is diffed vs MAIN and rebased into the (diverged) branch's
// coordinates — it no longer strikes the tester's own new text (the collision the old overlay had).
const BOB = 'The quick brown fox jumps over the sleepy dog.';

const SELF_COLOUR = 'var(--color-cyan-text)';
const BOB_COLOUR = 'var(--color-violet-text)';

/** The document text with phantom deletions folded in, excluding the foreign overlay's controls. */
const documentText = (canvasElement: HTMLElement): string => {
  const content = canvasElement.querySelector('.cm-content');
  if (!content) {
    return '';
  }
  const clone = content.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('.cm-suggest-actions').forEach((node) => node.remove());
  return clone.textContent ?? '';
};

type RenderProps = EditorViewProps & { branch: string };

const Render = ({ branch, ...args }: RenderProps) => {
  const { themeMode } = useThemeContext();
  const extensions = useMemo(
    () => [
      createBasicExtensions(),
      createThemeExtensions({ themeMode, slots: documentSlots }),
      createMarkdownExtensions(),
      // The branch's own edits, diffed against MAIN and shown as tracked changes (self only).
      trackChanges({ main: MAIN, colour: SELF_COLOUR }),
    ],
    [themeMode],
  );

  return (
    <Editor.Root>
      <Editor.View {...args} value={branch} extensions={extensions} />
    </Editor.Root>
  );
};

/**
 * The tester's own live edits (self, via {@link trackChanges}) composed with a foreign author's
 * proposal (via {@link suggestions} with an explicit `base`). Because the foreign overlay is diffed
 * against MAIN — not the editor document — the tester's own typing is never mistaken for text the
 * foreign author would remove.
 */
const ForeignAuthorRender = ({ branch, ...args }: RenderProps) => {
  const { themeMode } = useThemeContext();
  const extensions = useMemo(
    () => [
      createBasicExtensions(),
      createThemeExtensions({ themeMode, slots: documentSlots }),
      createMarkdownExtensions(),
      trackChanges({ main: MAIN, colour: SELF_COLOUR }),
      // The foreign author is diffed against MAIN and rebased into the branch's coordinates.
      suggestions({ base: MAIN, sources: [{ author: 'did:bob', colour: BOB_COLOUR, content: BOB }] }),
    ],
    [themeMode],
  );

  return (
    <Editor.Root>
      <Editor.View {...args} value={branch} extensions={extensions} />
    </Editor.Root>
  );
};

const meta = {
  title: 'ui/react-ui-editor/TrackChanges',
  render: Render,
  decorators: [withTheme(), withLayout({ layout: 'column', classNames: 'py-8' }), withAttention()],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof Render>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Interactive "Suggesting mode" (bind-to-branch): the editor is bound to a branch that starts equal to
 * MAIN, so it opens clean. Type to feel the tracked-change ergonomics:
 *
 * - Type — the added characters appear as an underlined, cyan insertion (character-level, so editing
 *   inside a word marks only the changed characters, not the whole word).
 * - Select text and delete it — the removed characters stay visible as a struck-through phantom
 *   (`~~old~~`), because they are absent from the branch but present in main.
 * - Replace text — you get both at once, `~~old~~new`, at character granularity.
 * - Move the caret across a phantom with the arrow keys — it is stepped over as one unit.
 * - Press Backspace with the caret just after a phantom — the real branch text behind it is protected
 *   (the keystroke is swallowed rather than eating the hidden character).
 */
export const Default: Story = {
  args: { branch: MAIN },
};

/**
 * A branch that has already diverged from main, so tracked changes render on mount without typing:
 * `swiftly ` inserted after "jumps" and `lazy ` deleted — both clean whole-word edits so the
 * character-level diff yields contiguous hunks. Deterministic — used for the render smoke test.
 */
export const Divergent: Story = {
  args: { branch: 'The quick brown fox jumps swiftly over the dog.' },
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelector('.cm-content')).not.toBeNull(), { timeout: 15_000 });

    // Insertion mark: the branch's added text.
    const inserts = () => Array.from(canvasElement.querySelectorAll<HTMLElement>('.cm-track-insert'));
    await waitFor(() =>
      expect(
        inserts()
          .map((node) => node.textContent)
          .join(''),
      ).toContain('swiftly'),
    );

    // Phantom deletion: base text absent from the branch, still visible struck through.
    const deletes = () => Array.from(canvasElement.querySelectorAll<HTMLElement>('.cm-track-delete'));
    await waitFor(() => expect(deletes().length).toBeGreaterThan(0));
    const deletedText = () =>
      deletes()
        .map((node) => node.textContent)
        .join('');
    await waitFor(() => expect(deletedText()).toContain('lazy'));

    // The phantom text is not part of the document (it is a widget, not doc content).
    await waitFor(() => expect(documentText(canvasElement)).toContain('swiftly'));
  },
};

/**
 * A foreign author's proposal (Bob: "lazy"→"sleepy") layered over the tester's own live edits. The
 * overlay is diffed against MAIN (not the branch), so after the tester types, their new text is tracked
 * as a self-insertion and is NOT struck by Bob's overlay, while Bob's change still renders. This is the
 * multi-author case the old (diff-vs-document) overlay could not support. Deterministic — runs in CI.
 */
export const WithForeignAuthor: Story = {
  render: ForeignAuthorRender,
  args: { branch: MAIN },
  play: async ({ canvasElement }) => {
    const content = await waitFor(
      () => {
        const node = canvasElement.querySelector<HTMLElement>('.cm-content');
        void expect(node).not.toBeNull();
        return node!;
      },
      { timeout: 15_000 },
    );

    // Bob's proposal renders on mount: "lazy" struck through, "sleepy" previewed.
    const suggestDeletes = () => Array.from(canvasElement.querySelectorAll<HTMLElement>('.cm-suggest-delete'));
    const suggestInserts = () => Array.from(canvasElement.querySelectorAll<HTMLElement>('.cm-suggest-insert'));
    await waitFor(() =>
      expect(
        suggestDeletes()
          .map((node) => node.textContent)
          .join(' '),
      ).toContain('lazy'),
    );
    await waitFor(() =>
      expect(
        suggestInserts()
          .map((node) => node.textContent)
          .join(' '),
      ).toContain('sleepy'),
    );

    // The tester types at the start of the branch (a region Bob did not touch).
    content.focus();
    await userEvent.keyboard('really ');

    // The typed text is tracked as the tester's own insertion (self overlay), not attributed to Bob.
    const trackInserts = () => Array.from(canvasElement.querySelectorAll<HTMLElement>('.cm-track-insert'));
    await waitFor(() =>
      expect(
        trackInserts()
          .map((node) => node.textContent)
          .join(''),
      ).toContain('really'),
    );

    // Critically, Bob's overlay does NOT strike the tester's new text — only "lazy" stays struck.
    await waitFor(() => {
      const struck = suggestDeletes()
        .map((node) => node.textContent)
        .join(' ');
      void expect(struck).toContain('lazy');
      void expect(struck).not.toContain('really');
    });
    // And Bob's proposal still renders after the divergence.
    await waitFor(() =>
      expect(
        suggestInserts()
          .map((node) => node.textContent)
          .join(' '),
      ).toContain('sleepy'),
    );
  },
};
