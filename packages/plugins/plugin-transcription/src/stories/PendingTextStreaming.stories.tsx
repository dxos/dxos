//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useRef, useState } from 'react';

import { Button } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { PendingTextStreamer, type PendingTextSnapshot, memoryPendingTextSink } from '@dxos/ui-editor';

// Scripted transcript "batches" — stand in for the transcriber's onSegments callbacks.
const TRANSCRIPT = [
  'The quick brown fox jumps over the lazy dog.',
  'Meanwhile dxos records the conversation locally.',
  'Entity extraction can later annotate names like Alice and DXOS.',
];

const BATCH_INTERVAL_MS = 1500;

// Demonstrates the streaming mechanism with no CodeMirror component: a scripted transcript is pushed
// through a PendingTextStreamer into an in-memory sink, exercising buffering, word-by-word reveal,
// and post-processing.
type StoryArgs = {
  mode: 'batch' | 'word';
  initialBufferMs: number;
  wordIntervalMs: number;
  postProcess: boolean;
};

const DefaultStory = ({ mode, initialBufferMs, wordIntervalMs, postProcess }: StoryArgs) => {
  const [snapshot, setSnapshot] = useState<PendingTextSnapshot>({ active: false, final: '', interim: '' });
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const run = useCallback(() => {
    timers.current.forEach((id) => clearTimeout(id));
    timers.current = [];

    const sink = memoryPendingTextSink(setSnapshot);
    const streamer = new PendingTextStreamer(sink, {
      mode,
      initialBufferMs,
      wordIntervalMs,
      // Example post-process: bold known entities (stands in for entity extraction → dx-anchors).
      postProcess: postProcess ? (text) => text.replace(/\b(DXOS|Alice)\b/g, '**$1**') : undefined,
    });
    streamer.start({ placeholder: 'Recording…' });

    TRANSCRIPT.forEach((batch, index) => {
      timers.current.push(setTimeout(() => streamer.push(batch), (index + 1) * BATCH_INTERVAL_MS));
    });
    timers.current.push(setTimeout(() => streamer.flush(), (TRANSCRIPT.length + 1) * BATCH_INTERVAL_MS));
  }, [mode, initialBufferMs, wordIntervalMs, postProcess]);

  return (
    <div className='flex flex-col gap-4 p-4 is-[40rem] overflow-hidden'>
      <Button onClick={run}>Start</Button>
      <div className='min-bs-24 rounded border border-separator p-2'>
        {snapshot.final.length === 0 && snapshot.interim.length === 0 && snapshot.placeholder ? (
          <span className='text-subdued italic'>{snapshot.placeholder}</span>
        ) : (
          <span className='bg-teal-surface text-teal-fg rounded px-1'>
            {snapshot.final}
            <span className='opacity-60'>{snapshot.interim}</span>
          </span>
        )}
      </div>
      <pre className='text-xs text-subdued'>{JSON.stringify(snapshot, null, 2)}</pre>
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-transcription/stories/PendingTextStreaming',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: { layout: 'fullscreen' },
  argTypes: {
    mode: { control: 'inline-radio', options: ['batch', 'word'] },
    initialBufferMs: { control: { type: 'number', step: 250 } },
    wordIntervalMs: { control: { type: 'number', step: 20 } },
    postProcess: { control: 'boolean' },
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WordByWord: Story = {
  args: {
    mode: 'word',
    initialBufferMs: 0,
    wordIntervalMs: 80,
    postProcess: true,
  },
};

export const Batched: Story = {
  args: {
    mode: 'batch',
    initialBufferMs: 1000,
    wordIntervalMs: 80,
    postProcess: true,
  },
};
