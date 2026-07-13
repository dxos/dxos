//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { type FC } from 'react';

import { withPluginManager, withSurfaceDebug } from '@dxos/app-framework/testing';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { persistentClientServices } from '@dxos/client/testing';
import { configPreset } from '@dxos/config';
import { Operation, Trigger } from '@dxos/compute';
import { Feed, Tag } from '@dxos/echo';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { Connection, SyncBinding } from '@dxos/plugin-connector';
import { ConnectorPlugin } from '@dxos/plugin-connector/plugin';
import { translations as connectorTranslations } from '@dxos/plugin-connector/translations';
import { DebugPlugin } from '@dxos/plugin-debug/plugin';
import { Mailbox } from '@dxos/plugin-inbox';
import { InboxPlugin } from '@dxos/plugin-inbox/testing';
import { translations as inboxTranslations } from '@dxos/plugin-inbox/translations';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { ProgressPlugin } from '@dxos/plugin-progress/plugin';
import { translations as progressTranslations } from '@dxos/plugin-progress/translations';
import { RoutinePlugin } from '@dxos/plugin-routine/plugin';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { withLayout } from '@dxos/react-ui/testing';
import { TagIndex } from '@dxos/schema';
import { ModuleContainer } from '@dxos/story-modules';
import { AccessToken, Cursor, Message, Organization, Person } from '@dxos/types';

import { Module, MailboxTriggerRelation, StoryModulesPlugin, StorySyncPlugin, SyncTriggerRunner } from '../testing';

const SYNC_STORY_TYPES = [
  AccessToken.AccessToken,
  Connection.Connection,
  Cursor.Cursor,
  Feed.Feed,
  Mailbox.Mailbox,
  MailboxTriggerRelation,
  Message.Message,
  Operation.PersistentOperation,
  Organization.Organization,
  Person.Person,
  SyncBinding.SyncBinding,
  Tag.Tag,
  TagIndex.TagIndex,
  Trigger.Trigger,
];

// Computed once at module scope (not inside the `withPluginManager` initializer, which re-runs on
// every render) so the story doesn't spawn a fresh dedicated worker/coordinator on each re-render.
const SYNC_STORY_CLIENT_SERVICES = persistentClientServices(configPreset({ edge: 'dev' }));

type DecoratorOptions = {
  routine?: boolean;
};

const createDecorators = ({ routine = false }: DecoratorOptions = {}) => [
  withSurfaceDebug(false),
  withLayout({ layout: 'fullscreen' }),
  withPluginManager(() => ({
    setupEvents: [AppActivationEvents.SetupSettings],
    plugins: [
      ...corePlugins(),
      ClientPlugin({
        types: SYNC_STORY_TYPES,
        ...SYNC_STORY_CLIENT_SERVICES,
        onClientInitialized: ({ client }) =>
          Effect.gen(function* () {
            if (client.halo.identity.get()) {
              return;
            }

            const { personalSpace: space } = yield* initializeIdentity(client);
            space.db.add(Mailbox.make());
            yield* Effect.promise(() => space.db.flush({ indexes: true }));
          }),
      }),
      SpacePlugin({}),
      InboxPlugin(),
      ConnectorPlugin(),
      DebugPlugin({}),
      PreviewPlugin(),
      ProgressPlugin(),
      ...(routine ? [RoutinePlugin()] : []),
      StorySyncPlugin(),
      StoryModulesPlugin(),
      StorybookPlugin({}),
    ],
  })),
];

const DefaultStory = () => (
  <ModuleContainer
    layout={[[Module.Mailbox], [Module.Message], [Module.Topics], [Module.Connector, Module.Archive, Module.Stats]]}
    compact
  />
);

const CronSyncStory = () => (
  <>
    <SyncTriggerRunner />
    <ModuleContainer
      layout={[
        [Module.Mailbox],
        [Module.Message],
        [Module.Topics],
        [Module.Connector, Module.Triggers, Module.Archive, Module.Stats],
      ]}
      compact
    />
  </>
);

const meta = {
  title: 'stories/stories-inbox/MailboxSync',
  component: DefaultStory as FC,
  decorators: createDecorators(),
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

export const CronSync: Story = {
  render: CronSyncStory,
  decorators: createDecorators({ routine: true }),
};
