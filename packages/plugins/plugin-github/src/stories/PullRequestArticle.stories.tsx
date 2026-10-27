//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import React, { useMemo } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { withPluginManager } from '@dxos/app-framework/testing';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Credential from '@dxos/compute/Credential';
import * as LayerSpec from '@dxos/compute/LayerSpec';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import { DXN } from '@dxos/echo';
import * as CorePlugins from '@dxos/plugin-testing/CorePlugins';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { PullRequest } from '@dxos/types';

import { translations } from '#translations';
import { GitHubOperation } from '#types';

import { PullRequestArticle } from '../containers/PullRequestArticle/PullRequestArticle.tsx';
import { PULL_REQUEST_13348_BODY, PULL_REQUEST_13348_RUNS } from '../testing/index.ts';
import PULL_REQUEST_13363_PATCH from '../testing/pull-request-13363.patch?raw';

/** Answers the article's GitHub reads from fixtures, so the story needs no connection or network. */
const handlers = OperationHandlerSet.make(
  Operation.withHandler(GitHubOperation.GetPullRequestStatus, () =>
    Effect.succeed({
      state: 'open' as const,
      title: 'plugin-preview: open a card for a link no resolver can preview',
      body: PULL_REQUEST_13348_BODY,
      ci: 'success' as const,
      checks: { total: PULL_REQUEST_13348_RUNS.length, passed: PULL_REQUEST_13348_RUNS.length, failed: 0, pending: 0 },
      runs: PULL_REQUEST_13348_RUNS,
      review: 'approved' as const,
      approvals: 1,
    }),
  ),
  Operation.withHandler(GitHubOperation.SyncPullRequest, () => Effect.succeed({ updated: [] })),
  Operation.withHandler(GitHubOperation.GetPullRequestDiff, () => Effect.succeed({ diff: PULL_REQUEST_13363_PATCH })),
  Operation.withHandler(LayoutOperation.AddToast, () => Effect.void),
);

// The GitHub operations declare `CredentialsService`, so the invoker resolves one before the fixture
// handlers above run; none of them reads it. LayerSpecs are snapshotted at boot, so this rides Startup.
const StoryCredentialsPlugin = Plugin.define(
  Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.githubStoryCredentials'), name: 'GitHub Story Credentials' }),
).pipe(
  Plugin.addModule({
    id: 'credentials',
    activatesOn: ActivationEvents.Startup,
    provides: [Capabilities.LayerSpec],
    activate: () =>
      Effect.succeed([
        Capability.contribute(
          Capabilities.LayerSpec,
          LayerSpec.make({ affinity: 'application', requires: [], provides: [Credential.CredentialsService] }, () =>
            Layer.succeed(Credential.CredentialsService, {
              queryCredentials: async () => [],
              getCredential: async () => {
                throw new Error('The story has no credentials.');
              },
            }),
          ),
        ),
      ]),
  }),
  Plugin.make,
);

// Built inside the render function so each mount gets its own object.
const DefaultStory = () => {
  const pullRequest = useMemo(
    () =>
      PullRequest.make({
        owner: 'dxos',
        repo: 'dxos',
        number: 13348,
        title: 'plugin-preview: open a card for a link no resolver can preview',
        url: 'https://github.com/dxos/dxos/pull/13348',
        state: 'open',
        baseBranch: 'main',
        headBranch: 'dm/wonderful-thompson-njcels',
      }),
    [],
  );
  return <PullRequestArticle role='article' attendableId='story' subject={pullRequest} />;
};

const meta = {
  title: 'plugins/plugin-github/stories/PullRequestArticle',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      capabilities: [
        Capability.contribute(AppCapabilities.Translations, translations),
        Capability.contribute(Capabilities.OperationHandler, handlers),
      ],
      plugins: [...CorePlugins.make(), StoryCredentialsPlugin()],
    }),
  ],
  parameters: { layout: 'fullscreen', translations },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The description reads at document width, inside the article's themed scroll area. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = await canvas.findByTestId('pull-request.body', {}, { timeout: 10_000 });
    await expect(body.closest('[data-scope="panel"][data-width="document"]')).not.toBeNull();
    await expect(body.closest('.dx-scroll-viewport')).not.toBeNull();
  },
};

/** dxos/dxos#13363, one file at a time: only CodeMirror's themed scroller scrolls, never its host. */
export const Files: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByTestId('pull-request.tab.files', {}, { timeout: 10_000 }));
    const files = await canvas.findByTestId('pull-request.files', {}, { timeout: 10_000 });
    await waitFor(() => expect(files.querySelector('.cm-editor')).not.toBeNull(), { timeout: 10_000 });
    const host = files.querySelector('.cm-editor')?.parentElement;
    await expect(host && getComputedStyle(host).overflowY).toBe('hidden');
  },
};
