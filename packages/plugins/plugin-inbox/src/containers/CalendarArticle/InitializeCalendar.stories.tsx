//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Feed, Filter, Obj } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { AccessToken } from '@dxos/link';
import { ClientPlugin } from '@dxos/plugin-client/testing';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { corePlugins } from '@dxos/plugin-testing';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout } from '@dxos/react-ui/testing';

import { InboxPlugin } from '#plugin';
import { Calendar } from '#types';

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
      plugins: [
        ...corePlugins(),
        ClientPlugin.make({
          types: [AccessToken.AccessToken, Feed.Feed, Calendar.Calendar],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { defaultSpace } = yield* initializeIdentity(client);
              defaultSpace.db.add(Calendar.make({ name: 'My Calendar' }));
              if (withToken) {
                defaultSpace.db.add(
                  Obj.make(AccessToken.AccessToken, {
                    source: 'google.com',
                    account: 'user@example.com',
                    token: 'mock-token',
                  }),
                );
              }
              yield* Effect.promise(() => defaultSpace.db.flush({ indexes: true }));
            }),
        }),
        StorybookPlugin.make({}),
        InboxPlugin(),
        PreviewPlugin.make(),
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
