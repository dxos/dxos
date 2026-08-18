//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { expect } from 'storybook/test';

import { IconButton, Input, Panel, Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Message } from '@dxos/types';

import { Outline, type OutlineMarker } from '../components';
import { MessageList, useMessageList } from '../components';
import { Debug, DebugProvider, useDebugProbes, useFrameMeter } from '../debug';
import { FeedModel } from '../model';
import { createScenario, streamTurn } from '../testing';

/**
 * The plugin-assistant use case, end to end: a reader typing prompts into a conversation while an
 * agent streams multi-block answers into its tail — status, reasoning, a tool call and its result,
 * then the answer, exactly the block sequence a model emits (`streamTurn`).
 *
 * Everything here goes through the shipping path and the model's *told* APIs: a typed prompt is
 * `model.append`, the agent's turn mutates one identity via `model.stream`, and the follow keeps
 * the tail at rest because the reader is there — scrolling up withdraws it, returning restores it.
 * The `debug` arg turns on the generic Debug table (`@dxos/react-ui-feed/debug`), with probes over
 * the frame rate, the model, the window and the widget census — every aspect readable live.
 */
type StoryArgs = {
  count?: number;
  debug?: boolean;
  scrollPastEnd?: boolean;
  wordsPerChunk?: number;
  chunkDelay?: number;
};

const DefaultStory = ({ count = 30, debug, scrollPastEnd, wordsPerChunk = 4, chunkDelay = 120 }: StoryArgs) => {
  const definition = useMemo(() => createScenario({ scenario: 'assistant', count }), [count]);
  // The model, not an array: prompts and answers are told to it, and the window is told in turn.
  const model = useMemo(() => new FeedModel({ messages: definition.messages, stops: 'prompt' }), [definition]);

  const [busy, setBusy] = useState(false);
  const [auto, setAuto] = useState(false);
  const autoRef = useRef(false);

  // One agent turn: the answer arrives as blocks that shrink and rewrite as well as grow.
  const answer = useCallback(
    async (prompt: string) => {
      setBusy(true);
      model.append([
        Message.make({ sender: { role: 'user', name: 'rich' }, blocks: [{ _tag: 'text', text: prompt }] }),
      ]);

      const reply = Message.make({ sender: { role: 'assistant', name: 'Assistant' }, blocks: [] });
      model.append([reply]);
      model.setStreaming(reply.id);
      try {
        for await (const blocks of streamTurn({ wordsPerChunk, chunkDelay })) {
          // Patched, not mutated: a schema-made message is frozen, so each chunk is a fresh value
          // under the same identity — which is also what an item needs to reconcile by delta.
          model.patch(reply.id, { ...reply, blocks } as Message.Message);
        }
      } finally {
        model.setStreaming(undefined);
        setBusy(false);
      }
    },
    [model, wordsPerChunk, chunkDelay],
  );

  // Hands-off mode for review: turns keep arriving until stopped, as an unbounded conversation.
  const toggleAuto = useCallback(() => {
    const next = !autoRef.current;
    autoRef.current = next;
    setAuto(next);
    if (next) {
      void (async () => {
        let turn = 0;
        while (autoRef.current) {
          await answer(`Question ${++turn}: what changed since the last answer?`);
          await new Promise((resolve) => setTimeout(resolve, 800));
        }
      })();
    }
  }, [answer]);

  return (
    <DebugProvider>
      <MessageList.Root
        model={model}
        renderer={definition.renderer}
        registry={definition.registry}
        Chrome={definition.Chrome}
        estimateSize={definition.estimateSize}
        stickyBottom
        scrollPastEnd={scrollPastEnd}
      >
        <Panel.Root>
          <Panel.Toolbar asChild>
            <Toolbar.Root>
              <IconButton
                icon={auto ? 'ph--stop--regular' : 'ph--play--regular'}
                iconOnly
                label={auto ? 'Stop the agent' : 'Let the agent talk'}
                data-testid='assistant.auto'
                onClick={toggleAuto}
              />
              <Toolbar.Separator />
              <MessageList.Nav ends={false} classNames='contents' />
            </Toolbar.Root>
          </Panel.Toolbar>

          {/* Inside Panel.Content, not a sibling: Panel.Root is a grid whose rows are its slots, so
              a loose child lands in an implicit row under the toolbar rather than at the bottom. */}
          <Panel.Content classNames='dx-container flex flex-col min-h-0'>
            <div className='relative grow min-h-0'>
              <PromptOutline model={model} />
              <MessageList.Viewport classNames='absolute inset-0' padding />
              {debug && <Probes model={model} />}
            </div>
            <PromptInput busy={busy} onSubmit={(prompt) => void answer(prompt)} />
          </Panel.Content>
        </Panel.Root>
        {debug && <Debug />}
      </MessageList.Root>
    </DebugProvider>
  );
};

/** The prompt box: the reader's half of the conversation. */
const PromptInput = ({ busy, onSubmit }: { busy: boolean; onSubmit: (prompt: string) => void }) => {
  const [prompt, setPrompt] = useState('');
  const submit = () => {
    const text = prompt.trim();
    if (text.length) {
      onSubmit(text);
      setPrompt('');
    }
  };

  return (
    <div className='p-2'>
      <Input.Root>
        <Input.TextInput
          placeholder={busy ? 'Answering…' : 'Ask something…'}
          value={prompt}
          data-testid='assistant.prompt'
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && submit()}
        />
      </Input.Root>
    </div>
  );
};

/** The outline rail over the model's own stops, stepping through the same seam as everything else. */
const PromptOutline = ({ classNames, model }: { classNames?: string; model: FeedModel }) => {
  const { currentIndex, navigation, count } = useMessageList('PromptOutline');

  const markers = useMemo<OutlineMarker[]>(
    () =>
      model.stops().map(({ index, id }) => ({
        id,
        title: `#${index}`,
        description: model.textOf(id)?.slice(0, 160),
        range: { from: index, to: index + 1 },
      })),
    // Recomputed per count change: stops are a policy over the model.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [model, count],
  );

  const current = useMemo(() => {
    const marker = [...markers].reverse().find(({ range: { from } }) => from <= currentIndex) ?? markers[0];
    return marker?.range;
  }, [markers, currentIndex]);

  if (!markers.length) {
    return <div />;
  }

  return (
    <div className='z-10 absolute left-0 top-0 bottom-0 grid grid-rows-[1fr_4fr_1fr] justify-center'>
      <Outline
        classNames={['row-start-2 justify-self-center', classNames]}
        markers={markers}
        visibleRange={current}
        onSelect={(marker) => navigation.jumpTo(marker.range.from, 'smooth')}
        onNavigate={(delta) => navigation.step(delta)}
      />
    </div>
  );
};

/** Probes over every aspect, registered into the Debug table for as long as they are mounted. */
const Probes = ({ model }: { model: FeedModel }) => {
  const meter = useFrameMeter();
  const { range, mountedRows, mountedWidgets, jumps } = useMessageList('Probes');
  const state = useRef({ range, mountedRows, mountedWidgets, jumps, model });
  state.current = { range, mountedRows, mountedWidgets, jumps, model };

  useDebugProbes(() => [
    {
      id: 'fps',
      group: 'frames',
      read: () => Math.round(meter.fps),
      alarm: (value) => Number(value) < 30,
    },
    {
      id: 'worst',
      group: 'frames',
      unit: 'ms',
      read: () => Math.round(meter.worst),
    },
    {
      id: 'count',
      group: 'model',
      read: () => state.current.model.count,
    },
    {
      id: 'streaming',
      group: 'model',
      read: () => (state.current.model.streamingId ? 'yes' : '—'),
    },
    {
      id: 'range',
      group: 'window',
      read: () => {
        const { range } = state.current;
        return range ? `${range.startIndex}–${range.endIndex}` : '—';
      },
    },
    {
      id: 'mounted',
      group: 'window',
      read: () => state.current.mountedRows,
    },
    {
      id: 'widgets',
      group: 'window',
      read: () => state.current.mountedWidgets,
    },
    {
      id: 'jumps',
      group: 'window',
      read: () => state.current.jumps.count,
      alarm: (value) => Number(value) > 0,
    },
  ]);

  return null;
};

const meta: Meta<StoryArgs> = {
  title: 'ui/react-ui-feed/stories/assistant',
  render: DefaultStory,
  decorators: [withLayout({ layout: 'column', classNames: 'w-[50rem]' }), withTheme()],
  parameters: { layout: 'fullscreen' },
  argTypes: {
    debug: { control: 'boolean' },
    scrollPastEnd: { control: 'boolean' },
  },
  args: {
    count: 30,
    debug: true,
    scrollPastEnd: true,
  },
};

export default meta;

type Story = StoryObj<StoryArgs>;

const nextFrame = () => new Promise<number>((resolve) => requestAnimationFrame(resolve));

const settle = async (frames = 30) => {
  for (let frame = 0; frame < frames; frame++) {
    await nextFrame();
  }
};

/** Reflects a typed value into a React-controlled input: the native setter, then the event. */
const type = (input: HTMLInputElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  setter.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
};

/** The loop, hands on: type a prompt, or press ▶ and watch. No play — this one is for people. */
export const Default: Story = {};

/**
 * The whole conversation loop, driven as a reader would drive it.
 *
 * A prompt is typed and entered; the agent answers in blocks; the tail stays at rest through the
 * stream (the follow at work); scrolling up mid-answer withdraws the follow and the feed holds
 * still under a growing document.
 */
export const Assistant: Story = {
  args: { chunkDelay: 40 },
  play: async ({ canvasElement }) => {
    await settle(40);
    const scroller = canvasElement.querySelector<HTMLElement>('[data-testid="feed.viewport"]')!;
    const atTail = () => {
      const rows = [...scroller.querySelectorAll<HTMLElement>('[data-index]')];
      const last = rows[rows.length - 1];
      return !!last && Math.abs(last.getBoundingClientRect().bottom - scroller.getBoundingClientRect().bottom) <= 2;
    };
    const countRows = () => scroller.querySelectorAll('[data-index]').length > 0;

    // 1. The reader asks. "Asked" is read from what a reader would see: the input cleared on
    // submit, and the turn started (the placeholder flips while the agent answers) — never from
    // mounted-row counts, which *shrink* as taller streamed rows fill the window.
    const input = canvasElement.querySelector<HTMLInputElement>('[data-testid="assistant.prompt"]')!;
    type(input, 'What is an anchor-relative placement?');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await settle(10);
    const asked = input.value === '';

    // 2. The answer streams in blocks while the follow keeps the tail near rest. The glide is
    // allowed to lag a growing tail by a bounded distance — that is what travelling means — so the
    // reading is the worst lag during the stream, and exact rest once the turn lands.
    const lag = () => {
      const rows = [...scroller.querySelectorAll<HTMLElement>('[data-index]')];
      const last = rows[rows.length - 1];
      return last ? last.getBoundingClientRect().bottom - scroller.getBoundingClientRect().bottom : 0;
    };

    let sawStream = false;
    let worst = 0;
    for (let frame = 0; frame < 600; frame++) {
      await nextFrame();
      sawStream = sawStream || atTail();
      worst = Math.max(worst, lag());
      // The turn is over when the input re-enables.
      if (sawStream && input.placeholder !== 'Answering…') {
        break;
      }
    }

    // Landed: arrival is by deceleration, so rest is polled rather than sampled.
    let rests = false;
    for (let frame = 0; frame < 300 && !rests; frame++) {
      await nextFrame();
      rests = atTail();
    }

    await expect({
      asked,
      sawStream,
      bounded: worst < scroller.clientHeight,
      rests,
      mounted: countRows(),
    }).toEqual({
      asked: true,
      sawStream: true,
      bounded: true,
      rests: true,
      mounted: true,
    });
  },
};

/**
 * Scrolling away mid-answer stops the follow, and it stays stopped: a reader looking at history is
 * not dragged back by the stream. Returning to the tail opts back in.
 */
export const Interrupted: Story = {
  args: { chunkDelay: 40, count: 60 },
  play: async ({ canvasElement }) => {
    await settle(40);
    const scroller = canvasElement.querySelector<HTMLElement>('[data-testid="feed.viewport"]')!;

    // Start a hands-off turn, then leave for history mid-stream.
    (canvasElement.querySelector('[data-testid="assistant.auto"]') as HTMLElement).click();
    await settle(30);
    // The wheel first: a scroll the follow cannot attribute to the reader is one it will undo.
    scroller.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: -100 }));
    scroller.scrollTop = Math.max(0, scroller.scrollTop - 3 * scroller.clientHeight);
    await settle(10);

    const away = scroller.scrollTop;
    await settle(60);
    const stayed = Math.abs(scroller.scrollTop - away) <= 2;

    // Returning to the tail opts back in: the next answer keeps it at rest. Without this half the
    // story passes with no follow at all — "stays away" is trivially true then.
    let previous = -1;
    for (let attempt = 0; attempt < 8 && scroller.scrollTop !== previous; attempt++) {
      previous = scroller.scrollTop;
      scroller.scrollTop = scroller.scrollHeight;
      await settle(10);
    }

    let resumed = false;
    for (let frame = 0; frame < 400 && !resumed; frame++) {
      await nextFrame();
      const rows = [...scroller.querySelectorAll<HTMLElement>('[data-index]')];
      const last = rows[rows.length - 1];
      resumed = !!last && Math.abs(last.getBoundingClientRect().bottom - scroller.getBoundingClientRect().bottom) <= 2;
    }

    (canvasElement.querySelector('[data-testid="assistant.auto"]') as HTMLElement).click();
    await expect({ stayed, resumed }).toEqual({ stayed: true, resumed: true });
  },
};
