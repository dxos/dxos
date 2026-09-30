//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { Panel } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { PullRequestFiles } from '../components/PullRequestFiles/index.ts';
import { usePullRequestFiles } from '../hooks/usePullRequestFiles.ts';
import PULL_REQUEST_13363_PATCH from '../testing/pull-request-13363.patch?raw';

type StoryArgs = { diff: string };

const STORAGE_KEY = 'story.reviewed.dxos/dxos#13363';

const DefaultStory = ({ diff }: StoryArgs) => {
  const files = usePullRequestFiles(diff, STORAGE_KEY);
  return (
    <Panel.Root>
      <Panel.Content>
        <PullRequestFiles
          tree={files.tree}
          file={files.file}
          reviewed={files.reviewed}
          total={files.files.length}
          onSelect={files.select}
          onReviewedChange={files.setReviewed}
        />
      </Panel.Content>
    </Panel.Root>
  );
};

const meta = {
  title: 'plugins/plugin-github/stories/PullRequestFiles',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen', controls: { disable: true }, translations },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** dxos/dxos#13363 (50 files): one file at a time beside the tree of every changed file. */
export const Default: Story = {
  args: { diff: PULL_REQUEST_13363_PATCH },
};

/** Checking a file off in the tree counts it as reviewed without opening it. */
export const Reviewed: Story = {
  args: { diff: PULL_REQUEST_13363_PATCH },
  beforeEach: () => {
    localStorage.removeItem(STORAGE_KEY);
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Re-queried per click: checking a file off re-renders the tree, which replaces the rows.
    await userEvent.click((await canvas.findAllByTestId('pull-request.files.reviewed'))[0]);
    await userEvent.click((await canvas.findAllByTestId('pull-request.files.reviewed'))[1]);
    await expect(await canvas.findByText('2 of 50 files reviewed')).toBeInTheDocument();
  },
};
