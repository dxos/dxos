//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import React from 'react';

import { Capability, Plugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AppActivationEvents, AppCapabilities, AppPlugin } from '@dxos/app-toolkit';
import { Feed, Filter, Obj } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { ClientPlugin } from '@dxos/plugin-client/testing';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { GraphBuilder, Node } from '@dxos/plugin-graph';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout } from '@dxos/react-ui/testing';
import { AccessToken } from '@dxos/types';

import { Calendar } from '#types';

import { InboxPlugin } from '../../InboxPlugin';
import { InitializeCalendar } from './InitializeCalendar';

// Contributes a stub connector-auth toolbar action (mirroring `plugin-connector`'s
// `connectorAuthActions`) so stories can exercise the empty-state path that delegates to an
// installed integration plugin without pulling in `@dxos/plugin-connector`.
const MockConnectorAuthPlugin = Plugin.define(
  Plugin.makeMeta({
    key: DXN.make('org.dxos.plugin.inbox.story.mockConnectorAuth'),
    name: 'Mock Connector Auth',
  }),
).pipe(
  AppPlugin.addAppGraphModule({
    activate: () =>
      Effect.gen(function* () {
        const extension = yield* GraphBuilder.createExtension({
          id: 'mockConnectorAuth',
          match: (node) => (Calendar.instanceOf(node.data) ? Option.some(node.data) : Option.none()),
          actions: () =>
            Effect.succeed([
              Node.makeAction({
                id: 'mock-connect',
                data: () => Effect.void,
                properties: {
                  label: 'Mock connect',
                  icon: 'ph--plugs--regular',
                  disposition: 'toolbar',
                },
              }),
            ]),
        });
        return Capability.contributes(AppCapabilities.AppGraphBuilder, [extension]);
      }),
  }),
  Plugin.make,
);

type StoryArgs = {
  withToken?: boolean;
  withAuthSurface?: boolean;
};

const DefaultStory = (_: StoryArgs) => {
  const [space] = useSpaces();
  const [calendar] = useQuery(space?.db, Filter.type(Calendar.Calendar));
  if (!space?.db || !calendar) {
    return <Loading data={{ db: !!space?.db, calendar: !!calendar }} />;
  }

  return <InitializeCalendar calendar={calendar} />;
};

const meta = {
  title: 'plugins/plugin-inbox/containers/InitializeCalendar',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'column' }),
    withPluginManager<StoryArgs>(({ args: { withToken = false, withAuthSurface = false } }) => ({
      setupEvents: [AppActivationEvents.SetupSettings],
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [AccessToken.AccessToken, Feed.Feed, Calendar.Calendar],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { personalSpace } = yield* initializeIdentity(client);
              personalSpace.db.add(Calendar.make({ name: 'My Calendar' }));
              if (withToken) {
                personalSpace.db.add(
                  Obj.make(AccessToken.AccessToken, {
                    source: 'google.com',
                    account: 'user@example.com',
                    token: 'mock-token',
                  }),
                );
              }
              yield* Effect.promise(() => personalSpace.db.flush({ indexes: true }));
            }),
        }),
        StorybookPlugin({}),
        InboxPlugin(),
        PreviewPlugin(),
        ...(withAuthSurface ? [MockConnectorAuthPlugin()] : []),
      ],
    })),
  ],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    withToken: false,
    withAuthSurface: false,
  },
};

export const WithAuthSurface: Story = {
  args: {
    withToken: false,
    withAuthSurface: true,
  },
};

export const TokenConnected: Story = {
  args: {
    withToken: true,
  },
};
