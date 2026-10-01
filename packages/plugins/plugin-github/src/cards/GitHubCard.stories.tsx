//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { Obj } from '@dxos/echo';
import { Next } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { createIssue, createPullRequest, createRepo } from '../testing/index.ts';
import { GitHubCard } from './GitHubCard.tsx';

const subjects = {
  repo: createRepo,
  pr: createPullRequest,
  issue: createIssue,
};

type StoryArgs = {
  kind: keyof typeof subjects;
};

/**
 * The card as the popover hosts it: the host's header carries the label, the plugin's card the body.
 * `dx-card-popover` is the deck popover's own sizing, so every kind renders at the same width.
 */
const DefaultStory = ({ kind }: StoryArgs) => {
  const subject = useMemo(() => subjects[kind](), [kind]);
  return (
    <Next.Card.Root classNames='dx-card-popover'>
      <Next.Card.Header>
        <Next.Block>
          <Next.Icon icon={Obj.getIcon(subject)?.icon ?? 'ph--circle-dashed--regular'} />
        </Next.Block>
        <Next.Card.Title>{Obj.getLabel(subject)}</Next.Card.Title>
      </Next.Card.Header>
      <GitHubCard role='card--content' subject={subject} />
    </Next.Card.Root>
  );
};

const meta = {
  title: 'plugins/plugin-github/cards/GitHubCard',
  render: DefaultStory,
  argTypes: {
    kind: { control: 'select', options: Object.keys(subjects) },
  },
  decorators: [withTheme(), withLayout({ layout: 'centered' })],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Repo: Story = {
  args: {
    kind: 'repo',
  },
};

export const PullRequest: Story = {
  args: {
    kind: 'pr',
  },
};

export const Issue: Story = {
  args: {
    kind: 'issue',
  },
};
