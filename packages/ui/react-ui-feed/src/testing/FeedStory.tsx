//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { random } from '@dxos/random';
import { IconButton, Input, Panel, Toolbar } from '@dxos/react-ui';
import { Message } from '@dxos/types';
import { mx } from '@dxos/ui-theme';

import {
  type MessageChromeProps,
  MessageList,
  type SearchHit,
  defaultRenderer,
  searchFeed,
  sliceFeed,
  useMessageList,
} from '../';
import { createMessages } from './generator';
import { createAnswer, textStream } from './stream';

/** Pause between one answer finishing and the next question arriving. */
const TURN_DELAY = 800;

const makeQuestion = () =>
  Message.make({
    sender: { role: 'user', name: 'Alice' },
    blocks: [{ _tag: 'text', text: random.lorem.sentence(8) }],
  });

const makeAnswer = () =>
  Message.make({
    sender: { role: 'assistant', name: 'Assistant' },
    blocks: [{ _tag: 'text', text: '' }],
  });

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
// Story
//

export type FeedStoryProps = {
  /** Messages of seeded history; 0 starts empty. */
  count?: number;
  /** Begin streaming turns on mount. */
  streaming?: boolean;
  wordsPerChunk?: number;
  chunkDelay?: number;
  estimateSize?: number;
  maxSpeed?: number;
  acceleration?: number;
  deceleration?: number;
};

/**
 * The one renderer every `MessageList` story uses; the stories differ only by args.
 *
 * Seeded history, a search over the model, message-set selection, and a play control that streams
 * turns into the tail until stopped — one harness, so a story is a set of arguments rather than
 * another component to keep in step.
 */
export const FeedStory = ({
  count = 0,
  streaming: autoStart = false,
  wordsPerChunk = 4,
  chunkDelay = 120,
  estimateSize,
  maxSpeed,
  acceleration,
  deceleration,
}: FeedStoryProps) => {
  const [messages, setMessages] = useState<Message.Message[]>(() => createMessages({ count }));
  const [streaming, setStreaming] = useState(autoStart);
  const [answerId, setAnswerId] = useState<string | undefined>();
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);

  const hits = useMemo(() => searchFeed(messages, defaultRenderer, query), [messages, query]);

  const handleAppend = useCallback(() => setMessages((prev) => [...prev, makeQuestion()]), []);

  const handleReset = useCallback(() => {
    setStreaming(false);
    setAnswerId(undefined);
    setMessages(createMessages({ count }));
  }, [count]);

  const handleCopy = useCallback(() => {
    // Copy across message boundaries is reconstructed from the model: unmounted items are not in the
    // DOM, so a native selection could never have included them.
    if (messages.length < 3) {
      return;
    }
    setCopied(
      sliceFeed(messages, defaultRenderer, {
        from: { messageId: messages[0].id, offset: 0 },
        to: { messageId: messages[2].id, offset: 20 },
      }),
    );
  }, [messages]);

  // Turns keep arriving until stopped: an unbounded conversation is what the list has to survive,
  // and the only way to watch the follow behave across more than one answer.
  useEffect(() => {
    if (!streaming) {
      return;
    }

    let cancelled = false;
    void (async () => {
      while (!cancelled) {
        const answer = makeAnswer();
        setMessages((prev) => [...prev, makeQuestion(), answer]);
        setAnswerId(answer.id);

        for await (const chunk of textStream(createAnswer(), { wordsPerChunk, chunkDelay })) {
          if (cancelled) {
            return;
          }
          setMessages((prev) =>
            prev.map((message) =>
              message.id === answer.id
                ? ({
                    ...message,
                    blocks: [{ ...message.blocks[0], text: `${(message.blocks[0] as any).text}${chunk}` }],
                  } as Message.Message)
                : message,
            ),
          );
        }

        setAnswerId(undefined);
        await new Promise((resolve) => setTimeout(resolve, TURN_DELAY));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [streaming, wordsPerChunk, chunkDelay]);

  return (
    // Root is headless, so the toolbar and statusbar sit outside the scroll container and still read
    // the list's state through `useMessageList`.
    <MessageList.Root
      messages={messages}
      Chrome={TestChrome}
      hits={hits}
      streamingId={streaming ? answerId : undefined}
      selectedIds={selectedIds}
      onSelectedIdsChange={setSelectedIds}
      estimateSize={estimateSize}
      stickyBottom
      stickyBehavior='smooth'
      follow={{ maxSpeed, acceleration, deceleration }}
    >
      <Panel.Root>
        <Panel.Toolbar asChild>
          <Toolbar.Root>
            <IconButton
              icon='ph--play--regular'
              iconOnly
              label='Start'
              disabled={streaming}
              data-testid='feed.stream.start'
              onClick={() => setStreaming(true)}
            />
            <IconButton
              icon='ph--stop--regular'
              iconOnly
              label='Stop'
              disabled={!streaming}
              data-testid='feed.stream.stop'
              onClick={() => setStreaming(false)}
            />
            <IconButton
              icon='ph--plus--regular'
              iconOnly
              label='Add message'
              data-testid='feed.stream.append'
              onClick={handleAppend}
            />
            <IconButton icon='ph--trash--regular' iconOnly label='Reset' onClick={handleReset} />
            <Toolbar.Separator />
            <Input.Root>
              <Input.TextInput
                placeholder='Search…'
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                data-testid='feed.search'
              />
            </Input.Root>
            <FindButton hits={hits} />
            <IconButton icon='ph--copy--regular' iconOnly label='Copy range' onClick={handleCopy} />
            <div className='grow' />
            <NavButtons />
          </Toolbar.Root>
        </Panel.Toolbar>

        <Panel.Content asChild>
          <MessageList.Viewport classNames='dx-document' />
        </Panel.Content>

        <Panel.Statusbar>
          <StatusBar hits={hits} query={query} selected={selectedIds.size} copied={copied} streaming={streaming} />
        </Panel.Statusbar>
      </Panel.Root>
    </MessageList.Root>
  );
};

/** Scroll-to-hit lives in the toolbar, outside the viewport — the reason Root is headless. */
const FindButton = ({ hits }: { hits: readonly SearchHit[] }) => {
  const { scrollToIndex } = useMessageList('FindButton');
  const handleFind = useCallback(() => {
    const hit = hits[0];
    if (hit) {
      scrollToIndex(hit.index, { align: 'center', behavior: 'smooth' });
    }
  }, [hits, scrollToIndex]);

  return <IconButton icon='ph--magnifying-glass--regular' iconOnly label='Find' onClick={handleFind} />;
};

/** Step between messages, one at a time, from whichever is at the top of the viewport. */
const NavButtons = () => {
  const { range, count, scrollToIndex } = useMessageList('NavButtons');
  const current = range?.startIndex ?? 0;

  const step = useCallback(
    (delta: number) => {
      scrollToIndex(Math.min(Math.max(current + delta, 0), count - 1), { align: 'start', behavior: 'smooth' });
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
  streaming: boolean;
};

const StatusBar = ({ hits, query, selected, copied, streaming }: StatusBarProps) => {
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
      <span className='text-right' data-testid='feed.stream.state'>
        {streaming ? 'streaming…' : 'idle'}
      </span>
    </div>
  );
};
