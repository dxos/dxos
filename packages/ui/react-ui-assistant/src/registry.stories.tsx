//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { MarkdownBlock, WidgetStateProvider, createWidgetStateStore } from '@dxos/react-ui-feed';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { trim } from '@dxos/util';

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

// The query container a thread gets from `MessageList`'s `Column.Center`: a widget caps itself
// against it, and without one `cqi` falls back to the viewport.
const DefaultStory = ({ content }: StoryArgs) => (
  <WidgetStateProvider store={store}>
    <div className='dx-container-type-inline-size'>
      <MarkdownBlock text={content} registry={assistantRegistry} />
    </div>
  </WidgetStateProvider>
);

const meta = {
  title: 'ui/react-ui-assistant/widgets/Registry',
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
    content: '<prompt>Hello world!</prompt>',
  },
};

export const LinkPreview: Story = {
  args: {
    content: 'See [Meeting notes](dxn:echo:@:01J8Z1QK0000000000000000) for the decisions.',
  },
};

export const Synthetic: Story = {
  args: {
    content: '<synthetic>Trigger fired: inbox.message.received (3 new messages).</synthetic>',
  },
};

export const Reasoning: Story = {
  args: {
    content: trim`
      <reasoning>
      The user is asking about nested flex layouts and overflow. 
      I should mention min-height 0 and grid track sizing.
      </reasoning>
    `,
  },
};

export const Status: Story = {
  args: {
    content: '<status>Searching the workspace…</status>',
  },
};

export const Reference: Story = {
  args: {
    content: 'Filed under <reference ref="dxn:echo:@:01J8Z1QK0000000000000000">Design notes</reference>.',
  },
};

export const Suggestion: Story = {
  args: {
    // Joined, not one per line: the renderer emits a run of suggestions on a single line, and a
    // document newline is a new line in the editor no matter how the chips are styled.
    content: [
      '<suggestion>Show me the layout rules (this is a very very long suggestion that should truncate)</suggestion>',
      '<suggestion>Suggestion 2</suggestion>',
      '<suggestion>Suggestion 3</suggestion>',
    ].join(''),
  },
};

export const Select: Story = {
  args: {
    content: trim`
      <select>
        <option>Select red</option>
        <option>Select green</option>
        <option>Select blue</option>
        <option>Select yellow</option>
        <option>Select purple</option>
        <option>Select orange</option>
        <option>Select pink</option>
      </select>
    `,
  },
};

export const Stats: Story = {
  args: {
    content: '<stats>1,204 tokens · 2.4s</stats>',
  },
};

//
// React widgets (portaled outside the editor)
//

export const Toolkit: Story = {
  args: {
    content: `<toolkit>${JSON.stringify([
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
    ])}</toolkit>`,
  },
};

export const Summary: Story = {
  args: {
    content: '<summary>The thread settled on min-h-0 for every flex ancestor of the scroll viewport.</summary>',
  },
};

// Rendered by the fallback here; the host overrides it with a widget that can dispatch the surface.
export const Surface: Story = {
  args: {
    content: `<surface role="card">${JSON.stringify({ id: 'obj-1' })}</surface>`,
  },
};

export const Json: Story = {
  args: {
    content: `<json>${JSON.stringify({ _tag: 'unknown', payload: { value: 42 } })}</json>`,
  },
};
