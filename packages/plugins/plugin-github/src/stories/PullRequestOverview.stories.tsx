//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { withPluginManager } from '@dxos/app-framework/testing';
import { PreviewEvents } from '@dxos/plugin-preview';
import { corePlugins } from '@dxos/plugin-testing';
import { Panel } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { GitHubPlugin } from '#plugin';
import { translations } from '#translations';

import { PullRequestOverview, type PullRequestOverviewProps } from '../components/PullRequestOverview/index.ts';
import { FixtureLinkSourcePlugin, PULL_REQUEST_13348_BODY, PULL_REQUEST_13348_RUNS } from '../testing/index.ts';

const meta = {
  title: 'plugins/plugin-github/stories/PullRequestOverview',
  component: PullRequestOverview,
  decorators: [
    (Story) => (
      <Panel.Root>
        <Panel.Content>
          <Story />
        </Panel.Content>
      </Panel.Root>
    ),
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      plugins: [...corePlugins(), GitHubPlugin(), FixtureLinkSourcePlugin()],
      setupEvents: [PreviewEvents.Start],
    }),
  ],
  parameters: { layout: 'fullscreen', translations },
} satisfies Meta<typeof PullRequestOverview>;

export default meta;

type Story = StoryObj<typeof meta>;

const REAL_PULL_REQUEST: PullRequestOverviewProps = {
  body: PULL_REQUEST_13348_BODY,
  details: {
    reference: 'dxos/dxos#13348',
    state: 'open',
    checks: 'CI passing 22/22',
    branches: 'dm/wonderful-thompson-njcels → main',
  },
  runs: PULL_REQUEST_13348_RUNS,
};

/** dxos/dxos#13348 as GitHub returned it: R2 demo media as pills, footers as cards, every check. */
export const Default: Story = {
  args: { ...REAL_PULL_REQUEST },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = await canvas.findByTestId('pull-request.body');
    await expect(body).not.toHaveTextContent('Generated with');
    await expect(body).not.toHaveTextContent('Composer preview');
    await expect(canvas.getAllByTestId('pull-request.artifact.pill')).toHaveLength(3);
    await expect(canvas.getByTestId('pull-request.related.preview')).toHaveTextContent('pr-13348-composer-dev');
    await expect(canvas.getByTestId('pull-request.related.claude')).toHaveTextContent(
      'session_016GM9fXXzbrr6JGNeeQBCmj',
    );
    await expect(canvas.getAllByTestId('pull-request.check')).toHaveLength(PULL_REQUEST_13348_RUNS.length);
  },
};

/** A failing, a running and a timed-out check sort above the passing ones. */
export const FailingChecks: Story = {
  args: {
    ...REAL_PULL_REQUEST,
    runs: [
      ...PULL_REQUEST_13348_RUNS.slice(2),
      { ...PULL_REQUEST_13348_RUNS[0], name: 'Check / test (shard=6)', outcome: 'failure', conclusion: 'failure' },
      { ...PULL_REQUEST_13348_RUNS[1], name: 'Check / e2e (shard=7)', outcome: 'failure', conclusion: 'timed_out' },
      { name: 'Check / storybook', outcome: 'pending' },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [first, second, third] = await canvas.findAllByTestId('pull-request.check');
    await expect(first).toHaveAttribute('data-outcome', 'failure');
    await expect(second).toHaveAttribute('data-outcome', 'failure');
    await expect(third).toHaveAttribute('data-outcome', 'pending');
  },
};

/** A pill opens its demo video in place. */
export const ArtifactPreview: Story = {
  args: { ...REAL_PULL_REQUEST },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [videoPill] = await canvas.findAllByTestId('pull-request.artifact.pill');
    await userEvent.click(videoPill);
    const popover = within(canvasElement.ownerDocument.body);
    await expect(await popover.findAllByTestId('pull-request.artifact.video')).not.toHaveLength(0);
  },
};

/** No description, no footers, checks still loading. */
export const Empty: Story = {
  args: { details: { reference: 'dxos/dxos#1' } },
};
