//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { Obj } from '@dxos/echo';
import { Card, Icon } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { RemoteSession } from '@dxos/types';

import { translations } from '#translations';

import { RemoteSessionCard } from './RemoteSessionCard';

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

const sessions = {
  /** What the hooks actually write today: no title, no prose, no repo or branch. */
  running: () =>
    RemoteSession.make({
      sessionId: '19d75f0f-5464-47b6-9c09-a872e9b14b85',
      state: 'running',
      started: minutesAgo(12),
      lastCheckedIn: minutesAgo(1),
      worktree: '/Users/dmaretskyi/Code/dxos/dxos',
    }),
  /** Fully populated, so the card's upper bound is reviewable alongside the sparse case. */
  finished: () =>
    RemoteSession.make({
      sessionId: '7c2a1b40-90de-4f11-a3c2-5e8b7d6f1a92',
      title: 'Repoint the session hooks at the dev MCP',
      state: 'finished',
      lastMessage:
        'Hooks repointed and the whole path verified end to end. All six tasks now carry the correct assignee.',
      started: minutesAgo(180),
      lastCheckedIn: minutesAgo(95),
      finished: minutesAgo(95),
      repo: 'dxos/dxos',
      branch: 'dm/claude-code-mcp',
      worktree: '/Users/dmaretskyi/Code/dxos/dxos',
    }),
  failed: () =>
    RemoteSession.make({
      sessionId: 'b41e0c77-2f55-4a18-9d0e-33ac8b5e7104',
      title: 'Flaky shard investigation',
      state: 'failed',
      started: minutesAgo(60),
      lastCheckedIn: minutesAgo(44),
      finished: minutesAgo(44),
      worktree: '/Users/dmaretskyi/Code/dxos/worktrees/flaky-shard',
    }),
};

type StoryArgs = { kind: keyof typeof sessions };

/** The card as the popover hosts it: the host renders the header, the plugin the body. */
const DefaultStory = ({ kind }: StoryArgs) => {
  const subject = useMemo(() => sessions[kind](), [kind]);
  return (
    <Card.Root classNames='dx-card-popover'>
      <Card.Header>
        <Card.Block>
          <Icon icon={Obj.getIcon(subject)?.icon ?? 'ph--robot--regular'} />
        </Card.Block>
        <Card.Title>{RemoteSession.harnessName(subject) ?? 'Session'}</Card.Title>
      </Card.Header>
      <RemoteSessionCard role='card--content' subject={subject} />
    </Card.Root>
  );
};

const meta = {
  title: 'plugins/plugin-tasks/containers/RemoteSessionCard',
  render: DefaultStory,
  argTypes: {
    kind: { control: 'select', options: Object.keys(sessions) },
  },
  decorators: [withTheme(), withLayout({ layout: 'centered' })],
  parameters: { translations },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<StoryArgs>;

export const Running: Story = { args: { kind: 'running' } };
export const Finished: Story = { args: { kind: 'finished' } };
export const Failed: Story = { args: { kind: 'failed' } };
