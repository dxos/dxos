//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { MarkdownBlock, WidgetStateProvider, createWidgetStateStore } from '@dxos/react-ui-feed';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { assistantRegistry } from './registry';
import { translations } from './translations';

/**
 * Every tag {@link assistantRegistry} registers, rendered through the shipping path: the document
 * the renderer emits, in the feed's own `MarkdownBlock` — the container a thread mounts per
 * message. One story per tag, so a widget can be worked on in isolation without driving a whole
 * conversation.
 */
type StoryArgs = {
  content: string;
};

// Shared across stories: the store is the thread's, not an item's — a widget's state has to survive
// the item unmounting as the reader scrolls past it.
const store = createWidgetStateStore();

const DefaultStory = ({ content }: StoryArgs) => (
  <WidgetStateProvider store={store}>
    <MarkdownBlock text={content} registry={assistantRegistry} />
  </WidgetStateProvider>
);

const escapeXml = (raw: string): string => raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** The renderer's own tag shape: content is escaped, so the widget parses back exactly what it sent. */
const tag = (name: string, content: string, attributes = ''): string =>
  `<${name}${attributes}>${escapeXml(content)}</${name}>`;

const meta = {
  title: 'ui/react-ui-assistant/registry',
  component: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column', classNames: 'p-4' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

//
// DOM widgets
//

export const Prompt: Story = {
  args: {
    content: tag('prompt', 'Hello world!'),
  },
};

export const LinkPreview: Story = {
  args: {
    content: 'See [Meeting notes](dxn:echo:@:01J8Z1QK0000000000000000) for the decisions.',
  },
};

export const Synthetic: Story = {
  args: {
    content: tag('synthetic', 'Trigger fired: inbox.message.received (3 new messages).'),
  },
};

export const Reasoning: Story = {
  args: {
    content: tag(
      'reasoning',
      'The user is asking about nested flex layouts and overflow. I should mention min-height 0 and grid track sizing.',
    ),
  },
};

export const Status: Story = {
  args: {
    content: tag('status', 'Searching the workspace…'),
  },
};

export const Reference: Story = {
  args: {
    content: `Filed under ${tag('reference', 'Design notes', ' ref="dxn:echo:@:01J8Z1QK0000000000000000"')}.`,
  },
};

export const Suggestion: Story = {
  args: {
    content: [
      tag('suggestion', 'Show me the layout rules'),
      tag('suggestion', 'Explain min-h-0'),
      tag('suggestion', 'Draft a fix'),
    ].join(' '),
  },
};

export const Select: Story = {
  args: {
    content:
      '<select><option>Scroll the leaf</option><option>Scroll the panel</option><option>Do nothing</option></select>',
  },
};

export const Stats: Story = {
  args: {
    content: tag('stats', '1,204 tokens · 2.4s'),
  },
};

//
// React widgets (portaled outside the editor)
//

export const Toolkit: Story = {
  args: {
    content: tag(
      'toolkit',
      JSON.stringify([
        {
          _tag: 'toolCall',
          toolCallId: 'tc-story-1',
          name: 'example_tool',
          input: JSON.stringify({ query: 'status', limit: 10 }),
          providerExecuted: false,
        },
        {
          _tag: 'toolResult',
          toolCallId: 'tc-story-1',
          name: 'example_tool',
          result: JSON.stringify({ ok: true, rows: [{ id: 1 }, { id: 2 }] }),
          providerExecuted: false,
        },
      ]),
    ),
  },
};

export const Summary: Story = {
  args: {
    content: tag('summary', 'The thread settled on min-h-0 for every flex ancestor of the scroll viewport.'),
  },
};

// Rendered by the fallback here; the host overrides it with a widget that can dispatch the surface.
export const Surface: Story = {
  args: {
    content: tag('surface', JSON.stringify({ id: 'obj-1' }), ' role="card"'),
  },
};

export const Json: Story = {
  args: {
    content: tag('json', JSON.stringify({ _tag: 'unknown', payload: { value: 42 } })),
  },
};
