//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';
import { expect, waitFor } from 'storybook/test';

import { useThemeContext } from '@dxos/react-ui';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import {
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  suggestions,
  trackChanges,
} from '@dxos/ui-editor';

import { Editor, type EditorViewProps } from '../components';

// The accepted base (main). The editor is bound to a *branch* whose live edits are tracked against it.
const MAIN = 'The quick brown fox jumps over the lazy dog.';

// A second author's proposal, changing one word near the end so it stays clear of where the tester is
// likely to type.
//
// TODO(burdon): `suggestions()` diffs the editor's document (the branch) against each source, so as
// soon as the tester edits, Bob renders Bob-vs-branch, not Bob-vs-main. At story open (branch === MAIN)
// the two frames coincide, so this is faithful only until the first edit. Production must decouple the
// overlay's base from the document (see the bind-to-branch spike's foreign-overlay gotcha).
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
      createThemeExtensions({ themeMode }),
      createMarkdownExtensions(),
      // Self: the branch's own edits, diffed against MAIN and shown as tracked changes.
      trackChanges({ main: MAIN, colour: SELF_COLOUR }),
      // Foreign: a second author's suggestion, overlaid via the existing accept/reject mechanism.
      suggestions({ sources: [{ author: 'did:bob', colour: BOB_COLOUR, content: BOB }] }),
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
  decorators: [withTheme(), withLayout({ layout: 'column' }), withAttention()],
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
 * - Bob's suggestion (violet, near the end) shows a second author coexisting on the same buffer.
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
