//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { random } from '@dxos/random';
import { IconButton, Input, Panel, ThemedClassName, Toolbar } from '@dxos/react-ui';
import { Minimap, type MinimapMarker } from '@dxos/react-ui-components';
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
      // A turn interrupted before its first chunk leaves an empty answer behind, which renders as a
      // tall blank row. Strict mode runs this teardown on mount, so it is the common case.
      setMessages((prev) => {
        const last = prev.at(-1);
        return last && last.sender.role === 'assistant' && !Message.extractText(last).length ? prev.slice(0, -1) : prev;
      });
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
              icon={streaming ? 'ph--stop--regular' : 'ph--play--regular'}
              iconOnly
              label={streaming ? 'Stop' : 'Start'}
              data-testid='feed.stream.toggle'
              onClick={() => setStreaming((value) => !value)}
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

        {/* Panel.Content is itself the two-column grid — the rail sits beside the viewport without
            another box in the height chain. */}
        {/* `minmax(0, 1fr)` on the row: without it the grid sizes to its tallest child, the rail
            grows the panel instead of being bounded by it, and the rail never learns to thin. */}
        <Panel.Content classNames='grid grid-cols-[2rem_1fr] grid-rows-[minmax(0,1fr)]'>
          <div className='dx-expander grid grid-rows-[1fr_4fr_1fr] justify-center'>
            <FeedMinimap classNames='row-start-2' messages={messages} />
          </div>
          <MessageList.Viewport classNames='dx-document' />
        </Panel.Content>

        <Panel.Statusbar>
          <StatusBar hits={hits} query={query} selected={selectedIds.size} copied={copied} streaming={streaming} />
        </Panel.Statusbar>
      </Panel.Root>
    </MessageList.Root>
  );
};

/**
 * The minimap over a feed: one tick per prompt, in message-index space.
 *
 * `MinimapMarker.range` is "the document's own position space", which for a feed is the message
 * index — so a marker is `[index, index + 1)` and the visible range is the mounted window. No
 * pixel offsets are involved, which is what makes this survive rows whose heights are still
 * estimates.
 */
const FeedMinimap = ({ classNames, messages }: ThemedClassName<{ messages: readonly Message.Message[] }>) => {
  const { currentIndex, scrollToIndex } = useMessageList('FeedMinimap');

  const markers = useMemo<MinimapMarker[]>(() => {
    // Every prompt is passed; the rail thins them to whatever its height affords.
    return messages
      .map((message, index) => ({ message, index }))
      .filter(({ message }) => message.sender.role === 'user')
      .map(({ message, index }) => ({
        id: message.id,
        title: `#${index} · ${message.sender.name ?? message.sender.role}`,
        // Tags stripped: an html-kind message's text is markup, which reads as noise in a tooltip.
        description: Message.extractText(message)
          .replace(/<[^>]*>/g, ' ')
          .split('\n')
          .map((line) => line.trim())
          .find(Boolean)
          ?.slice(0, 160),
        // A tick marks one message, not a span: which one is current is decided below, so the range
        // stays honest about what the tick points at.
        range: { from: index, to: index + 1 },
      }));
  }, [messages]);

  // Exactly one tick reads as current — the last prompt at or before the cursor. Passing the
  // mounted window instead would light up whichever ticks happen to fall inside it: none for most
  // of a sampled rail, two when the window straddles a boundary.
  const current = useMemo(() => {
    const marker = [...markers].reverse().find(({ range: { from } }) => from <= currentIndex) ?? markers[0];
    return marker?.range;
  }, [markers, currentIndex]);

  const handleSelect = useCallback(
    (marker: MinimapMarker) => scrollToIndex(marker.range.from, { align: 'start', behavior: 'smooth' }),
    [scrollToIndex],
  );

  if (!markers.length) {
    return <div />;
  }

  return (
    <Minimap
      classNames={['justify-self-center', classNames]}
      markers={markers}
      visibleRange={current}
      onSelect={handleSelect}
    />
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

/** Move by one message, or to either end, from the list's cursor (what the arrow keys also move). */
const NavButtons = () => {
  const { currentIndex: current, count, scrollToIndex, scrollToBottom } = useMessageList('NavButtons');

  const step = useCallback(
    (delta: number) => {
      scrollToIndex(Math.min(Math.max(current + delta, 0), count - 1), { align: 'start', behavior: 'smooth' });
    },
    [current, count, scrollToIndex],
  );

  return (
    <>
      <IconButton
        icon='ph--arrow-line-up--regular'
        iconOnly
        label='First message'
        variant='ghost'
        disabled={current <= 0}
        data-testid='feed.nav.top'
        // Smooth is requested, but a jump across more than a few rows travels towards an estimated
        // offset, so `scrollToIndex` takes these instantly. Same call, honest either way.
        onClick={() => scrollToIndex(0, { align: 'start', behavior: 'smooth' })}
      />
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
      <IconButton
        icon='ph--arrow-line-down--regular'
        iconOnly
        label='Last message'
        variant='ghost'
        disabled={count === 0}
        data-testid='feed.nav.bottom'
        onClick={() => scrollToBottom({ behavior: 'smooth' })}
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
  const { range, currentIndex, count, scrollToBottom } = useMessageList('StatusBar');

  return (
    <div className='h-6 grid grid-cols-6 items-center gap-4 px-2 text-xs text-description tabular-nums'>
      <span>{range ? `${range.startIndex}–${range.endIndex}` : ''}</span>
      <span>
        {currentIndex} / {count}
      </span>
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
