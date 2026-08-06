//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type PropsWithChildren, useEffect, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Button, Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { type ContentBlock, Message as MessageType } from '@dxos/types';

import { translations } from '#translations';

import { Message } from '../Message';
import { STORY_IDENTITY, getStoryMetadata } from '../testing';
import { MessageRenderer } from './MessageRenderer';

const text = (text: string): ContentBlock.Any => ({ _tag: 'text', text }) as ContentBlock.Any;

/**
 * A message as the transcript renders it, so a story is comparable with `Thread.Conversation`
 * rather than being a bare editor on an empty canvas — the body is only ever seen inside its row.
 */
const Row = ({ children }: PropsWithChildren) => {
  const metadata = getStoryMetadata(MessageType.make({ sender: STORY_IDENTITY, blocks: [] }));
  return (
    <Message.Root {...metadata} continues={false}>
      <Message.Heading authorName={metadata.authorName} timestamp={metadata.timestamp} />
      {children}
    </Message.Root>
  );
};

const BODY = [
  'A message body is **markdown**, so `code`, _emphasis_ and [links](https://dxos.org) render.',
  '',
  '- and a list',
  '- renders as one',
].join('\n');

const DefaultStory = () => (
  <Row>
    <MessageRenderer blocks={[text(BODY)]} />
  </Row>
);

/** Tokens arriving one at a time, as a model streams them into the tail block. */
const StreamingStory = () => {
  const [blocks, setBlocks] = useState<ContentBlock.Any[]>(() => [text('')]);

  useEffect(() => {
    const tokens = 'Streaming arrives one token at a time, **growing the tail** of the message.'.split(' ');
    let index = 0;
    const interval = setInterval(() => {
      if (index >= tokens.length) {
        clearInterval(interval);
        return;
      }

      setBlocks([text(tokens.slice(0, ++index).join(' '))]);
    }, 60);

    return () => clearInterval(interval);
  }, []);

  return (
    <Row>
      <MessageRenderer blocks={blocks} />
    </Row>
  );
};

/** Editing in place: the same view becomes writable rather than being rebuilt as one. */
const EditingStory = () => {
  const [blocks, setBlocks] = useState<ContentBlock.Any[]>(() => [text('The stored body, with **markdown** in it.')]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  return (
    <div className='flex flex-col gap-2'>
      <Toolbar.Root>
        <Button data-testid='story.toggle-edit' onClick={() => setEditing((value) => !value)}>
          {editing ? 'Editing' : 'Edit'}
        </Button>
      </Toolbar.Root>
      <Row>
        <MessageRenderer
          classNames={editing ? 'rounded-sm ring-1 ring-accent-bg bg-attention-surface px-1.5 py-0.5' : undefined}
          blocks={blocks}
          editing={editing}
          onChange={setDraft}
          onCommit={() => {
            setBlocks([text(draft)]);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      </Row>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-thread/MessageRenderer',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: { translations },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

const content = (canvasElement: HTMLElement) => canvasElement.querySelector<HTMLElement>('.cm-content');

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(content(canvasElement)).not.toBeNull());
    // Decorated, not shown as source — which is the whole claim, and what asserting on the rendered
    // words alone would have missed: `**markdown**` reads as `markdown`, the link keeps its label
    // and drops its target, and the list marker is drawn rather than typed.
    const rendered = content(canvasElement)!.textContent ?? '';
    await expect(rendered).toContain('A message body is markdown');
    await expect(rendered).not.toContain('**');
    await expect(rendered).not.toContain('https://dxos.org');
    await expect(rendered).not.toContain('- and a list');
  },
};

/**
 * The editor is written to, not rebuilt.
 *
 * Asserted by identity: the same `.cm-content` node is there before and after the stream, which is
 * what a caret, a selection and a scroll position survive. Rebuilding per revision — the previous
 * behaviour, since the view's dependencies included the text — replaces the node on every token.
 */
export const Streaming: Story = {
  render: StreamingStory,
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(content(canvasElement)).not.toBeNull());
    const before = content(canvasElement);

    await waitFor(() => expect(content(canvasElement)?.textContent).toContain('growing the tail'), { timeout: 10_000 });
    await expect(content(canvasElement)).toBe(before);
  },
};

/** Entering edit mode keeps the view; Enter commits what was typed and Escape discards it. */
export const Editing: Story = {
  render: EditingStory,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(content(canvasElement)).not.toBeNull());
    const before = content(canvasElement);
    await expect(content(canvasElement)!.getAttribute('contenteditable')).not.toBe('true');

    await userEvent.click(canvas.getByTestId('story.toggle-edit'));
    await waitFor(() => expect(content(canvasElement)!.getAttribute('contenteditable')).toBe('true'));
    // Same view, reconfigured — not a second editor built over the same text.
    await expect(content(canvasElement)).toBe(before);

    await userEvent.click(content(canvasElement)!);
    await userEvent.keyboard(' Edited.');
    await waitFor(() => expect(content(canvasElement)!.textContent).toContain('Edited.'));
    await userEvent.keyboard('{Enter}');

    await waitFor(() => expect(content(canvasElement)!.getAttribute('contenteditable')).not.toBe('true'));
    // The edit reached the blocks, which is what committing means.
    await expect(content(canvasElement)!.textContent).toContain('Edited.');
    await expect(content(canvasElement)).toBe(before);

    // Escape discards: the body goes back to what the blocks hold, not to what was typed.
    await userEvent.click(canvas.getByTestId('story.toggle-edit'));
    await waitFor(() => expect(content(canvasElement)!.getAttribute('contenteditable')).toBe('true'));
    await userEvent.click(content(canvasElement)!);
    await userEvent.keyboard(' Discarded.');
    await waitFor(() => expect(content(canvasElement)!.textContent).toContain('Discarded.'));
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(content(canvasElement)!.getAttribute('contenteditable')).not.toBe('true'));
    await waitFor(() => expect(content(canvasElement)!.textContent).not.toContain('Discarded.'));
  },
};
