//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';
import { expect, within } from 'storybook/test';

import { withPluginManager } from '@dxos/app-framework/testing';
import { ObjectCard } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
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
  /** Replaces the subject's label, to try a title longer than the card. */
  title?: string;
};

/**
 * The card as the popover hosts it: the host's header carries the label, the plugin's card the body.
 * `dx-card-popover` is the deck popover's own sizing, so every kind renders at the same width.
 */
const DefaultStory = ({ kind, title }: StoryArgs) => {
  const subject = useMemo(() => subjects[kind](), [kind]);
  return (
    <ObjectCard.Root classNames='dx-card-popover dx-card-min-width'>
      <ObjectCard.Header subject={subject}>{title ?? Obj.getLabel(subject)}</ObjectCard.Header>
      <GitHubCard role='card--content' subject={subject} />
    </ObjectCard.Root>
  );
};

const meta = {
  title: 'plugins/plugin-github/cards/GitHubCard',
  render: DefaultStory,
  argTypes: {
    kind: { control: 'select', options: Object.keys(subjects) },
  },
  decorators: [withTheme(), withLayout({ layout: 'centered' }), withPluginManager()],
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

/** A title longer than the card stays on one line, truncated, as the popover and gallery show it. */
export const TestLongTitle: Story = {
  args: {
    kind: 'pr',
    title: 'plugin-tasks: order-by and group-by controls for the task list, with persistent filters',
  },
  play: async ({ canvasElement }) => {
    const title = within(canvasElement).getByRole('heading');
    const { lineHeight } = getComputedStyle(title);
    // Under two lines tall (the box has padding, so not exactly one), and its text runs past the end.
    await expect(title.getBoundingClientRect().height).toBeLessThan(2 * Number.parseFloat(lineHeight));
    await expect(title.scrollWidth).toBeGreaterThan(title.clientWidth);
  },
};
