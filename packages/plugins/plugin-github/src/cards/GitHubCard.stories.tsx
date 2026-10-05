//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';
import { expect, within } from 'storybook/test';

import { withPluginManager } from '@dxos/app-framework/testing';
import * as ObjectCard from '@dxos/app-toolkit/ObjectCard';
import { Obj } from '@dxos/echo';
import { Block, Button } from '@dxos/react-ui';
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

const LONG_TITLE =
  'plugin-interlocutor: agents reachable from Discord threads, with a memory graph and an interview skill';

const LONG_DESCRIPTION = [
  '## Summary',
  'Adds `@dxos/plugin-agent`, a plugin that lets agents be reached from Discord threads. It keeps a memory graph per',
  'thread and ships an interview skill, so the agent can gather requirements before it acts.',
  'It also adds stories and a fixture for the interview flow.',
].join('\n\n');

/** The deck popover's host: the regular size, a header menu in the end rail, and the card body under it. */
const PopoverStory = () => {
  const subject = useMemo(() => {
    const pullRequest = createPullRequest();
    Obj.update(pullRequest, (pullRequest) => {
      pullRequest.description = LONG_DESCRIPTION;
    });
    return pullRequest;
  }, []);

  return (
    <div className='dx-scope' data-size='md'>
      <ObjectCard.Root border={false} classNames='dx-card-popover dx-card-min-width'>
        <ObjectCard.Header
          subject={subject}
          menu={
            <Block rail='end'>
              <Button variant='ghost' icon='ph--dots-three-vertical--regular' iconOnly label='Actions' />
            </Block>
          }
        >
          {LONG_TITLE}
        </ObjectCard.Header>
        <GitHubCard role='card--content' subject={subject} />
      </ObjectCard.Root>
    </div>
  );
};

/**
 * In the popover a long title stays on one line, the description wraps to at most three lines with its icon beside the
 * first, and the card ends at its last row.
 */
export const TestPopover: Story = {
  args: { kind: 'pr' },
  render: () => <PopoverStory />,
  play: async ({ canvasElement }) => {
    const card = canvasElement.querySelector<HTMLElement>('.dx-card-popover');
    await expect(card).not.toBeNull();
    const title = within(canvasElement).getByRole('heading');
    const lineHeight = Number.parseFloat(getComputedStyle(title).lineHeight);
    await expect(title.getBoundingClientRect().height).toBeLessThan(2 * lineHeight);
    await expect(title.scrollWidth).toBeGreaterThan(title.clientWidth);

    const description = within(canvasElement).getByText(/^## Summary/);
    const descriptionStyle = getComputedStyle(description);
    const padding = Number.parseFloat(descriptionStyle.paddingTop) + Number.parseFloat(descriptionStyle.paddingBottom);
    const lines = Math.round((description.clientHeight - padding) / Number.parseFloat(descriptionStyle.lineHeight));
    await expect(lines).toBe(3);
    const row = description.closest<HTMLElement>('.dx-card-row');
    const icon = row?.querySelector<HTMLElement>('.dx-block, [data-rail="start"]');
    await expect(
      Math.abs((icon?.getBoundingClientRect().top ?? Number.NaN) - (row?.getBoundingClientRect().top ?? 0)),
    ).toBeLessThanOrEqual(1);

    // As far below the last row as the header is below the top: no empty band at the foot.
    const rows = Array.from(card?.querySelectorAll<HTMLElement>('.dx-card-row') ?? []);
    const header = card?.querySelector<HTMLElement>('.dx-card-header');
    const cardRect = card?.getBoundingClientRect();
    const top = (header?.getBoundingClientRect().top ?? 0) - (cardRect?.top ?? 0);
    const bottom = (cardRect?.bottom ?? 0) - (rows.at(-1)?.getBoundingClientRect().bottom ?? 0);
    await expect(Math.abs(bottom - top)).toBeLessThanOrEqual(2);
  },
};
