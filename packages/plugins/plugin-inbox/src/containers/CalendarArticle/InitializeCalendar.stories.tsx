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
import { Feed, Filter, Obj } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { ClientPlugin } from '@dxos/plugin-client/testing';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { useDatabase, useQuery, useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout } from '@dxos/react-ui/testing';
import { AccessToken } from '@dxos/types';

import { Calendar } from '#types';

import { InboxPlugin } from '../../InboxPlugin';
import { InitializeCalendar } from './InitializeCalendar';

// Contributes a stub `integration--auth` surface so stories can exercise the
// empty-state path that delegates to an installed integration plugin without
// pulling in `@dxos/plugin-integration`.
const MockAuthSurfacePlugin = Plugin.define(Plugin.makeMeta({
  key: DXN.make('org.dxos.plugin.inbox.story.mockAuthSurface'),
  name: 'Mock Auth Surface',
})).pipe(
  AppPlugin.addSurfaceModule({
    activate: () =>
      Effect.succeed(
        Capability.contributes(Capabilities.ReactSurface, [
          Surface.create({
            id: 'mockIntegrationAuth',
            role: 'integration--auth',
            component: ({ data }) => (
              <div className='text-description'>
                Mock auth surface for <code>{(data as { providerId?: string }).providerId}</code>
              </div>
            ),
          }),
        ]),
      ),
  }),
  Plugin.make,
);

type DefaultStoryProps = {
  withToken?: boolean;
  withAuthSurface?: boolean;
};

const DefaultStory = (_: DefaultStoryProps) => {
  const spaces = useSpaces();
  const db = useDatabase(spaces[0]?.id);
  const [calendar] = useQuery(db, Filter.type(Calendar.Calendar));
  if (!db || !calendar) {
    return <Loading data={{ db: !!db, calendar: !!calendar }} />;
  }

  return <InitializeCalendar calendar={calendar} />;
};

const meta = {
  title: 'plugins/plugin-inbox/containers/InitializeCalendar',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'column' }),
    withPluginManager<DefaultStoryProps>(({ args: { withToken = false, withAuthSurface = false } }) => ({
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
