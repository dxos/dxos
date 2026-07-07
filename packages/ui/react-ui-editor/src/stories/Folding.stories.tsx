//
// Copyright 2026 DXOS.org
//

/**
 * Stories for turn folding: a chat transcript is treated as a sequence of turns, and each turn's
 * response is a foldable region built on CodeMirror's native folding. The fold ranges are supplied
 * by the story via a `TurnSource` — here, one that scans `<prompt>` boundaries (a user turn is a
 * `<prompt>` element; the response is everything up to the next prompt).
 */

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo, useState } from 'react';

import { random } from '@dxos/random';
import { Panel, SystemIconButton, Toolbar, useThemeContext } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import {
  PROMPT_ELEMENT,
  createBasicExtensions,
  createThemeExtensions,
  createTurnSource,
  decorateMarkdown,
  documentSlots,
  extendedMarkdown,
  foldTurns,
  turnFolding,
  unfoldTurns,
  xmlBlockDecoration,
  xmlFormatting,
} from '@dxos/ui-editor';

import { useTextEditor } from '../hooks';

const source = createTurnSource(PROMPT_ELEMENT);

/** Extensions shared by the stories: markdown + prompt bubbles + turn folding. */
const chatExtensions = (themeMode: 'dark' | 'light') => [
  createThemeExtensions({ themeMode, slots: documentSlots }),
  createBasicExtensions({ readOnly: true, lineWrapping: true }),
  decorateMarkdown(),
  extendedMarkdown({ registry: {} }),
  xmlFormatting({ skip: ['prompt'] }),
  xmlBlockDecoration({
    tag: 'prompt',
    contentClass: 'bg-green-600 text-black p-1',
    hideTags: true,
  }),
  turnFolding({ source }),
];

const PROMPTS = [
  'Hello',
  'What is ECHO and how does it relate to spaces?',
  'Show me how queries and replication work together.',
  'Summarize the tradeoffs of a local-first architecture.',
  'What comes next on the roadmap?',
];

/** Builds a large, deterministic transcript: each prompt followed by several lorem paragraphs. */
const buildSampleText = (): string => {
  random.seed(1234);
  return PROMPTS.map((prompt) => {
    const body = Array.from({ length: 4 }, () => random.lorem.paragraphs()).join('\n\n');
    return [`<prompt>${prompt}</prompt>`, '', body].join('\n');
  }).join('\n\n');
};

const sampleText = buildSampleText();

type StoryProps = { text: string };

const DefaultStory = ({ text }: StoryProps) => {
  const { themeMode } = useThemeContext();
  const [collapsed, setCollapsed] = useState(false);
  const extensions = useMemo(() => chatExtensions(themeMode), [themeMode]);
  const { parentRef, view } = useTextEditor({ initialValue: text, extensions });

  return (
    <Panel.Root>
      <Panel.Toolbar>
        <Toolbar.Root classNames='dx-document'>
          <SystemIconButton.Expander
            active={!collapsed}
            label={collapsed ? 'Expand all' : 'Collapse all'}
            onClick={() => {
              if (!view) {
                return;
              }
              const next = !collapsed;
              setCollapsed(next);
              if (next) {
                foldTurns(view, source);
              } else {
                unfoldTurns(view, source);
              }
            }}
          />
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content className='grid overflow-hidden'>
        <div ref={parentRef} className='dx-expander' />
      </Panel.Content>
    </Panel.Root>
  );
};

const meta = {
  title: 'ui/react-ui-editor/Folding',
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <DefaultStory text={sampleText} />,
};
