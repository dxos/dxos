//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { useThemeContext } from '@dxos/react-ui';
import { useTextEditor } from '@dxos/react-ui-editor';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import {
  type DiffLayout,
  type ThemeExtensionsOptions,
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  diffBlocks,
  walkthroughSidebar,
  walkthroughTheme,
} from '@dxos/ui-editor';

import { WALKTHROUGH } from './walkthrough-fixture.ts';

/**
 * A definite content width, which the chunks cap themselves against: a block widget with no query
 * container above it would size the document to its own longest line.
 */
const walkthroughSlots: ThemeExtensionsOptions['slots'] = {
  content: {
    className: 'dx-container-type-inline-size w-full mx-auto! max-w-[min(72rem,100%-3rem)] py-3!',
  },
};

type StoryArgs = {
  text: string;
  layout?: DiffLayout;
  sidebar?: 'full' | 'stats' | 'none';
};

/**
 * A walkthrough is ONE markdown document: the ```diff fences are block widgets inside it, not a
 * separate diff view the prose is wrapped around.
 */
const DefaultStory = ({ text, layout, sidebar = 'full' }: StoryArgs) => {
  const { themeMode } = useThemeContext();
  const extensions = useMemo(
    () => [
      createThemeExtensions({ themeMode, slots: walkthroughSlots }),
      createBasicExtensions({ lineWrapping: true, readOnly: true }),
      createMarkdownExtensions(),
      decorateMarkdown(),
      walkthroughTheme(),
      diffBlocks({ layout }),
      sidebar === 'none' ? [] : walkthroughSidebar({ variant: sidebar }),
    ],
    [themeMode, layout, sidebar],
  );
  const { parentRef } = useTextEditor({ initialValue: text, extensions }, [extensions]);

  return <div ref={parentRef} className='dx-fill overflow-auto' />;
};

const meta = {
  title: 'plugins/plugin-github/stories/Walkthrough',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen', controls: { disable: true } },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The whole thing: prose, headings, side-by-side chunks and the navigation rail. */
export const Default: Story = {
  args: { text: WALKTHROUGH },
};

/** The rail Graphite collapses to when the reader wants the width back. */
export const StatsRail: Story = {
  args: { text: WALKTHROUGH, sidebar: 'stats' },
};

/** Unified chunks, which is also what the side-by-side layout falls back to in a narrow pane. */
export const Inline: Story = {
  args: { text: WALKTHROUGH, layout: 'inline', sidebar: 'none' },
};

/** No rail, so the chunks are the only thing the document adds to plain markdown. */
export const Chunks: Story = {
  args: { text: WALKTHROUGH, sidebar: 'none' },
};
