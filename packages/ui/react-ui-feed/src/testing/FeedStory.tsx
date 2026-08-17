//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { random } from '@dxos/random';
import { IconButton, Input, Panel, ThemedClassName, Toolbar } from '@dxos/react-ui';
import { Minimap, type MinimapMarker } from '@dxos/react-ui-components';
import { Message } from '@dxos/types';
import { mx } from '@dxos/ui-theme';

import { type MessageChromeProps, MessageList, useMessageList } from '../components';
import { SearchHit, defaultRenderer, searchFeed, sliceFeed } from '../model';
import { type FrameMeter as FrameMeterState } from './frame-meter';
import { createMessages } from './generator';
import { type FeedScenario, createScenario } from './scenarios';
import { createAnswer, textStream } from './stream';
import { streamTurn } from './turn';
import { useFeedDebug } from './use-feed-debug';

/** Pause between one answer finishing and the next question arriving. */
const TURN_DELAY = 800;

/** A turn that is only a growing text tail: what every scenario but the assistant chat produces. */
async function* textTurn(options: { wordsPerChunk: number; chunkDelay: number }) {
  let text = '';
  for await (const chunk of textStream(createAnswer(), options)) {
    text += chunk;
    yield [{ _tag: 'text' as const, text, pending: true }];
  }
  yield [{ _tag: 'text' as const, text }];
}

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
        selected && 'bg-hover-surface',
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

      <div className='min-w-0'>
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
  /**
   * Which downstream call site to approximate. Each supplies its own renderer, chrome and follow
   * behaviour; everything else — the list, virtualization, selection, search — is the same engine.
   * Omitted, the story runs the synthetic mixed feed the measurements were taken against.
   */
  scenario?: FeedScenario;
  /** Messages of seeded history; 0 starts empty. */
  count?: number;
  /** Outline every item and every block inside it. On by default: this is a harness. */
  debug?: boolean;
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
  scenario,
  count = 0,
  debug: debugProp,
  streaming: streamingProp = false,
  wordsPerChunk = 4,
  chunkDelay = 120,
  estimateSize,
  maxSpeed,
  acceleration,
  deceleration,
}: FeedStoryProps) => {
  const definition = useMemo(() => (scenario ? createScenario({ scenario, count }) : undefined), [scenario, count]);
  const [messages, setMessages] = useState<Message.Message[]>(() => definition?.messages ?? createMessages({ count }));
  const [streaming, setStreaming] = useState(streamingProp);
  const [answerId, setAnswerId] = useState<string | undefined>();
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const hits = useMemo(() => searchFeed(messages, defaultRenderer, query), [messages, query]);

  // Instrumentation as an aspect: the meter, the sweep, the outlines and the pass label live in
  // `useFeedDebug` so this component stays about the feed.
  const { debug, toggleDebug, meter, viewportRef, sweeping, onSweep } = useFeedDebug({
    scenario,
    count,
    estimateSize,
    streaming,
    enabled: debugProp,
  });

  const handleAppend = useCallback(() => setMessages((prev) => [...prev, makeQuestion()]), []);

  const handleReset = useCallback(() => {
    setStreaming(false);
    setAnswerId(undefined);
    setMessages(definition?.messages ?? createMessages({ count }));
  }, [count, definition]);

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

        // A chat turn arrives as blocks — status, reasoning, a tool call, then the answer — which is
        // what makes reconciliation hard: the document shrinks and rewrites as well as grows. Every
        // other scenario streams a plain text tail, the easy half.
        const turn =
          scenario === 'assistant'
            ? streamTurn({ wordsPerChunk, chunkDelay })
            : textTurn({ wordsPerChunk, chunkDelay });

        for await (const blocks of turn) {
          if (cancelled) {
            return;
          }
          setMessages((prev) =>
            prev.map((message) => (message.id === answer.id ? ({ ...message, blocks } as Message.Message) : message)),
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
  }, [streaming, wordsPerChunk, chunkDelay, scenario]);

  return (
    // Root is headless, so the toolbar and statusbar sit outside the scroll container and still read
    // the list's state through `useMessageList`.
    <MessageList.Root
      messages={messages}
      renderer={definition?.renderer}
      debug={debug}
      isAnchor={definition?.isAnchor}
      Chrome={definition?.Chrome ?? TestChrome}
      registry={definition?.registry}
      hits={hits}
      streamingId={streaming ? answerId : undefined}
      selectedIds={selectedIds}
      onSelectedIdsChange={setSelectedIds}
      estimateSize={estimateSize ?? definition?.estimateSize}
      stickyBottom={definition?.stickyBottom ?? true}
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
            <IconButton
              icon={debug ? 'ph--bounding-box--fill' : 'ph--bounding-box--regular'}
              iconOnly
              label={debug ? 'Hide block outlines' : 'Show block outlines'}
              data-testid='feed.debug.toggle'
              onClick={toggleDebug}
            />
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
            <IconButton
              icon={sweeping ? 'ph--stop--regular' : 'ph--arrows-down-up--regular'}
              iconOnly
              label={sweeping ? 'Stop sweep' : 'Sweep (measure a pass)'}
              data-testid='feed.sweep'
              onClick={onSweep}
            />
            <div className='grow' />
            <NavButtons />
          </Toolbar.Root>
        </Panel.Toolbar>

        <Panel.Content classNames='relative dx-container'>
          <div className='z-10 absolute left-0 top-0 bottom-0 grid grid-rows-[1fr_4fr_1fr] justify-center'>
            <FeedMinimap classNames='row-start-2' messages={messages} />
          </div>
          <MessageList.Viewport classNames='absolute inset-0' padding ref={viewportRef} />
        </Panel.Content>

        <Panel.Statusbar>
          <StatusBar
            hits={hits}
            query={query}
            selected={selectedIds.size}
            copied={copied}
            streaming={streaming}
            meter={meter}
          />
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
  const {
    currentIndex: current,
    anchors,
    count,
    stepAnchor,
    scrollToIndex,
    scrollToBottom,
  } = useMessageList('NavButtons');

  // The same stops the arrow keys use, so a reader who switches between them does not change places.
  const step = stepAnchor;

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
        disabled={current <= (anchors[0] ?? 0)}
        data-testid='feed.nav.back'
        onClick={() => step(-1)}
      />
      <IconButton
        icon='ph--caret-down--regular'
        iconOnly
        label='Next message'
        variant='ghost'
        disabled={current >= (anchors[anchors.length - 1] ?? count - 1)}
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
  meter: FrameMeterState;
};

const StatusBar = ({ hits, selected, streaming, meter }: StatusBarProps) => {
  const { range, currentIndex, mountedWidgets, jumps, shifts, breaks, count } = useMessageList('StatusBar');

  return (
    <div className='w-full flex flex-col gap-1 py-1'>
      <div className='w-full overflow-hidden grid grid-cols-6 items-center gap-x-4 px-2 text-xs text-description tabular-nums'>
        <div>{range ? `${range.startIndex}–${range.endIndex}` : ''}</div>
        <div>
          {currentIndex} / {count}
        </div>
        <div data-testid='feed.widgets'>{mountedWidgets} blocks</div>
        <div>{selected} selected</div>
        <div>{hits.length} hits</div>
        <div className='text-right' data-testid='feed.stream.state'>
          {streaming ? 'streaming…' : 'idle'}
        </div>
      </div>
      <DebugBar meter={meter} jumps={jumps} shifts={shifts} breaks={breaks} />
    </div>
  );
};

/**
 * One row of instruments, separate from the readouts above it: those describe the feed, these
 * describe how well it is behaving. Everything here is measured, clickable and resettable, and none
 * of it is part of a feed a reader would use.
 */
const DebugBar = ({
  meter,
  jumps,
  shifts,
  breaks,
}: {
  meter: FrameMeterState;
  jumps: { count: number; worst: number };
  shifts: number;
  breaks: number;
}) => {
  const { resetShifts } = useMessageList('DebugBar');

  return (
    // Fixed tracks, not flow: every number here changes while scrolling, and cells sized to their
    // content would shuffle the row on each update — an instrument that moves is hard to read.
    <div className='grid grid-cols-[repeat(6,6rem)_auto] items-center gap-2 px-2 text-xs text-description tabular-nums'>
      <FrameMeter meter={meter} />
      <IconButton
        icon='ph--arrow-counter-clockwise--regular'
        iconOnly
        label='Reset counters'
        variant='ghost'
        size={3}
        data-testid='feed.debug.reset'
        onClick={resetShifts}
      />
      <span className={mx('text-right', jumps.count > 0 && 'text-warning-text')} data-testid='feed.jumps'>
        {jumps.count} jumps
      </span>
      <span className={mx('text-right', shifts > 0 && 'text-warning-text')} data-testid='feed.shifts'>
        {shifts} shifts{breaks > 0 ? ` · ${breaks}!` : ''}
      </span>
    </div>
  );
};

/**
 * The phase-1 verdict: live rate, the rate at the pass's slowest fifth, the worst frame, and how
 * many frames stuttered. Only meaningful at a real keyboard — an agent's browser throttles the
 * frames this counts.
 *
 * Clicking records the pass: the summary goes to the clipboard and the console, and a fresh pass
 * starts. So a measurement is click, gesture, click — and the median rate, which rarely says
 * anything the live rate has not, rides in the tooltip and the recorded line rather than on screen.
 */
const FrameMeter = ({ classNames, meter }: ThemedClassName<{ meter: FrameMeterState }>) => {
  const { label, fps, p50, p95, worst, hitches, frames, duration, record } = meter;

  return (
    <button
      type='button'
      className={mx('col-span-4 grid grid-cols-subgrid text-left tabular-nums whitespace-nowrap', classNames)}
      title={`${label} — p50 ${p50} · ${frames} frames · ${(duration / 1000).toFixed(1)}s. Click to record the pass.`}
      data-testid='feed.frames'
      onClick={record}
    >
      <span className={mx('flex justify-end', fps > 0 && fps < 50 && 'text-warning-text')}>{fps} fps</span>
      <span className={mx('flex justify-end opacity-70', p95 > 0 && p95 < 50 && 'text-warning-text opacity-100')}>
        p95 {p95}
      </span>
      <span className='flex justify-end opacity-70'>{worst}ms</span>
      <span className={mx('flex justify-end opacity-70', hitches > 0 && 'text-warning-text opacity-100')}>
        {hitches}
      </span>
    </button>
  );
};
