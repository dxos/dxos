//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { type GetProfileUsageResponse } from '@dxos/protocols';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { UsageView } from './UsageView';

// Mock payload shaped like the `/api/metering/profile/usage` response.
const usageData: GetProfileUsageResponse = {
  profileId: 'did:key:z6MkExampleProfileIdentity',
  usage: [
    { eventType: 'ai', valueKey: 'inputTokens', subtypePattern: ['claude-opus-4'], amount: 1_284_500 },
    { eventType: 'ai', valueKey: 'outputTokens', subtypePattern: ['claude-opus-4'], amount: 238_900 },
    { eventType: 'ai', valueKey: 'inputTokens', subtypePattern: ['claude-sonnet-4'], amount: 92_300 },
    { eventType: 'ai', valueKey: 'outputTokens', subtypePattern: ['claude-sonnet-4'], amount: 18_400 },
  ],
  limits: [
    {
      eventType: 'ai',
      valueKey: 'inputTokens',
      subtypePattern: ['claude-opus-4'],
      limit: 5_000_000,
      windowDuration: 24 * 7 * 60 * 60,
    },
    {
      eventType: 'ai',
      valueKey: 'outputTokens',
      subtypePattern: ['*'],
      limit: 1_000_000,
      windowDuration: 24 * 30 * 60 * 60,
    },
    {
      eventType: 'ai',
      valueKey: 'inputTokens',
      subtypePattern: ['*'],
      limit: 20_000_000,
      windowDuration: 24 * 30 * 60 * 60,
    },
  ],
  buckets: [],
};

const meta = {
  title: 'plugins/plugin-client/containers/UsageView',
  component: UsageView,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  tags: ['test'],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof UsageView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    state: 'ready',
    data: usageData,
    lastUpdated: new Date('2026-06-16T12:00:00Z').getTime(),
    onRefresh: () => {},
  },
};

// Internal plan: a single unlimited (`limit: null`) `ai` limit — renders without a meter.
export const Internal: Story = {
  args: {
    state: 'ready',
    data: {
      profileId: usageData.profileId,
      usage: usageData.usage,
      limits: [
        {
          eventType: 'ai',
          valueKey: 'outputTokens',
          subtypePattern: ['*'],
          limit: null,
          windowDuration: 24 * 30 * 60 * 60,
        },
      ],
      buckets: [],
    },
    lastUpdated: new Date('2026-06-16T12:00:00Z').getTime(),
    onRefresh: () => {},
  },
};

export const Loading: Story = {
  args: { state: 'loading' },
};

export const Error: Story = {
  args: { state: 'error' },
};

export const Empty: Story = {
  args: {
    state: 'ready',
    data: { profileId: usageData.profileId, usage: [], limits: [], buckets: [] },
    lastUpdated: new Date('2026-06-16T12:00:00Z').getTime(),
    onRefresh: () => {},
  },
};

export const Unavailable: Story = {
  args: { state: 'unavailable' },
};
