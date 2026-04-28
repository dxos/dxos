//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { type InspectorStep } from '#types';

import { translations } from '../../translations';
import { ExecutionTimeline } from './ExecutionTimeline';

const NOW = Date.parse('2026-04-28T12:00:00Z');

const SAMPLE_STEPS: InspectorStep[] = [
  {
    id: 'turn-1',
    timestamp: NOW,
    type: 'turn-start',
    label: 'Turn 1',
    pending: false,
  },
  {
    id: 'user-1',
    timestamp: NOW + 100,
    type: 'user-message',
    label: 'User',
    pending: false,
    content: 'Find the latest deck for Acme and summarise it.',
  },
  {
    id: 'reasoning-1',
    timestamp: NOW + 250,
    type: 'reasoning',
    label: 'Reasoning',
    pending: false,
    content: 'I should search the deck index for "Acme" and then call dd_tldr on the top hit.',
  },
  {
    id: 'tool-1',
    timestamp: NOW + 800,
    type: 'tool-call',
    label: 'decks.search',
    pending: false,
    toolName: 'decks.search',
    toolCallId: 'call-1',
    toolInput: '{"query":"Acme","limit":5}',
  },
  {
    id: 'tool-1-result',
    timestamp: NOW + 1400,
    type: 'tool-result',
    label: 'decks.search',
    pending: false,
    toolName: 'decks.search',
    toolCallId: 'call-1',
    toolResult: '{"matches":[{"deckId":"deck-42","score":0.91}]}',
  },
  {
    id: 'tool-2',
    timestamp: NOW + 1500,
    type: 'tool-call',
    label: 'dd_tldr',
    pending: true,
    toolName: 'dd_tldr',
    toolCallId: 'call-2',
    toolInput: '{"deckId":"deck-42"}',
  },
  {
    id: 'stats-1',
    timestamp: NOW + 1500,
    type: 'stats',
    label: 'Tokens',
    pending: false,
    tokens: { input: 1240, output: 312 },
    duration: 1500,
  },
];

const meta = {
  title: 'plugins/plugin-inspector/components/ExecutionTimeline',
  component: ExecutionTimeline,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof ExecutionTimeline>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { steps: SAMPLE_STEPS },
};

export const Empty: Story = {
  args: { steps: [] },
};

export const SingleTurn: Story = {
  args: { steps: SAMPLE_STEPS.slice(0, 4) },
};
