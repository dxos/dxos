//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { expect } from 'storybook/test';

import { IconButton, Input, Panel, Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Message } from '@dxos/types';

import { Debug, DebugProvider, useDebugProbes, useFrameMeter } from '../../debug';
import { FeedModel } from '../../model';
import { createScenario, streamTurn } from '../../testing';
import { Outline, type OutlineMarker } from '../Outline';
import { MessageList, useMessageList } from './MessageList';

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
type StoryProps = {
  count?: number;
  debug?: boolean;
  scrollPastEnd?: boolean;
  wordsPerChunk?: number;
  chunkDelay?: number;
};

const Story = ({ count = 30, debug, scrollPastEnd, wordsPerChunk = 4, chunkDelay = 120 }: StoryProps) => {
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
              <div className='grow' />
              <NavButtons />
            </Toolbar.Root>
          </Panel.Toolbar>

          <Panel.Content classNames='relative dx-container'>
            <div className='z-10 absolute left-0 top-0 bottom-0 grid grid-rows-[1fr_4fr_1fr] justify-center'>
              <PromptOutline classNames='row-start-2' model={model} />
            </div>
            <MessageList.Viewport classNames='absolute inset-0' padding />
            {debug && <Probes model={model} />}
          </Panel.Content>

          <PromptInput busy={busy} onSubmit={(prompt) => void answer(prompt)} />
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
    <div className='p-2 border-bs border-separator'>
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
    <Outline
      classNames={['justify-self-center', classNames]}
      markers={markers}
      visibleRange={current}
      onSelect={(marker) => navigation.jumpTo(marker.range.from, 'smooth')}
      onNavigate={(delta) => navigation.step(delta)}
    />
  );
};

const NavButtons = () => {
  const { navigation } = useMessageList('NavButtons');
  return (
    <>
      <IconButton
        icon='ph--caret-up--regular'
        iconOnly
        label='Previous prompt'
        data-testid='assistant.prev'
        onClick={() => navigation.step(-1)}
      />
      <IconButton
        icon='ph--caret-down--regular'
        iconOnly
        label='Next prompt'
        data-testid='assistant.next'
        onClick={() => navigation.step(1)}
      />
    </>
  );
};

/** Probes over every aspect, registered into the Debug table for as long as they are mounted. */
const Probes = ({ model }: { model: FeedModel }) => {
  const meter = useFrameMeter();
  const { range, mountedRows, mountedWidgets, jumps } = useMessageList('Probes');
  const state = useRef({ range, mountedRows, mountedWidgets, jumps, model });
  state.current = { range, mountedRows, mountedWidgets, jumps, model };

  useDebugProbes(() => [
    { id: 'fps', group: 'frames', read: () => Math.round(meter.fps), alarm: (value) => Number(value) < 30 },
    { id: 'worst', group: 'frames', unit: 'ms', read: () => Math.round(meter.worst) },
    { id: 'count', group: 'model', read: () => state.current.model.count },
    { id: 'streaming', group: 'model', read: () => (state.current.model.streamingId ? 'yes' : '—') },
    {
      id: 'range',
      group: 'window',
      read: () => {
        const { range } = state.current;
        return range ? `${range.startIndex}–${range.endIndex}` : '—';
      },
    },
    { id: 'mounted', group: 'window', read: () => state.current.mountedRows },
    { id: 'widgets', group: 'window', read: () => state.current.mountedWidgets },
    { id: 'jumps', group: 'window', read: () => state.current.jumps.count, alarm: (value) => Number(value) > 0 },
  ]);

  return null;
};

const meta: Meta<StoryProps> = {
  title: 'ui/react-ui-feed/assistant',
  render: Story,
  decorators: [withLayout({ layout: 'column', classNames: 'w-[50rem]' }), withTheme()],
  parameters: { layout: 'fullscreen' },
  argTypes: {
    debug: { control: 'boolean' },
    scrollPastEnd: { control: 'boolean' },
  },
  args: { count: 30, debug: false, scrollPastEnd: true },
};

export default meta;

type StoryObject = StoryObj<StoryProps>;

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

/**
 * The whole conversation loop, driven as a reader would drive it.
 *
 * A prompt is typed and entered; the agent answers in blocks; the tail stays at rest through the
 * stream (the follow at work); scrolling up mid-answer withdraws the follow and the feed holds
 * still under a growing document.
 */
export const Assistant: StoryObject = {
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
    const modelCount = () => Number(scroller.querySelectorAll('[data-index]').length);

    // 1. The reader asks.
    const input = canvasElement.querySelector<HTMLInputElement>('[data-testid="assistant.prompt"]')!;
    const before = modelCount();
    type(input, 'What is an anchor-relative placement?');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await settle(10);

    // 2. The answer streams in blocks while the tail rests on the bottom.
    let sawStream = false;
    let held = true;
    for (let frame = 0; frame < 600; frame++) {
      await nextFrame();
      const streaming = !!scroller.querySelector('[data-index]') && atTail();
      sawStream = sawStream || streaming;
      // Once seen at the tail, it must stay there for the rest of the stream.
      if (sawStream && !streaming && frame % 5 === 0) {
        held = false;
      }

      // The turn is over when the input re-enables.
      if (sawStream && input.placeholder !== 'Answering…') {
        break;
      }
    }

    await expect({ asked: modelCount() >= before, sawStream, held, rests: atTail(), mounted: countRows() }).toEqual({
      asked: true,
      sawStream: true,
      held: true,
      rests: true,
      mounted: true,
    });
  },
};

/**
 * Scrolling away mid-answer stops the follow, and it stays stopped: a reader looking at history is
 * not dragged back by the stream. Returning to the tail opts back in.
 */
export const Interrupted: StoryObject = {
  args: { chunkDelay: 40, count: 60 },
  play: async ({ canvasElement }) => {
    await settle(40);
    const scroller = canvasElement.querySelector<HTMLElement>('[data-testid="feed.viewport"]')!;

    // Start a hands-off turn, then leave for history mid-stream.
    (canvasElement.querySelector('[data-testid="assistant.auto"]') as HTMLElement).click();
    await settle(30);
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
