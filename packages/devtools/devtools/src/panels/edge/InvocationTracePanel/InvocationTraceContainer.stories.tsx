//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { ObjectId } from '@dxos/keys';
import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { withRegistry } from '@dxos/storybook-utils';

import { type InvocationSpan } from './hooks';
import { InvocationTraceContainer } from './InvocationTraceContainer';

const TARGETS = ['Airtable Webhook', 'Discord Bot', 'Email Processor', 'Slack Notifier', 'Data Sync'];

const createMockSpans = (count: number): InvocationSpan[] => {
  const base = Date.now() - count * 60_000;

  return Array.from({ length: count }, (_, index) => {
    const timestamp = base + index * 60_000 + Math.random() * 30_000;
    const duration = 200 + Math.random() * 15_000;
    const isFailed = index % 7 === 0;
    const isPending = index % 13 === 0;
    const target = TARGETS[index % TARGETS.length];

    return {
      pid: ObjectId.random(),
      timestamp,
      duration,
      outcome: isPending ? undefined : isFailed ? 'failure' : 'success',
      key: `org.dxos.script.${target.toLowerCase().replace(/\s+/g, '-')}`,
      name: target,
      input: {
        event: `trigger_${index}`,
        target,
        payload: { timestamp: new Date(timestamp).toISOString(), attempt: 1 },
      },
      error: isFailed ? `Function "${target}" timed out after 30s` : undefined,
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
