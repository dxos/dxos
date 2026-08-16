//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { IconButton, Input, Panel, Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { type Message } from '@dxos/types';
import { mx } from '@dxos/ui-theme';

import { type FeedAnchor, type SearchHit, defaultRenderer, searchFeed, sliceFeed } from '../../model';
import { createMessages } from '../../testing';
import { type MessageChromeProps, MessageList, useMessageList } from './MessageList';

//
// Chrome
//

/**
 * Per-message chrome, supplied by the host rather than the engine — the thing a single thread-wide
 * document cannot do without injecting widgets into its own markdown.
 */
const TestChrome = ({ message, index, selected, onSelect, children }: MessageChromeProps) => {
  const role = message.sender.role ?? 'user';
  const time = new Date(message.created).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div
      className={mx(
        'group relative grid grid-cols-[2rem_1fr] gap-2 px-2 py-2 border-b border-subdued-separator',
        selected && 'bg-hoverSurface',
      )}
      data-testid='feed.message'
    >
      <div className='flex flex-col items-center gap-1'>
        <Input.Root>
          <Input.Checkbox
            checked={selected}
            onCheckedChange={() => onSelect(message.id, true)}
            data-testid='feed.message.select'
          />
        </Input.Root>
      </div>

      {/*
        Fork / rewind / reply — chrome, not content. Positioned out of flow and toggled by opacity:
        anything that changes a row's height on hover re-triggers the virtualizer's measurement, and
        a pointer moving down the list during a scroll then shifts every row below it.
      */}
      <div className='absolute right-1 top-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100'>
        <IconButton icon='ph--git-branch--regular' iconOnly label='Fork' variant='ghost' size={3} />
        <IconButton icon='ph--arrow-counter-clockwise--regular' iconOnly label='Rewind' variant='ghost' size={3} />
        <IconButton icon='ph--arrow-bend-up-left--regular' iconOnly label='Reply' variant='ghost' size={3} />
      </div>

      <div className='min-is-0'>
        <div className='flex items-center gap-2 text-xs text-description'>
          <span className='font-medium'>{message.sender.name ?? role}</span>
          <span>{time}</span>
          <span className='text-subdued'>#{index}</span>
        </div>
        {children}
      </div>
    </div>
  );
};

//
// Story harness
//

type StoryProps = {
  count: number;
  streaming?: boolean;
  estimateSize?: number;
};

const DefaultStory = ({ count, streaming, estimateSize }: StoryProps) => {
  const [messages, setMessages] = useState<Message.Message[]>(() => createMessages({ count }));
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);
  const [fps, setFps] = useState<number | null>(null);

  const hits = useMemo(() => searchFeed(messages, defaultRenderer, query), [messages, query]);

  // Streaming: extend the tail message so the item reconciles by delta and the virtualizer
  // re-measures a growing row — the case that decides whether scroll anchoring holds.
  const [streamingId, setStreamingId] = useState<string | undefined>();
  useEffect(() => {
    if (!streaming) {
      return;
    }

    const tail = messages[messages.length - 1];
    setStreamingId(tail.id);
    let words = 0;
    const interval = setInterval(() => {
      if (words++ > 60) {
        clearInterval(interval);
        setStreamingId(undefined);
        return;
      }
      setMessages((prev) => {
        const next = prev.slice();
        const last = next[next.length - 1];
        const block = last.blocks[0];
        next[next.length - 1] = {
          ...last,
          blocks: [{ ...block, text: `${(block as any).text} token-${words}` }],
        } as Message.Message;
        return next;
      });
    }, 120);

    return () => clearInterval(interval);
  }, [streaming]);

  // Rough frame-rate sample while the user scrolls; the deciding criterion is smoothness, so the
  // story reports it rather than leaving it to the eye.
  useEffect(() => {
    let frames = 0;
    let last = performance.now();
    let raf = 0;
    const tick = () => {
      frames++;
      const now = performance.now();
      if (now - last >= 1_000) {
        setFps(Math.round((frames * 1_000) / (now - last)));
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleCopySelection = useCallback(() => {
    // Copy across message boundaries is reconstructed from the model: unmounted items are not in
    // the DOM, so a native selection could never have included them.
    if (messages.length < 3) {
      return;
    }
    const from: FeedAnchor = { messageId: messages[0].id, offset: 0 };
    const to: FeedAnchor = { messageId: messages[2].id, offset: 20 };
    setCopied(sliceFeed(messages, defaultRenderer, { from, to }));
  }, [messages]);

  return (
    // Root is headless, so the toolbar and statusbar sit outside the scroll container and still
    // read the list's state through `useMessageList`.
    <MessageList.Root
      messages={messages}
      Chrome={TestChrome}
      hits={hits}
      streamingId={streamingId}
      selectedIds={selectedIds}
      onSelectedIdsChange={setSelectedIds}
      estimateSize={estimateSize}
      stickyBottom={streaming}
    >
      <Panel.Root>
        <Panel.Toolbar asChild>
          <Toolbar.Root>
            <Input.Root>
              <Input.TextInput
                placeholder='Search…'
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                data-testid='feed.search'
              />
            </Input.Root>
            <FindButton hits={hits} />
            <IconButton icon='ph--copy--regular' label='Copy range' onClick={handleCopySelection} />
            <div className='grow' />
            <NavButtons />
          </Toolbar.Root>
        </Panel.Toolbar>

        <Panel.Content asChild>
          <MessageList.Viewport classNames='dx-document' />
        </Panel.Content>

        <Panel.Statusbar>
          <StatusBar hits={hits} query={query} selected={selectedIds.size} copied={copied} fps={fps} />
        </Panel.Statusbar>
      </Panel.Root>
    </MessageList.Root>
  );
};

/** Scroll-to-hit lives in the toolbar, outside the viewport — the reason Root is headless. */
const FindButton = ({ hits }: { hits: readonly SearchHit[] }) => {
  const { scrollToIndex } = useMessageList('FindButton');
  const handleFindNext = useCallback(() => {
    const hit = hits[0];
    if (hit) {
      scrollToIndex(hit.index, { align: 'center', behavior: 'smooth' });
    }
  }, [hits, scrollToIndex]);

  return <IconButton icon='ph--magnifying-glass--regular' label='Find' onClick={handleFindNext} />;
};

/** Step between messages, one at a time, from whichever is at the top of the viewport. */
const NavButtons = () => {
  const { range, count, scrollToIndex } = useMessageList('NavButtons');
  const current = range?.startIndex ?? 0;

  const step = useCallback(
    (delta: number) => {
      const next = Math.min(Math.max(current + delta, 0), count - 1);
      scrollToIndex(next, { align: 'start', behavior: 'smooth' });
    },
    [current, count, scrollToIndex],
  );

  return (
    <>
      <IconButton
        icon='ph--caret-up--regular'
        iconOnly
        label='Previous message'
        variant='ghost'
        disabled={current <= 0}
        data-testid='feed.nav.back'
        onClick={() => step(-1)}
      />
      <IconButton
        icon='ph--caret-down--regular'
        iconOnly
        label='Next message'
        variant='ghost'
        disabled={current >= count - 1}
        data-testid='feed.nav.forward'
        onClick={() => step(1)}
      />
    </>
  );
};

type StatusBarProps = {
  hits: readonly SearchHit[];
  query: string;
  selected: number;
  copied: string | null;
  fps: number | null;
};

const StatusBar = ({ hits, query, selected, copied, fps }: StatusBarProps) => {
  const { range, count, scrollToBottom } = useMessageList('StatusBar');

  return (
    <div className='h-6 grid grid-cols-5 items-center gap-4 px-2 text-xs text-description'>
      <button
        type='button'
        data-testid='feed.range'
        className='text-left'
        onClick={() => scrollToBottom({ behavior: 'smooth' })}
      >
        {range ? `${range.startIndex}–${range.endIndex} of ${count}` : count}
      </button>
      <span>{selected} selected</span>
      {query ? <span>{hits.length} hits</span> : <span />}
      {copied ? (
        <span className='truncate opacity-70'>copied: {copied.replace(/\s+/g, ' ').slice(0, 80)}…</span>
      ) : (
        <span />
      )}
      <span className='text-right'>{fps ?? '—'} fps</span>
    </div>
  );
};

const meta: Meta<StoryProps> = {
  title: 'ui/react-ui-feed/MessageList',
  render: DefaultStory,
  decorators: [withLayout({ layout: 'column' }), withTheme()],
  parameters: { layout: 'fullscreen' },
  args: { count: 200 },
};

export default meta;

type Story = StoryObj<StoryProps>;

/** Mixed markdown / html / code items — the realistic feed. */
export const Default: Story = {};

/** Scroll-quality case: the deciding criterion is smoothness here, not at 200. */
export const Large: Story = {
  args: { count: 2_000 },
};

/** A bad height estimate is what scrollbar drift looks like; compare against `Default`. */
export const BadEstimate: Story = {
  args: { count: 2_000, estimateSize: 24 },
};

/** Tail growth: the item reconciles by delta while the virtualizer re-measures a growing row. */
export const Streaming: Story = {
  args: { count: 50, streaming: true },
};
