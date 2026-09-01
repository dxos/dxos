//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { random } from '@dxos/random';
import { IconButton, Input, Panel, ThemedClassName, Toolbar } from '@dxos/react-ui';
import { Message } from '@dxos/types';
import { mx } from '@dxos/ui-theme';

import { Outline, type OutlineMarker } from '../components/index.ts';
import { type MessageChromeProps, MessageList, useMessageList } from '../components/index.ts';
import { type Decoration, DecorationsProvider, ItemSelectionProvider } from '../hooks/index.ts';
import { SearchHit, defaultRenderer, isPrompt, searchFeed, sliceFeed, useFeedModel } from '../model/index.ts';
import { FeedStats, useFeedDebug } from './debug/index.ts';
import { createMessages } from './generator.ts';
import { type FeedScenario, createScenario } from './scenarios.tsx';
import { createAnswer, textStream } from './stream.ts';
import { streamTurn } from './turn.ts';

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
      className={mx('group relative grid grid-cols-[2rem_1fr] gap-2 px-2 py-2', selected && 'bg-hover-surface')}
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
  /** Outline every item and every block inside it; the toolbar toggles it too. */
  debug?: boolean;
  /** Begin streaming turns on mount. */
  streaming?: boolean;
  wordsPerChunk?: number;
  chunkDelay?: number;
  estimateSize?: number;
  /** Blank lines kept below the last row, part of the resting view. */
  tailLines?: number;
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
  tailLines,
  count = 0,
  debug: debugProp,
  streaming: streamingProp = false,
  wordsPerChunk = 4,
  chunkDelay = 120,
  estimateSize,
}: FeedStoryProps) => {
  const definition = useMemo(() => (scenario ? createScenario({ scenario, count }) : undefined), [scenario, count]);
  const [messages, setMessages] = useState<Message.Message[]>(() => definition?.messages ?? createMessages({ count }));
  const [streaming, setStreaming] = useState(streamingProp);
  const [answerId, setAnswerId] = useState<string | undefined>();
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const hits = useMemo(() => searchFeed(messages, defaultRenderer, query), [messages, query]);

  // Search is a decoration producer, not a list prop (SPEC §Aspects): the ranges reach the items
  // through the provider below, and the list neither knows nor routes them.
  const decorations = useMemo<Decoration[]>(
    () => hits.map(({ messageId, offset, length }) => ({ id: messageId, range: { offset, length }, kind: 'search' })),
    [hits],
  );

  // The model owns identity, stops and streaming; the array survives as this adapter (SPEC F-7.3).
  const isAnchor = definition?.isAnchor;
  const model = useFeedModel(messages, { stops: isAnchor ?? 'message' });

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

  const onSelect = useCallback((id: string, additive: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(additive ? current : []);
      if (additive && next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  return (
    // Root is headless, so the toolbar and statusbar sit outside the scroll container and still read
    // the list's state through `useMessageList`. The providers around it are the aspect pattern:
    // selection and decorations reach the items by id, and the list never sees either.
    <DecorationsProvider decorations={decorations}>
      <ItemSelectionProvider selectedIds={selectedIds} onSelect={onSelect}>
        <MessageList.Root
          model={model}
          renderer={definition?.renderer}
          debug={debug}
          Chrome={definition?.Chrome ?? TestChrome}
          Custom={definition?.Custom}
          registry={definition?.registry}
          estimateSize={estimateSize ?? definition?.estimateSize}
          stickyBottom={definition?.stickyBottom ?? true}
          tailLines={tailLines}
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
                <MessageList.Nav classNames='contents' />
              </Toolbar.Root>
            </Panel.Toolbar>

            <Panel.Content classNames='relative'>
              <div className='z-10 absolute left-0 top-0 bottom-0 grid grid-rows-[1fr_4fr_1fr] justify-center'>
                <FeedOutline classNames='row-start-2' messages={messages} />
              </div>
              <MessageList.Viewport classNames='dx-fullscreen' padding ref={viewportRef} />
            </Panel.Content>
          </Panel.Root>
          <FeedStats meter={meter} streaming={streaming} selected={selectedIds.size} hits={hits.length} />
        </MessageList.Root>
      </ItemSelectionProvider>
    </DecorationsProvider>
  );
};

/**
 * The outline of a feed: one tick per prompt, in message-index space.
 *
 * `OutlineMarker.range` is "the document's own position space", which for a feed is the message
 * index — so a marker is `[index, index + 1)` and the visible range is the mounted window. No
 * pixel offsets are involved, which is what makes this survive rows whose heights are still
 * estimates.
 */
const FeedOutline = ({ classNames, messages }: ThemedClassName<{ messages: readonly Message.Message[] }>) => {
  const { currentIndex, scrollToIndex } = useMessageList('FeedOutline');

  const markers = useMemo<OutlineMarker[]>(() => {
    // Every prompt is passed; the rail thins them to whatever its height affords.
    return messages
      .map((message, index) => ({ message, index }))
      .filter(({ message }) => isPrompt(message))
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
    (marker: OutlineMarker) => scrollToIndex(marker.range.from, { align: 'start', behavior: 'smooth' }),
    [scrollToIndex],
  );

  if (!markers.length) {
    return <div />;
  }

  return (
    <Outline
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
      scrollToIndex(hit.index, { align: 'start', behavior: 'smooth' });
    }
  }, [hits, scrollToIndex]);

  return <IconButton icon='ph--magnifying-glass--regular' iconOnly label='Find' onClick={handleFind} />;
};
