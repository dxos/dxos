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
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';

import { DemoPanel } from '../components.tsx';
import { MarkdownEditor } from '../MarkdownEditor.tsx';
import { DEMO_MARKDOWN, makeDemoText } from '../rich-text.ts';
import { BlockList, RichTextEditor } from '../RichTextEditor.tsx';

//
// One `Text` object, two editors: the core markdown editor on the stored string, and a basic
// ProseMirror editor on the lensed block tree. Neither knows about the other.
//
// This is the case a per-property mapping cannot express — parsing — so the lens is *coded*. What
// makes it collaborative is that every block carries its source range, so a block edit splices that
// range alone and the markdown editor's character-level automerge edits survive alongside it.
//

/**
 * Put the caret at the end of a CodeMirror line and type.
 *
 * `userEvent.click` reports no pointer coordinates, and CodeMirror derives the caret from
 * `clientX`/`clientY` — so a plain click on a line lands at document position 0 instead, silently
 * typing into the wrong block. Clicking past the right edge of the line's box maps to its end.
 */
const typeAtEndOfLine = async (line: HTMLElement, text: string) => {
  const rect = line.getBoundingClientRect();
  await userEvent.pointer({
    keys: '[MouseLeft]',
    target: line,
    coords: { clientX: rect.right - 2, clientY: rect.top + rect.height / 2 },
  });
  await userEvent.keyboard(text);
};

/** The line of the markdown editor holding the given text. */
const lineContaining = (editor: HTMLElement, text: string) =>
  Array.from(editor.querySelectorAll<HTMLElement>('.cm-line')).find((candidate) =>
    candidate.textContent?.includes(text),
  )!;

const useDemoText = () => {
  const { spaceId } = useClientStory();
  const space = useSpace(spaceId);
  const [text] = useQuery(space?.db, Query.type(Text.Text));
  return text;
};

const SideBySideStory = () => {
  const text = useDemoText();
  if (!text) {
    return <Loading />;
  }

  return (
    <div className='dx-fullscreen grid grid-cols-3 gap-3 p-3 overflow-hidden'>
      <DemoPanel label='Markdown — the string as stored' testId='markdown-panel'>
        <MarkdownEditor text={text} />
      </DemoPanel>
      <DemoPanel label='Rich text — the lensed block tree' testId='rich-text-panel'>
        <RichTextEditor text={text} />
      </DemoPanel>
      <DemoPanel label='Blocks — what the lens projects' testId='blocks-panel'>
        <BlockList text={text} />
      </DemoPanel>
    </div>
  );
};

/** Peer 0 gets the markdown editor, peer 1 the rich-text editor, over a real invitation. */
const CollaborationStory = () => {
  const { index } = useClientStory();
  const text = useDemoText();
  if (!text) {
    return <Loading />;
  }

  return (
    <div className='grid grid-rows-2 gap-3 p-3 h-full overflow-hidden'>
      {index === 0 ? (
        <DemoPanel label={`Peer ${index} — markdown, the string as stored`} testId='markdown-panel'>
          <MarkdownEditor text={text} />
        </DemoPanel>
      ) : (
        <DemoPanel label={`Peer ${index} — rich text, the lensed block tree`} testId='rich-text-panel'>
          <RichTextEditor text={text} />
        </DemoPanel>
      )}
      <DemoPanel label={`Peer ${index} — blocks`} testId='blocks-panel'>
        <BlockList text={text} />
      </DemoPanel>
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
export const Spec: Story = {
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
    // preflight resets heading sizes and list markers, so an earlier version of this test passed while
    // every one of them rendered as plain text.
    const paragraph = editor.querySelector<HTMLElement>('p')!;
    const heading1 = editor.querySelector<HTMLElement>('h1')!;
    const heading2 = editor.querySelector<HTMLElement>('h2')!;
    const size = (element: HTMLElement) => Number.parseFloat(getComputedStyle(element).fontSize);
    await expect(size(heading1)).toBeGreaterThan(size(paragraph));
    await expect(size(heading2)).toBeGreaterThan(size(paragraph));

    // Weight and slant are asserted on `font-variation-settings`, NOT `font-weight`/`font-style`.
    // The theme sets `font-synthesis: none` and pins `'wght' 400` at `:root`, so `font-weight: 700`
    // computes as 700 and still renders as regular — which is exactly how bold shipped broken while a
    // `fontWeight` assertion passed. The variation axes are what the variable font actually reads.
    const axes = (element: HTMLElement) => getComputedStyle(element).fontVariationSettings;
    await expect(axes(paragraph)).toContain('"wght" 400');
    await expect(axes(strong)).toContain('"wght" 700');
    await expect(axes(heading1)).toContain('"wght" 600');
    await expect(axes(heading2)).toContain('"wght" 600');
    await expect(axes(em)).toContain('"slnt" -10');

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
        // Pinned to the heading line: the splice rewrote that block's range and put the text where the
        // caret was, markers preserved. A bare `toContain('EDIT')` would also pass for an edit that
        // landed in the wrong block, or in front of the `#`.
        await expect(stored).toContain('# One object, two editorsEDIT');
        // Every other line survived verbatim. A whole-document rewrite — or a lens that re-serialized
        // the tree — would show up right here.
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
    const line = lineContaining(find('markdown-editor'), 'So an edit splices');
    await expect(line).toBeInTheDocument();
    await typeAtEndOfLine(line, 'SYNC');

    // The edit went into the last bullet in the SOURCE — assert that before anything downstream, so a
    // caret that landed in the wrong block fails here rather than passing on a looser check later.
    await waitFor(
      async () =>
        await expect(find('raw-content').textContent ?? '').toContain('- So an edit splices that range aloneSYNC'),
      { timeout: 10_000 },
    );

    await waitFor(
      async () => {
        // The lens re-parsed it as the same bullet, not as a new block...
        await expect(find('block-list')).toHaveTextContent('bullet');
        await expect(find('block-list').textContent ?? '').toMatch(/bullet \[\d+,\d+\) So an edit splices .*SYNC/);
        // ...and the lensed editor shows it in the second list item, the list still intact.
        const items = editor.querySelectorAll<HTMLElement>('li');
        await expect(items).toHaveLength(2);
        await expect(editor.querySelectorAll('ul')).toHaveLength(1);
        await expect(items[1].textContent).toBe('So an edit splices that range aloneSYNC');
        // The untouched bullet is untouched.
        await expect(items[0].textContent).toBe('Each block remembers its source range');
        // The earlier lensed edit is still there: neither side clobbered the other.
        await expect(find('raw-content').textContent ?? '').toContain('EDIT');
      },
      { timeout: 10_000 },
    );

    // The heading is still a heading. A source edit that landed at offset 0 would demote it to a
    // paragraph by pushing text in front of the `#` — which is exactly how the bad caret was caught.
    await expect(editor.querySelector('h1')?.textContent).toBe('One object, two editorsEDIT');
    // Marks survive an edit from the source side, since the lens re-parses rather than re-serializing.
    await expect(editor.querySelector('strong')?.textContent).toBe('what is stored');
  },
};

/**
 * Two peers: markdown on one, rich text on the other, replicating live. The single-peer {@link Spec}
 * carries the assertions; this one is for watching a block edit on one peer land as a splice in the
 * other peer's markdown, and a source edit come back the other way.
 */
export const Collaboration: Story = {
  render: CollaborationStory,
  decorators: [twoPeers],
};
