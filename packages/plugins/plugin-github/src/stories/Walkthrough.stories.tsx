//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import { useThemeContext } from '@dxos/react-ui';
import { useTextEditor } from '@dxos/react-ui-editor';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import {
  type DiffLayout,
  type DiffLineTarget,
  type ThemeExtensionsOptions,
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  diffBlocks,
  walkthroughSidebar,
  walkthroughTheme,
} from '@dxos/ui-editor';

import { translations } from '#translations';

import { LineCommentPopover } from '../components/CommentComposer/index.ts';
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
  /** Offer the hover comment button on each diff line, and float the composer at the line picked. */
  comments?: boolean;
};

/**
 * A walkthrough is ONE markdown document: the ```diff fences are block widgets inside it, not a
 * separate diff view the prose is wrapped around.
 */
const DefaultStory = ({ text, layout, sidebar = 'full', comments }: StoryArgs) => {
  const { themeMode } = useThemeContext();
  const [target, setTarget] = useState<DiffLineTarget>();
  const [comment, setComment] = useState('');
  const anchorRef = useRef<HTMLElement | null>(null);

  const handleLineComment = useCallback((next: DiffLineTarget, anchor: HTMLElement) => {
    anchorRef.current = anchor;
    setTarget(next);
  }, []);

  const handleCancel = useCallback(() => {
    setTarget(undefined);
    anchorRef.current = null;
  }, []);

  const extensions = useMemo(
    () => [
      createThemeExtensions({ themeMode, slots: walkthroughSlots }),
      createBasicExtensions({ lineWrapping: true, readOnly: true }),
      createMarkdownExtensions(),
      decorateMarkdown(),
      walkthroughTheme(),
      diffBlocks({ layout, ...(comments ? { onLineComment: handleLineComment } : {}) }),
      sidebar === 'none' ? [] : walkthroughSidebar({ variant: sidebar }),
    ],
    [themeMode, layout, sidebar, comments, handleLineComment],
  );
  const { parentRef } = useTextEditor({ initialValue: text, extensions }, [extensions]);

  return (
    <>
      <div ref={parentRef} className='dx-fill overflow-auto' />
      <LineCommentPopover
        open={!!target}
        anchorRef={anchorRef}
        target={target}
        value={comment}
        onValueChange={setComment}
        onSubmit={handleCancel}
        onCancel={handleCancel}
      />
    </>
  );
};

const meta = {
  title: 'plugins/plugin-github/stories/Walkthrough',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen', controls: { disable: true }, translations },
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

/** The comment composer floats at the diff line it addresses, not in a band above the document. */
export const LineComment: Story = {
  args: { text: WALKTHROUGH, comments: true, sidebar: 'none' },
};
