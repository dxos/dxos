//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { MarkdownBlock, WidgetStateProvider, createWidgetStateStore } from '@dxos/react-ui-feed';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { ContentBlock } from '@dxos/types';
import { trim } from '@dxos/util';

import { assistantRegistry } from './registry.tsx';
import { translations } from './translations.ts';

// Shared across stories: the store is the thread's, not an item's — a widget's state has to survive
// the item unmounting as the reader scrolls past it.
const store = createWidgetStateStore();

/**
 * Every tag {@link assistantRegistry} registers, rendered through the shipping path: the document
 * the renderer emits, in the feed's own `MarkdownBlock` — the container a thread mounts per
 * message. One story per tag, so a widget can be worked on in isolation without driving a whole
 * conversation.
 */
type StoryArgs = {
  content: string;
};

// Stands in for the query container a thread gets from `Column.Center`, so `cqi` is not the viewport.
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
    content: trim`
      <synthetic>
      Completed the checklist:
      <checklist>
      1. [x] Review new messages.
      2. [x] Respond to new messages.
      3. [x] Archive old messages.
      </checklist>
      </synthetic>`,
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
    // TODO(burdon): Consider addition container for suggestions (like select).
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

const call = (id: string, name: string, input: unknown = { query: 'status', limit: 10 }): ContentBlock.ToolCall => ({
  _tag: 'toolCall',
  toolCallId: id,
  name,
  input: JSON.stringify(input),
  providerExecuted: false,
});

const result = (id: string, name: string, value: unknown): ContentBlock.ToolResult => ({
  _tag: 'toolResult',
  toolCallId: id,
  name,
  result: JSON.stringify(value),
  providerExecuted: false,
});

const failure = (id: string, name: string, error: string): ContentBlock.ToolResult => ({
  _tag: 'toolResult',
  toolCallId: id,
  name,
  error,
  providerExecuted: false,
});

const operationCall = (
  id: string,
  name: string,
  operationName: string,
  operationIcon: string,
  input: unknown = { query: 'status', limit: 10 },
): ContentBlock.ToolCall => ({
  ...call(id, name, input),
  operationKey: `dxos.org/operation/${name}`,
  operationName,
  operationIcon,
});

const status = (text: string): ContentBlock.Status => ({ _tag: 'status', statusText: text });

const reasoning = (text: string): ContentBlock.Reasoning => ({ _tag: 'reasoning', reasoningText: text });

/** One tag per run, which is what the thread's projection produces after folding a turn's messages. */
const toolkit = (blocks: ContentBlock.Any[]): string => `<toolkit>${JSON.stringify(blocks)}</toolkit>`;

const toolchain: [ContentBlock.ToolCall, ContentBlock.ToolResult][] = [
  [
    {
      _tag: 'toolCall',
      toolCallId: 'tc-1',
      name: 'example_tool',
      input: JSON.stringify({ query: 'status', limit: 10 }),
      providerExecuted: false,
    },
    {
      _tag: 'toolResult',
      toolCallId: 'tc-1',
      name: 'example_tool',
      result: JSON.stringify({ ok: true, rows: [{ id: 1 }, { id: 2 }] }),
      providerExecuted: false,
    },
  ],
  [
    {
      _tag: 'toolCall',
      toolCallId: 'tc-2',
      name: 'example_tool',
      input: JSON.stringify({ query: 'status', limit: 10 }),
      providerExecuted: false,
    },
    {
      _tag: 'toolResult',
      toolCallId: 'tc-2',
      name: 'example_tool',
      result: JSON.stringify({ ok: true, rows: [{ id: 1 }, { id: 2 }, { id: 3 }] }),
      providerExecuted: false,
    },
  ],
];

/** A finished run: the summary counts, and every call is one row a click from its payload. */
export const Toolkit: Story = {
  args: {
    content: toolkit([
      call('tc-1', 'read_document'),
      result('tc-1', 'read_document', { ok: true, rows: [{ id: 1 }, { id: 2 }] }),
      call('tc-2', 'search_index'),
      result('tc-2', 'search_index', { ok: true, hits: 12 }),
      call('tc-3', 'write_document'),
      result('tc-3', 'write_document', { ok: true }),
    ]),
  },
};

/** A lone call whose payload is far taller than the panel: collapsed, it must not scroll. */
export const ToolkitSingleLarge: Story = {
  args: {
    content: toolkit([
      call('tc-1', 'markdown-update', {
        doc: 'echo://SPACE/01ABC',
        edits: Array.from({ length: 12 }, (_, i) => ({ oldString: `old ${i}`, newString: `new ${i}` })),
      }),
      result('tc-1', 'markdown-update', { newContent: 'x'.repeat(400) }),
    ]),
  },
};

/** A single call still in flight: the summary names it rather than counting. */
export const ToolkitRunning: Story = {
  args: {
    content: toolkit([call('tc-1', 'read_document')]),
  },
};

/** A later call in flight: the summary names the active one and carries the run's count. */
export const ToolkitRunningRun: Story = {
  args: {
    content: toolkit([
      call('tc-1', 'read_document'),
      result('tc-1', 'read_document', { ok: true }),
      call('tc-2', 'search_index'),
      result('tc-2', 'search_index', { ok: true }),
      call('tc-3', 'write_document'),
    ]),
  },
};

/** A failed call, which the summary reports without the reader opening anything. */
export const ToolkitFailed: Story = {
  args: {
    content: toolkit([
      call('tc-1', 'read_document'),
      result('tc-1', 'read_document', { ok: true }),
      call('tc-2', 'search_index'),
      failure('tc-2', 'search_index', 'ENOENT: no such file or directory'),
      call('tc-3', 'write_document'),
      result('tc-3', 'write_document', { ok: true }),
    ]),
  },
};

/** The pre-fold shape, kept so a regression to one panel per message is visible. */
export const ToolkitUnmerged: Story = {
  args: {
    content: toolchain.map(([toolCall, toolResult]) => toolkit([toolCall, toolResult])).join('\n\n'),
  },
};

/** Operation-backed calls: the row shows the operation's name and icon, not the raw tool name. */
export const ToolkitOperations: Story = {
  args: {
    content: toolkit([
      operationCall('tc-1', 'markdown-update', 'Update document', 'ph--file-text--regular'),
      result('tc-1', 'markdown-update', { ok: true }),
      operationCall('tc-2', 'space-query', 'Query space', 'ph--planet--regular'),
      result('tc-2', 'space-query', { hits: 12 }),
    ]),
  },
};

/** Status and reasoning narrate the run from inside its panel, and the summary leads with status. */
export const ToolkitNarrated: Story = {
  args: {
    content: toolkit([
      reasoning('The document has to be read before it can be edited, so the read comes first.'),
      operationCall('tc-1', 'markdown-update', 'Update document', 'ph--file-text--regular'),
      result('tc-1', 'markdown-update', { ok: true }),
      status('Indexing the space'),
      operationCall('tc-2', 'space-query', 'Query space', 'ph--planet--regular'),
      result('tc-2', 'space-query', { hits: 12 }),
    ]),
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
