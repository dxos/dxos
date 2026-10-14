//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';
import { expect, waitFor, within } from 'storybook/test';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { withPluginManager } from '@dxos/app-framework/testing';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import { Ref } from '@dxos/echo';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import * as CorePlugins from '@dxos/plugin-testing/CorePlugins';
import { type Space, useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { PullRequest, Task } from '@dxos/types';

import { translations } from '#translations';
import { GitHubOperation } from '#types';

import { PullRequestsArticle } from '../containers/PullRequestsArticle/PullRequestsArticle.tsx';

const DAY = 24 * 60 * 60_000;
const daysAgo = (days: number) => new Date(Date.now() - days * DAY).toISOString();

/** Number → the live standing the fixture answers with; absent numbers report no CI. */
const STATUS: Record<number, { ci: GitHubOperation.CiState; review: GitHubOperation.ReviewState }> = {
  13410: { ci: 'failure', review: 'none' },
  13402: { ci: 'success', review: 'approved' },
  13398: { ci: 'pending', review: 'none' },
  412: { ci: 'success', review: 'changes_requested' },
};

/** Answers each row's status read from fixtures, so the story needs no connection or network. */
const handlers = OperationHandlerSet.make(
  Operation.withHandler(GitHubOperation.GetPullRequestStatus, ({ pullRequest }) =>
    Effect.gen(function* () {
      const target = yield* Effect.promise(() => pullRequest.load());
      const { ci, review } = STATUS[target.number] ?? { ci: 'none' as const, review: 'none' as const };
      const total = ci === 'none' ? 0 : 12;
      return {
        state: target.state,
        title: target.title,
        ci,
        checks: {
          total,
          passed: ci === 'success' ? total : ci === 'failure' ? total - 2 : total - 3,
          failed: ci === 'failure' ? 2 : 0,
          pending: ci === 'pending' ? 3 : 0,
        },
        runs: [],
        review,
        approvals: review === 'approved' ? 2 : 0,
      };
    }),
  ),
);

const seed = (space: Space) => {
  const make = (props: Partial<Parameters<typeof PullRequest.make>[0]> & { number: number; title: string }) =>
    space.db.add(PullRequest.make({ owner: 'dxos', repo: 'dxos', state: 'open', ...props }));

  const failing = make({
    number: 13410,
    title: 'echo: memoize the index rebuild across reconnects',
    author: 'wittjosiah',
    updatedAt: daysAgo(0.1),
  });
  make({
    number: 13402,
    title: 'plugin-github: pull request triage list',
    author: 'dmaretskyi',
    updatedAt: daysAgo(1),
  });
  make({
    number: 13398,
    title: 'react-ui-menu: generic sort and group menus',
    author: 'burdon',
    updatedAt: daysAgo(2),
  });
  make({ number: 13377, title: 'docs: walkthrough fixtures', author: 'burdon', state: 'draft', updatedAt: daysAgo(6) });
  make({
    number: 13301,
    title: 'tasks: milestone grouping',
    author: 'richburdon',
    state: 'merged',
    updatedAt: daysAgo(9),
  });
  make({
    number: 13250,
    title: 'Revert flaky storybook watcher',
    author: 'wittjosiah',
    state: 'closed',
    updatedAt: daysAgo(20),
  });
  make({
    repo: 'edge',
    number: 412,
    title: 'router: forward trace context to db-service',
    author: 'dmaretskyi',
    updatedAt: daysAgo(3),
  });

  space.db.add(Task.make({ title: 'Fix index rebuild', status: 'started', artifacts: [Ref.make(failing)] }));
};

const DefaultStory = () => {
  const [space] = useSpaces();
  if (!space) {
    return <Loading data={{ space: false }} />;
  }
  return (
    <div className='dx-expand'>
      <PullRequestsArticle role='article' attendableId='story' db={space.db} />
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-github/stories/PullRequestsArticle',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      capabilities: [
        Capability.contribute(AppCapabilities.Translations, translations),
        Capability.contribute(Capabilities.OperationHandler, handlers),
      ],
      plugins: [
        ...CorePlugins.make(),
        ClientPlugin.make({
          types: [PullRequest.PullRequest, Task.Task],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { defaultSpace } = yield* initializeIdentity(client);
              yield* Effect.promise(async () => {
                seed(defaultSpace);
                await defaultSpace.db.flush({ indexes: true });
              });
            }),
        }),
      ],
    }),
  ],
  parameters: { layout: 'fullscreen', translations },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Ordered by relevance: the open pull request with failing CI (and a task tracking it) leads. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const rows = await canvas.findAllByTestId('pull-requests.row', {}, { timeout: 10_000 });
    await expect(rows).toHaveLength(7);
    await waitFor(
      () => expect(within(rows[0]).getByTestId('pull-requests.row.checks').textContent).toContain('CI failing'),
      { timeout: 10_000 },
    );
    await expect(within(rows[0]).getByTestId('pull-requests.row.tasks').textContent).toContain('Fix index rebuild');
  },
};
