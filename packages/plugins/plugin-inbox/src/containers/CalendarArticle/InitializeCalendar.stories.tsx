//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Surface } from '@dxos/app-framework/ui';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { AccessToken } from '@dxos/cursor';
import { Feed, Filter, Obj } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { ClientPlugin } from '@dxos/plugin-client/testing';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { ConnectorAuth } from '@dxos/plugin-connector';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout } from '@dxos/react-ui/testing';

import { Calendar } from '#types';

import { InboxPlugin } from '../../InboxPlugin';
import { InitializeCalendar } from './InitializeCalendar';

// Contributes a stub `ConnectorAuth` surface so stories can exercise the
// empty-state path that delegates to an installed integration plugin without
// pulling in `@dxos/plugin-connector`.
const MockAuthSurfacePlugin = Plugin.define(
  Plugin.makeMeta({
    key: DXN.make('org.dxos.plugin.inbox.story.mockAuthSurface'),
    name: 'Mock Auth Surface',
  }),
).pipe(
  AppPlugin.addSurfaceModule({
    activate: () =>
      Effect.succeed(
        Capability.contributes(Capabilities.ReactSurface, [
          Surface.create({
            id: 'mockConnectorAuth',
            filter: Surface.makeFilter(ConnectorAuth),
            component: ({ data }) => (
              <div className='text-description'>
                Mock auth surface for{' '}
                <code>{(data as { connectorIds?: readonly string[] }).connectorIds?.join(', ')}</code>
              </div>
            ),
          }),
        ]),
      ),
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
        ...(withAuthSurface ? [MockAuthSurfacePlugin()] : []),
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
