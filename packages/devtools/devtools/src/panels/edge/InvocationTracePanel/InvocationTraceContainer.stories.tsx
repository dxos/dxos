//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { type InvocationSpan, InvocationOutcome } from '@dxos/functions-runtime';
import { ObjectId } from '@dxos/keys';
import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { withRegistry } from '@dxos/storybook-utils';

import { InvocationTraceContainer } from './InvocationTraceContainer';

const TARGETS = ['Airtable Webhook', 'Discord Bot', 'Email Processor', 'Slack Notifier', 'Data Sync'];

const createMockSpans = (count: number): InvocationSpan[] => {
  const base = Date.now() - count * 60_000;

  return Array.from({ length: count }, (_, index) => {
    const timestamp = base + index * 60_000 + Math.random() * 30_000;
    const duration = 200 + Math.random() * 15_000;
    const isFailed = index % 7 === 0;
    const isPending = index % 13 === 0;

    return {
      id: ObjectId.random(),
      timestamp,
      duration,
      outcome: isPending ? InvocationOutcome.PENDING : isFailed ? InvocationOutcome.FAILURE : InvocationOutcome.SUCCESS,
      input: {
        event: `trigger_${index}`,
        target: TARGETS[index % TARGETS.length],
        payload: { timestamp: new Date(timestamp).toISOString(), attempt: 1 },
      },
      error: isFailed
        ? {
            name: 'InvocationError',
            message: `Function "${TARGETS[index % TARGETS.length]}" timed out after 30s`,
            stack: [
              `Error: Function "${TARGETS[index % TARGETS.length]}" timed out after 30s`,
              '    at runFunction (worker.ts:42:5)',
              '    at processInvocation (scheduler.ts:118:12)',
              '    at async EdgeRuntime.execute (runtime.ts:67:3)',
            ].join('\n'),
          }
        : undefined,
    } satisfies InvocationSpan;
  });
};

const MOCK_SPANS = createMockSpans(50);

const meta = {
  title: 'devtools/devtools/InvocationTrace/InvocationTraceContainer',
  component: InvocationTraceContainer,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withRegistry,
    withClientProvider({ createIdentity: true }),
  ],
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    invocationSpans: MOCK_SPANS,
    detailAxis: 'block',
  },
} satisfies Meta<typeof InvocationTraceContainer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const InlineAxis: Story = {
  args: {
    detailAxis: 'inline',
  },
};
