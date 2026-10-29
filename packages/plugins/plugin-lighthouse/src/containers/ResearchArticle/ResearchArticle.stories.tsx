//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { type Client } from '@dxos/client';
import { Feed, Filter } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { AccessToken, Connection } from '@dxos/link';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import * as CorePlugins from '@dxos/plugin-testing/CorePlugins';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout } from '@dxos/react-ui/testing';
import { TagIndex } from '@dxos/schema';

import { LighthousePlugin } from '#plugin';
import { translations } from '#translations';
import { Finding, Research } from '#types';

import { FixtureClientPlugin, seedResearch } from '../../testing/index.ts';
import { ResearchArticle } from './ResearchArticle.tsx';

const DefaultStory = () => {
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  const [research] = useQuery(space?.db, Filter.type(Research.Research));
  if (!research) {
    return <Loading />;
  }
  return <ResearchArticle role='article' subject={research} attendableId='story' />;
};

const seed =
  (options: { run: boolean }) =>
  ({ client }: { client: Client }) =>
    Effect.gen(function* () {
      yield* initializeIdentity(client);
      const space = yield* Effect.promise(() => client.spaces.create());
      yield* Effect.promise(() => space.waitUntilReady());
      seedResearch(space.db, options);
      yield* Effect.promise(() => space.db.flush());
    });

const plugins = (options: { run: boolean }) => [
  ...CorePlugins.make(),
  ClientPlugin.make({
    types: [
      Feed.Feed,
      Research.Research,
      Finding.Finding,
      TagIndex.TagIndex,
      Connection.Connection,
      AccessToken.AccessToken,
    ],
    onClientInitialized: seed(options),
  }),
  SpacePlugin({}),
  StorybookPlugin.make({}),
  FixtureClientPlugin(),
  LighthousePlugin(),
];

const meta: Meta<typeof DefaultStory> = {
  title: 'plugins/plugin-lighthouse/ResearchArticle',
  component: DefaultStory,
  decorators: [withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen', translations },
};

export default meta;

type Story = StoryObj<typeof meta>;

/** A Research whose Quick session has reported: the thread, its picks, and the ranked masonry. */
export const Default: Story = {
  decorators: [withPluginManager({ plugins: plugins({ run: true }) })],
};

/** A new Research: the goal, budget and engines, before Run. */
export const NotStarted: Story = {
  decorators: [withPluginManager({ plugins: plugins({ run: false }) })],
};
