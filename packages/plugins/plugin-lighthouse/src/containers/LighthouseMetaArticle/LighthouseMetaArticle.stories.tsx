//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { type Client } from '@dxos/client';
import { Filter, Obj, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { AccessToken, Connection } from '@dxos/link';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import * as CorePlugins from '@dxos/plugin-testing/CorePlugins';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout } from '@dxos/react-ui/testing';

import { meta as pluginMeta } from '#meta';
import { LighthousePlugin } from '#plugin';
import { translations } from '#translations';

import { metaTranslations } from '../../components/LighthouseMeta/index.ts';
import { LIGHTHOUSE_CONNECTOR_ID } from '../../constants.ts';
import { FIXTURE_URL, FixtureClientPlugin } from '../../testing/index.ts';
import { LighthouseMetaArticle } from './LighthouseMetaArticle.tsx';

const DefaultStory = () => {
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  const [connection] = useQuery(space?.db, Filter.type(Connection.Connection));
  if (!connection) {
    return <Loading />;
  }
  return <LighthouseMetaArticle role='article' subject={connection} attendableId='story' />;
};

const seed = ({ client }: { client: Client }) =>
  Effect.gen(function* () {
    yield* initializeIdentity(client);
    const space = yield* Effect.promise(() => client.spaces.create());
    yield* Effect.promise(() => space.waitUntilReady());
    const accessToken = space.db.add(
      Obj.make(AccessToken.AccessToken, { source: 'lighthouse.local', account: FIXTURE_URL, token: '' }),
    );
    space.db.add(
      Connection.make({ name: 'Lighthouse', connectorId: LIGHTHOUSE_CONNECTOR_ID, accessToken: Ref.make(accessToken) }),
    );
    yield* Effect.promise(() => space.db.flush());
  });

const meta: Meta<typeof DefaultStory> = {
  title: 'plugins/plugin-lighthouse/LighthouseMetaArticle',
  component: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      plugins: [
        ...CorePlugins.make(),
        ClientPlugin.make({ types: [Connection.Connection, AccessToken.AccessToken], onClientInitialized: seed }),
        SpacePlugin({}),
        StorybookPlugin.make({}),
        FixtureClientPlugin(),
        LighthousePlugin(),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations: [...translations, { 'en-US': { [pluginMeta.profile.key]: metaTranslations } }],
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
