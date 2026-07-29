//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { Feed, Filter, Obj } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { AccessToken } from '@dxos/link';
import { ClientPlugin } from '@dxos/plugin-client/testing';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout } from '@dxos/react-ui/testing';

import { Calendar } from '#types';

import { InboxPlugin } from '../../InboxPlugin';
import { InitializeCalendar } from './InitializeCalendar';

type StoryArgs = {
  withToken?: boolean;
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
    withPluginManager<StoryArgs>(({ args: { withToken = false } }) => ({
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
  },
};

export const TokenConnected: Story = {
  args: {
    withToken: true,
  },
};
