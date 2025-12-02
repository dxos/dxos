//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { Obj } from '@dxos/echo';
import { MemoryQueue } from '@dxos/echo-db';
import { TraceEvent as TraceEventSchema, type TraceEvent as TraceEventType } from '@dxos/functions-runtime';
import { withTheme } from '@dxos/react-ui/testing';

import { LogPanel } from './LogPanel';

const makeEvents = (): TraceEventType[] => {
  const base = Date.now() - 1000 * 60 * 5;
  const mk = (offset: number, idx: number): TraceEventType =>
    Obj.make(TraceEventSchema, {
      outcome: 'success',
      truncated: false,
      ingestionTimestamp: base + offset,
      logs: [
        { timestamp: base + offset + 100 * 1, level: 'info', message: `Invocation ${idx} started.`, context: { idx } },
        { timestamp: base + offset + 100 * 2, level: 'debug', message: 'Processing step.', context: { step: 1 } },
        {
          timestamp: base + offset + 100 * 3,
          level: 'warn',
          message: 'Potential issue detected.',
          context: { code: 'W001' },
        },
      ],
      exceptions: [],
    });

  const errorEvent: TraceEventType = Obj.make(TraceEventSchema, {
    outcome: 'failure',
    truncated: false,
    ingestionTimestamp: base + 4_000,
    logs: [
      { timestamp: base + 4_100, level: 'info', message: 'Doing work.', context: { job: 'X' } },
      {
        timestamp: base + 4_200,
        level: 'error',
        message: 'Unhandled error.',
        context: {
          err: { _id: 'TestError', message: 'Something went wrong.' },
          stack: 'Error: Something went wrong.\n    at doWork (index.ts:1:1)',
        },
      },
    ],
    exceptions: [],
  });

  return [mk(0, 1), mk(1_000, 2), mk(2_000, 3), errorEvent];
};

const DefaultStory = () => {
  const queue = useMemo(() => {
    const events = makeEvents();
    const queue = MemoryQueue.make({ objects: events });
    return queue;
  }, []);

  return (
    <div className='p-4'>
      <LogPanel queue={queue} />
    </div>
  );
};

const meta = {
  title: 'devtools/devtools/InvocationTrace/LogPanel',
  component: LogPanel,
  render: DefaultStory,
  decorators: [withTheme],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof LogPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
