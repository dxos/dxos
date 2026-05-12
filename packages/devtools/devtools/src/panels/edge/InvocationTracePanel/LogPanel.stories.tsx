//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { Trace } from '@dxos/compute';
import { Obj } from '@dxos/echo';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { LogPanel } from './LogPanel';

const makeMessages = (): Trace.Message[] => {
  const base = Date.now() - 1000 * 60 * 5;

  const mk = (offset: number, idx: number): Trace.Message =>
    Obj.make(Trace.Message, {
      meta: { pid: `proc-${idx}` },
      isEphemeral: false,
      events: [
        {
          timestamp: base + offset + 100,
          type: Trace.Log.key,
          data: { level: 'info', message: `Invocation ${idx} started.`, context: { idx } },
        },
        {
          timestamp: base + offset + 200,
          type: Trace.Log.key,
          data: { level: 'debug', message: 'Processing step.', context: { step: 1 } },
        },
        {
          timestamp: base + offset + 300,
          type: Trace.Log.key,
          data: { level: 'warn', message: 'Potential issue detected.', context: { code: 'W001' } },
        },
      ],
    });

  const errorMessage = Obj.make(Trace.Message, {
    meta: { pid: 'proc-error' },
    isEphemeral: false,
    events: [
      {
        timestamp: base + 4_100,
        type: Trace.Log.key,
        data: { level: 'info', message: 'Doing work.', context: { job: 'X' } },
      },
      {
        timestamp: base + 4_200,
        type: Trace.Log.key,
        data: {
          level: 'error',
          message: 'Unhandled error.',
          context: {
            err: { _id: 'TestError', message: 'Something went wrong.' },
            stack: 'Error: Something went wrong.\n    at doWork (index.ts:1:1)',
          },
        },
      },
    ],
  });

  return [mk(0, 1), mk(1_000, 2), mk(2_000, 3), errorMessage];
};

const DefaultStory = () => {
  const messages = useMemo(() => makeMessages(), []);

  return (
    <div className='p-4'>
      <LogPanel messages={messages} />
    </div>
  );
};

const meta = {
  title: 'devtools/devtools/InvocationTrace/LogPanel',
  component: LogPanel,
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof LogPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
