//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect } from 'storybook/test';

import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { trim } from '@dxos/util';

import { chatRegistry } from '../../testing/index.ts';
import { HtmlBlock } from './HtmlBlock.tsx';
import { MarkdownBlock } from './MarkdownBlock.tsx';
import { WidgetStateProvider, createWidgetStateStore } from './widget-state.tsx';

const MARKDOWN = trim`
  ### A markdown item

  One read-only CodeMirror document per message: **bold**, *emphasis*, [a link](https://dxos.org),
  \`inline code\`, and a fence —

  \`\`\`ts
  const answer = 42;
  \`\`\`

  1. Ordered
  2. Lists
`;

const WIDGETS = trim`
  <prompt>What does a turn look like?</prompt>

  <reasoning>Considering the block kinds a model emits, in order.</reasoning>

  <toolCall name="search" input="{}"></toolCall>

  The answer's prose follows the widgets, as ordinary markdown.
`;

const HIGHLIGHTED = 'The needle sits in the middle of this sentence, and the ranges paint it.';

const HTML = trim`
  <h3>An HTML item</h3>
  <p>Sanitized prose for content that arrives as markup — the email case. <b>Tags</b> render,
  <i>scripts</i> do not.</p>
  <ul><li>One</li><li>Two</li></ul>
`;

const store = createWidgetStateStore();

/**
 * One story per item kind, outside any list: the item is the unit the feed mounts per message, and
 * this is where its rendering is judged on its own — a defect here is the item's, never the
 * placement's. Kinds mirror `ItemContent`: markdown (a read-only CodeMirror document), markdown
 * with block widgets (the assistant turn's shape), markdown with highlights (what decorations
 * paint), and html (sanitized prose, the email case).
 */
type StoryArgs = {
  kind: 'markdown' | 'widgets' | 'highlighted' | 'html';
};

const DefaultStory = ({ kind }: StoryArgs) => {
  switch (kind) {
    case 'markdown':
      return <MarkdownBlock text={MARKDOWN} />;
    case 'widgets':
      return (
        <WidgetStateProvider store={store}>
          <MarkdownBlock text={WIDGETS} registry={chatRegistry} />
        </WidgetStateProvider>
      );
    case 'highlighted': {
      const offset = HIGHLIGHTED.indexOf('needle');
      return <MarkdownBlock text={HIGHLIGHTED} hits={[[offset, offset + 'needle'.length]]} />;
    }
    case 'html':
      return <HtmlBlock html={HTML} />;
  }
};

const meta: Meta<StoryArgs> = {
  title: 'ui/react-ui-feed/components/Block',
  render: DefaultStory,
  decorators: [withLayout({ layout: 'column', classNames: 'w-[40rem] p-4' }), withTheme()],
  args: { kind: 'markdown' },
  argTypes: {
    kind: { control: 'select', options: ['markdown', 'widgets', 'highlighted', 'html'] },
  },
};

export default meta;

type Story = StoryObj<StoryArgs>;

/** Passive: flip `kind` in the controls. */
export const Default: Story = {};

export const Markdown: Story = {
  args: { kind: 'markdown' },
  play: async ({ canvasElement }) => {
    // The document rendered as markdown, not as its source: decoration replaced the heading marks.
    await expect(canvasElement.querySelector('.cm-content')).toBeTruthy();
    await expect(canvasElement.textContent).toContain('A markdown item');
  },
};

export const Widgets: Story = {
  args: { kind: 'widgets' },
  play: async ({ canvasElement }) => {
    // The tags became widgets: the reasoning panel mounts as a React component inside the editor,
    // and the raw angle brackets are gone from what the reader sees.
    for (let frame = 0; frame < 60 && !canvasElement.querySelector('[data-testid="feed.widget"]'); frame++) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }

    await expect(canvasElement.querySelector('[data-testid="feed.widget"]')).toBeTruthy();
    await expect(canvasElement.textContent).not.toContain('<reasoning>');
  },
};

export const Highlighted: Story = {
  args: { kind: 'highlighted' },
  play: async ({ canvasElement }) => {
    // What `useDecorations` paints, at the item level: the range carries a highlight mark.
    for (let frame = 0; frame < 60 && !canvasElement.querySelector('.dx-feed-hit'); frame++) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }

    await expect(canvasElement.querySelector('.dx-feed-hit')).toBeTruthy();
  },
};

export const Html: Story = {
  args: { kind: 'html' },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('h3')).toBeTruthy();
    await expect(canvasElement.textContent).toContain('An HTML item');
  },
};
