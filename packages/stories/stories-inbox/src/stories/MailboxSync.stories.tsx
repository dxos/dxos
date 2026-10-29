//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { withPluginManager, withSurfaceDebug } from '@dxos/app-framework/testing';
import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import { type Client } from '@dxos/client';
import { persistentClientServices } from '@dxos/client/testing';
import * as Operation from '@dxos/compute/Operation';
import * as Trigger from '@dxos/compute/Trigger';
import { configPreset } from '@dxos/config';
import { Feed, Filter, Tag } from '@dxos/echo';
import { AccessToken, Connection, Cursor } from '@dxos/link';
import * as AssistantPlugin from '@dxos/plugin-assistant/AssistantPlugin';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import * as ConnectorPlugin from '@dxos/plugin-connector/ConnectorPlugin';
import { translations as connectorTranslations } from '@dxos/plugin-connector/translations';
import * as DebugPlugin from '@dxos/plugin-debug/DebugPlugin';
import * as GooglePlugin from '@dxos/plugin-google/GooglePlugin';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import { InboxPlugin } from '@dxos/plugin-inbox/testing';
import { translations as inboxTranslations } from '@dxos/plugin-inbox/translations';
import * as JmapPlugin from '@dxos/plugin-jmap/JmapPlugin';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import * as ProgressPlugin from '@dxos/plugin-progress/ProgressPlugin';
import { translations as progressTranslations } from '@dxos/plugin-progress/translations';
import * as RoutinePlugin from '@dxos/plugin-routine/RoutinePlugin';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import * as CorePlugins from '@dxos/plugin-testing/CorePlugins';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { withLayout } from '@dxos/react-ui/testing';
import { TagIndex } from '@dxos/schema';
import { ModuleContainer, UpdateCompanionStubPlugin } from '@dxos/storybook-testing';
import { Message, Organization, Person } from '@dxos/types';

import { StoryRole } from '../modules/index.ts';
import { StoryModulesPlugin } from '../testing/modules.tsx';

const TYPES = [
  AccessToken.AccessToken,
  Connection.Connection,
  Cursor.Cursor,
  Feed.Feed,
  Mailbox.Mailbox,
  Message.Message,
  Operation.PersistentOperation,
  Organization.Organization,
  Person.Person,
  Tag.Tag,
  TagIndex.TagIndex,
  Trigger.Trigger,
];

// Computed once at module scope (not inside the `withPluginManager` initializer, which re-runs on
// every render) so the story doesn't spawn a fresh dedicated worker/coordinator on each re-render.
const CLIENT_SERVICES = persistentClientServices(configPreset({ edge: 'preview' }));

/** The returning identity's default space, once the settings space that designates it has opened. */
const getReadyDefaultSpace = (client: Client) =>
  Effect.gen(function* () {
    const settingsSpace = AppSpace.getSettingsSpace(client);
    if (settingsSpace) {
      yield* Effect.promise(() => settingsSpace.waitUntilReady());
    }
    const space = AppSpace.getDefaultSpace(client);
    if (space) {
      yield* Effect.promise(() => space.waitUntilReady());
    }
    return space;
  });

const DECORATORS = [
  withSurfaceDebug(false),
  withLayout({ layout: 'fullscreen' }),
  withPluginManager(() => ({
    plugins: [
      ...CorePlugins.make(),
      ClientPlugin.make({
        types: TYPES,
        ...CLIENT_SERVICES,
        onClientInitialized: ({ client }) =>
          Effect.gen(function* () {
            const space = client.halo.identity.get()
              ? yield* getReadyDefaultSpace(client)
              : (yield* initializeIdentity(client)).defaultSpace;
            if (!space) {
              return;
            }

            // The profile is persistent, so a Mailbox deleted in an earlier run would otherwise leave the
            // story with nothing to connect or sync.
            const mailboxes = yield* Effect.promise(() => space.db.query(Filter.type(Mailbox.Mailbox)).run());
            if (mailboxes.length === 0) {
              space.db.add(Mailbox.make());
              yield* Effect.promise(() => space.db.flush({ indexes: true }));
            }
          }),
      }),
      SpacePlugin({}),
      InboxPlugin(),
      ConnectorPlugin.make(),
      DebugPlugin.make({}),
      // `Mailbox` resolves its connector-auth providers from the registry, so without one registered
      // the toolbar offers no Connect action.
      GooglePlugin.make(),
      JmapPlugin.make(),
      AssistantPlugin.make(),
      PreviewPlugin.make(),
      ProgressPlugin.make(),
      RoutinePlugin.make(),
      UpdateCompanionStubPlugin(),
      StoryModulesPlugin(),
      StorybookPlugin.make({}),
    ],
  })),
];

const DefaultStory = () => (
  <ModuleContainer
    layout={[
      [StoryRole.Mailbox, StoryRole.Message],
      [StoryRole.Archive, StoryRole.Stats, StoryRole.SyncState],
      [StoryRole.Connector, StoryRole.Triggers],
      [StoryRole.Trace, StoryRole.SwarmTrace],
    ]}
  />
);

const meta = {
  title: 'stories/stories-inbox/MailboxSync',
  component: DefaultStory,
  decorators: DECORATORS,
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
    translations: [...inboxTranslations, ...connectorTranslations, ...progressTranslations],
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: DefaultStory,
};
