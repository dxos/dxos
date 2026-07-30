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
export const Default: Story = {
  render: SideBySideStory,
  decorators: [singlePeer],
};

/**
 * The assertions behind {@link Default}.
 */
export const DefaultTest: Story = {
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
    // The `#` and `**` markers belong to the stored string, not to this view...
    await expect(editor.textContent).not.toContain('#');
    await expect(editor.textContent).not.toContain('**');
    // ...they render as actual rich text instead.
    const strong = editor.querySelector<HTMLElement>('strong')!;
    const em = editor.querySelector<HTMLElement>('em')!;
    await expect(strong.textContent).toBe('what is stored');
    await expect(em.textContent).toBe('a view of it');
    await expect(editor.querySelector('code')?.textContent).toBe('source range');

    // And they render as rich text *visibly*. Asserting the elements exist is not enough: the theme's
    // preflight resets heading sizes, `strong` weight, and list markers, so the earlier version of
    // this test passed while every one of them rendered as plain text.
    const paragraph = editor.querySelector<HTMLElement>('p')!;
    const heading1 = editor.querySelector<HTMLElement>('h1')!;
    const heading2 = editor.querySelector<HTMLElement>('h2')!;
    const size = (element: HTMLElement) => Number.parseFloat(getComputedStyle(element).fontSize);
    await expect(size(heading1)).toBeGreaterThan(size(paragraph));
    await expect(size(heading2)).toBeGreaterThan(size(paragraph));
    await expect(Number.parseInt(getComputedStyle(strong).fontWeight, 10)).toBeGreaterThan(
      Number.parseInt(getComputedStyle(paragraph).fontWeight, 10),
    );
    await expect(getComputedStyle(em).fontStyle).toBe('italic');

    // Bullets are a real list, with markers — a bare `li` outside a `ul` renders none.
    const list = editor.querySelector<HTMLElement>('ul')!;
    await expect(list).toBeInTheDocument();
    await expect(list.querySelectorAll('li')).toHaveLength(2);
    await expect(getComputedStyle(list.querySelector('li')!).display).toBe('list-item');
    await expect(getComputedStyle(list).listStyleType).toBe('disc');

    // ---------------------------------------------------------------------------------------------
    // Direction 1: edit through the LENS, and the stored markdown follows.
    // ---------------------------------------------------------------------------------------------
    await userEvent.click(editor.querySelector<HTMLElement>('h1')!);
    await userEvent.keyboard('EDIT');

    // Assert against the STORED string — the lens's whole claim is about what it wrote.
    await waitFor(
      async () => {
        const stored = find('raw-content').textContent ?? '';
        await expect(stored).toContain('EDIT');
        // The edit stayed inside the heading, and every other line survived verbatim. A
        // whole-document rewrite — or a lens that re-serialized the tree — would show up right here.
        await expect(stored).toContain('## Why it merges');
        await expect(stored).toContain('- Each block remembers its `source range`');
        await expect(stored).toContain('- So an edit splices that range alone');
        await expect(stored).toContain('**what is stored**');
      },
      { timeout: 10_000 },
    );

    // ---------------------------------------------------------------------------------------------
    // Direction 2: edit the markdown SOURCE, and the lensed editor follows.
    //
    // This is the direction that only works because the lens re-projects on every change: the
    // ProseMirror editor holds its own document, and reconciles from the lens when it isn't focused.
    // ---------------------------------------------------------------------------------------------
    const line = Array.from(find('markdown-editor').querySelectorAll<HTMLElement>('.cm-line')).find((candidate) =>
      candidate.textContent?.includes('So an edit splices'),
    )!;
    await expect(line).toBeInTheDocument();
    await userEvent.click(line);
    await userEvent.keyboard('SYNC');

    await waitFor(
      async () => {
        // The typed text reached the stored string...
        await expect(find('raw-content').textContent ?? '').toContain('SYNC');
        // ...the lens re-parsed it into the same bullet...
        await expect(find('block-list')).toHaveTextContent('SYNC');
        // ...and the rich-text editor shows it, still inside the list.
        // Which block the caret was in is not worth pinning down; that it reached the lensed editor is.
        await expect(editor.textContent).toContain('SYNC');
        // The structure survived the source edit: still one list, still two items.
        await expect(editor.querySelectorAll('ul')).toHaveLength(1);
        await expect(editor.querySelectorAll('li')).toHaveLength(2);
        // The earlier lensed edit is still there: neither side clobbered the other.
        await expect(find('raw-content').textContent ?? '').toContain('EDIT');
      },
      { timeout: 10_000 },
    );

    // Marks survive an edit from the source side, since the lens re-parses rather than re-serializing.
    await expect(editor.querySelector('strong')?.textContent).toBe('what is stored');
  },
};

/**
 * Two peers: markdown on one, rich text on the other, replicating live. Carries its own assertions — a
 * block edit on one peer reaches the other peer's markdown editor, and the untouched text survives.
 */
export const Collaboration: Story = {
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

    // Peer 1 edits through the LENS; peer 0 receives the splice into its stored markdown.
    const heading = editor.querySelector<HTMLElement>('h2')!;
    await userEvent.click(heading);
    await userEvent.keyboard('EDIT');

    await waitFor(
      async () => {
        // Read the stored string on the peer that did NOT make the edit.
        const stored = findAll('raw-content')[0].textContent ?? '';
        await expect(stored).toContain('EDIT');
        // ...and the rest of the document is intact there — the splice touched one block's range and
        // nothing else crossed the wire.
        await expect(stored).toContain('# One object, two editors');
        await expect(stored).toContain('- Each block remembers its `source range`');
      },
      { timeout: 15_000 },
    );

    // And the other direction: peer 0 edits the markdown SOURCE, and peer 1's lensed editor follows.
    const [markdown] = findAll('markdown-editor');
    const line = Array.from(markdown.querySelectorAll<HTMLElement>('.cm-line')).find((candidate) =>
      candidate.textContent?.includes('So an edit splices'),
    )!;
    await userEvent.click(line);
    await userEvent.keyboard('SYNC');

    await waitFor(
      async () => {
        // Peer 1's block list and rich-text editor both reflect peer 0's source edit...
        await expect(findAll('block-list')[1]).toHaveTextContent('SYNC');
        await expect(findAll('pm-editor')[0].textContent).toContain('SYNC');
        // ...and peer 1's own earlier edit survived peer 0's, on both peers.
        await expect(findAll('raw-content')[0].textContent ?? '').toContain('EDIT');
        await expect(findAll('raw-content')[1].textContent ?? '').toContain('EDIT');
      },
      { timeout: 15_000 },
    );
  },
};
