//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, waitFor } from 'storybook/test';

import { Query } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { useSpace } from '@dxos/react-client/echo';
import { useClientStory, withClientProvider, withMultiClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';

import { Panel } from '../components';
import { MarkdownEditor } from '../MarkdownEditor';
import { DEMO_MARKDOWN, makeDemoText } from '../rich-text';
import { BlockList, RichTextEditor } from '../RichTextEditor';

//
// One `Text` object, two editors: the core markdown editor on the stored string, and a basic
// ProseMirror editor on the lensed block tree. Neither knows about the other.
//
// This is the case a per-property mapping cannot express — parsing — so the lens is *coded*. What
// makes it collaborative is that every block carries its source range, so a block edit splices that
// range alone and the markdown editor's character-level automerge edits survive alongside it.
//

const useDemoText = () => {
  const { spaceId } = useClientStory();
  const space = useSpace(spaceId);
  const [text] = useQuery(space?.db, Query.type(Text.Text));
  return text;
};

const SideBySideStory = () => {
  const text = useDemoText();
  if (!text) {
    return <div className='p-3 text-sm text-subdued'>Loading…</div>;
  }

  return (
    <div className='absolute inset-0 grid grid-cols-3 gap-3 p-3 overflow-hidden'>
      <Panel
        title='Markdown editor'
        subtitle='The core editor, bound to Text.content — the string as stored.'
        testId='markdown-panel'
      >
        <MarkdownEditor text={text} />
      </Panel>
      <Panel
        title='Rich-text editor'
        subtitle='ProseMirror over the lensed block tree. It never sees markdown.'
        testId='rich-text-panel'
      >
        <RichTextEditor text={text} />
      </Panel>
      <Panel
        title='Blocks'
        subtitle='What the lens projects, with the source range each block splices over.'
        testId='blocks-panel'
      >
        <BlockList text={text} />
      </Panel>
    </div>
  );
};

/** Peer 0 gets the markdown editor, peer 1 the rich-text editor, over a real invitation. */
const CollaborationStory = () => {
  const { index } = useClientStory();
  const text = useDemoText();
  if (!text) {
    return <div className='p-3 text-sm text-subdued'>Loading…</div>;
  }

  return (
    <div className='flex flex-col gap-3 p-3 h-full overflow-hidden'>
      <div className='text-xs text-subdued'>peer {index}</div>
      {index === 0 ? (
        <Panel title='Markdown editor' subtitle='Peer 0, on the stored string.' testId='markdown-panel'>
          <MarkdownEditor text={text} />
        </Panel>
      ) : (
        <Panel title='Rich-text editor' subtitle='Peer 1, on the lensed block tree.' testId='rich-text-panel'>
          <RichTextEditor text={text} />
        </Panel>
      )}
      <Panel title='Blocks' subtitle='The lens view on this peer.' testId='blocks-panel'>
        <BlockList text={text} />
      </Panel>
    </div>
  );
};

const onCreateSpace = async ({ space }: { space: { db: { add: (obj: any) => any } } }) => {
  space.db.add(makeDemoText());
};

const singlePeer = withClientProvider({
  createIdentity: true,
  createSpace: true,
  types: [Text.Text],
  onCreateSpace,
});

const twoPeers = withMultiClientProvider({
  numClients: 2,
  createIdentity: true,
  createSpace: true,
  types: [Text.Text],
  onCreateSpace,
});

const meta: Meta = {
  title: 'stories/stories-lens/RichTextLens',
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Type in either editor and watch the other follow, with the block ranges updating in the third pane.
 */
export const SideBySide: Story = {
  render: SideBySideStory,
  decorators: [singlePeer],
};

/**
 * Two peers: markdown on one, rich text on the other, replicating live.
 */
export const Collaboration: Story = {
  render: CollaborationStory,
  decorators: [twoPeers],
};

/**
 * The assertions behind {@link SideBySide}.
 */
export const SideBySideTest: Story = {
  render: SideBySideStory,
  decorators: [singlePeer],
  play: async ({ canvasElement }) => {
    const find = <T extends HTMLElement>(testId: string) =>
      canvasElement.querySelector<T>(`[data-testid="${testId}"]`)!;

    await waitFor(() => expect(find('pm-editor')).toBeInTheDocument(), { timeout: 15_000 });

    // The lens parsed the stored markdown into blocks, each carrying the range it came from — derived
    // from the source here rather than hardcoded, because the range IS the claim.
    const title = DEMO_MARKDOWN.split('\n')[0];
    const blocks = find('block-list');
    await expect(blocks).toHaveTextContent(`heading1 [0,${title.length}) One object, two editors`);
    await expect(blocks).toHaveTextContent('bullet');

    // The rich-text editor renders the block structure, not the markdown syntax.
    const editor = find('pm-editor');
    await expect(editor.querySelector('h1')?.textContent).toBe('One object, two editors');
    await expect(editor.querySelector('h2')?.textContent).toBe('Why it merges');
    // The `#` markers belong to the stored string, not to this view.
    await expect(editor.textContent).not.toContain('#');

    // Editing a heading in the rich-text editor splices only that heading's range: the markdown
    // editor shows the new title and every other line is untouched.
    const heading = editor.querySelector<HTMLElement>('h1')!;
    await userEvent.click(heading);
    await userEvent.keyboard('EDIT');

    await waitFor(
      async () => {
        // The edit reached the stored markdown, still as a heading.
        await expect(find('block-list')).toHaveTextContent('heading1');
        await expect(find('markdown-editor')).toHaveTextContent('EDIT');
        // ...and every other block survived verbatim. A whole-document rewrite — or a lens that
        // re-serialized the tree — would show up right here.
        await expect(find('markdown-editor')).toHaveTextContent('## Why it merges');
        await expect(find('markdown-editor')).toHaveTextContent('- Each block remembers its source range');
        await expect(find('markdown-editor')).toHaveTextContent('- So an edit splices that range alone');
      },
      { timeout: 10_000 },
    );
  },
};

/**
 * The assertions behind {@link Collaboration}: a block edit on one peer reaches the other peer's
 * markdown editor, and the untouched text survives.
 */
export const CollaborationTest: Story = {
  render: CollaborationStory,
  decorators: [twoPeers],
  play: async ({ canvasElement }) => {
    const findAll = <T extends HTMLElement>(testId: string) =>
      Array.from(canvasElement.querySelectorAll<T>(`[data-testid="${testId}"]`));

    await waitFor(
      async () => {
        await expect(findAll('markdown-editor')).toHaveLength(1);
        await expect(findAll('pm-editor')).toHaveLength(1);
      },
      { timeout: 30_000 },
    );

    // The seeded markdown replicated to the guest, and the lens parsed it there.
    const [editor] = findAll('pm-editor');
    await waitFor(async () => await expect(editor.querySelector('h1')?.textContent).toBe('One object, two editors'), {
      timeout: 15_000,
    });

    // Peer 1 edits a block; peer 0's markdown editor receives the splice.
    const heading = editor.querySelector<HTMLElement>('h2')!;
    await userEvent.click(heading);
    await userEvent.keyboard('EDIT');

    await waitFor(
      async () => {
        await expect(findAll('markdown-editor')[0]).toHaveTextContent('EDIT');
        // ...and the rest of the document is intact on the peer that did not make the edit — the
        // splice touched one block's range and nothing else crossed the wire.
        await expect(findAll('markdown-editor')[0]).toHaveTextContent('# One object, two editors');
        await expect(findAll('markdown-editor')[0]).toHaveTextContent('- Each block remembers its source range');
      },
      { timeout: 15_000 },
    );
  },
};
