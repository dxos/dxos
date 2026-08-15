//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Icon, IconButton, Input, Panel, Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { type Message } from '@dxos/types';
import { mx } from '@dxos/ui-theme';

import { type FeedAnchor, defaultRenderer, searchFeed, sliceFeed } from '../../model';
import { createMessages } from '../../testing';
import { type MessageChromeProps, MessageList, type MessageListController } from './MessageList';

//
// Chrome
//

/**
 * Per-message chrome, supplied by the host rather than the engine — the thing a single thread-wide
 * document cannot do without injecting widgets into its own markdown.
 */
const DemoChrome = ({ message, index, selected, onSelect, children }: MessageChromeProps) => {
  const role = message.sender.role ?? 'user';
  const time = new Date(message.created).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div
      className={mx(
        'group grid grid-cols-[2rem_1fr] gap-2 px-2 py-2 border-b border-subdued-separator',
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
        <Icon icon={role === 'user' ? 'ph--user--regular' : 'ph--sparkle--regular'} size={4} />
      </div>

      <div className='min-is-0'>
        <div className='flex items-center gap-2 text-xs text-description'>
          <span className='font-medium'>{message.sender.name ?? role}</span>
          <span>{time}</span>
          <span className='text-subdued'>#{index}</span>
          <div className='grow' />
          {/* Fork / rewind / reply — chrome, not content. */}
          <div className='hidden group-hover:flex gap-1'>
            <IconButton icon='ph--git-branch--regular' iconOnly label='Fork' variant='ghost' size={3} />
            <IconButton icon='ph--arrow-counter-clockwise--regular' iconOnly label='Rewind' variant='ghost' size={3} />
            <IconButton icon='ph--arrow-bend-up-left--regular' iconOnly label='Reply' variant='ghost' size={3} />
          </div>
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
  const [range, setRange] = useState<{ startIndex: number; endIndex: number } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [fps, setFps] = useState<number | null>(null);
  const controllerRef = useRef<MessageListController>(null);

  const hits = useMemo(() => searchFeed(messages, defaultRenderer, query), [messages, query]);

  // Streaming: extend the tail message so the island reconciles by delta and the virtualizer
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
    // Copy across message boundaries is reconstructed from the model: unmounted islands are not in
    // the DOM, so a native selection could never have included them.
    if (messages.length < 3) {
      return;
    }
    const from: FeedAnchor = { messageId: messages[0].id, offset: 0 };
    const to: FeedAnchor = { messageId: messages[2].id, offset: 20 };
    setCopied(sliceFeed(messages, defaultRenderer, { from, to }));
  }, [messages]);

  const handleFindNext = useCallback(() => {
    const hit = hits[0];
    if (hit) {
      controllerRef.current?.scrollToIndex(hit.index, 'center');
    }
  }, [hits]);

  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.Text>{messages.length} messages</Toolbar.Text>
          <Input.Root>
            <Input.TextInput
              placeholder='Search…'
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              data-testid='feed.search'
            />
          </Input.Root>
          <Toolbar.Text>{query ? `${hits.length} hits` : ''}</Toolbar.Text>
          <IconButton icon='ph--magnifying-glass--regular' label='Find' onClick={handleFindNext} />
          <IconButton icon='ph--copy--regular' label='Copy range' onClick={handleCopySelection} />
          <div className='grow' />
          <Toolbar.Text classNames='text-xs text-description'>
            {range ? `rows ${range.startIndex}–${range.endIndex} mounted` : ''} · {fps ?? '—'} fps · {selectedIds.size}{' '}
            selected
          </Toolbar.Text>
        </Toolbar.Root>
      </Panel.Toolbar>

      <Panel.Content asChild>
        <MessageList
          ref={controllerRef}
          classNames='dx-document'
          messages={messages}
          Chrome={DemoChrome}
          hits={hits}
          streamingId={streamingId}
          selectedIds={selectedIds}
          onSelectedIdsChange={setSelectedIds}
          onRangeChange={setRange}
          estimateSize={estimateSize}
          stickyBottom={streaming}
        />
      </Panel.Content>

      {copied && (
        <Panel.Statusbar classNames='max-h-24 overflow-auto p-2 text-xs whitespace-pre-wrap'>{copied}</Panel.Statusbar>
      )}
    </Panel.Root>
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

/** Mixed markdown / html / code islands — the realistic feed. */
export const Default: Story = {};

/** Scroll-quality case: the deciding criterion is smoothness here, not at 200. */
export const Large: Story = {
  args: { count: 2_000 },
};

/** A bad height estimate is what scrollbar drift looks like; compare against `Default`. */
export const BadEstimate: Story = {
  args: { count: 2_000, estimateSize: 24 },
};

/** Tail growth: the island reconciles by delta while the virtualizer re-measures a growing row. */
export const Streaming: Story = {
  args: { count: 50, streaming: true },
};
