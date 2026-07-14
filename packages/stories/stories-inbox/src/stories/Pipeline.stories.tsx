//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useEffect, useRef } from 'react';

import { withPluginManager, withSurfaceDebug } from '@dxos/app-framework/testing';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { configPreset } from '@dxos/config';
import { Database, Feed, Filter, Tag } from '@dxos/echo';
import { useResolveRef } from '@dxos/echo-react';
import { EffectEx } from '@dxos/effect';
import { AccessToken, Cursor } from '@dxos/link';
import { BrainPlugin } from '@dxos/plugin-brain/plugin';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { Connection } from '@dxos/plugin-connector';
import { ConnectorPlugin } from '@dxos/plugin-connector/plugin';
import { translations as connectorTranslations } from '@dxos/plugin-connector/translations';
import { Mailbox } from '@dxos/plugin-inbox';
import { InboxPlugin } from '@dxos/plugin-inbox/testing';
import { translations as inboxTranslations } from '@dxos/plugin-inbox/translations';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { Config } from '@dxos/react-client';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { withLayout } from '@dxos/react-ui/testing';
import { TagIndex } from '@dxos/schema';
import { ModuleContainer } from '@dxos/story-modules';
import { Message, Organization, Person } from '@dxos/types';

import { Module, StoryAiPlugin, StoryModulesPlugin, StorySyncPlugin, seedDemoMessages } from '../testing';

/**
 * Schema for every object the connect+sync flow reads or writes: the mailbox + feed, the
 * OAuth-created access token / connection / binding / cursor, and the synced messages,
 * contacts, and tags.
 */
const SYNC_STORY_TYPES = [
  AccessToken.AccessToken,
  Connection.Connection,
  Cursor.Cursor,
  Feed.Feed,
  Mailbox.Mailbox,
  Message.Message,
  Organization.Organization,
  Person.Person,
  Tag.Tag,
  TagIndex.TagIndex,
];

/**
 * Seeds the feed with demo messages for the `SeededFacts` variant. `seedDemoMessages` is idempotent
 * (dedups by subject), so a reload against persistent storage never re-appends; the ref just avoids
 * redundant runs within a session. Renders nothing.
 */
const SeedRunner = () => {
  const [space] = useSpaces();
  const [mailbox] = useQuery(space?.db, Filter.type(Mailbox.Mailbox));
  const feed = useResolveRef(mailbox?.feed);
  const seededRef = useRef(false);
  useEffect(() => {
    if (!feed || !space || seededRef.current) {
      return;
    }

    seededRef.current = true;
    void EffectEx.runPromise(seedDemoMessages(feed).pipe(Effect.provide(Database.layer(space.db))));
  }, [feed, space]);
  return null;
};

type StoryArgs = {
  seed?: boolean;
};

const DefaultStory = ({ seed = false }: StoryArgs) => (
  <>
    {seed && <SeedRunner />}
    <ModuleContainer layout={[[Module.Mailbox], [Module.Message], [Module.Controls, Module.Facts]]} />
  </>
);

const meta = {
  title: 'stories/stories-inbox/Pipeline',
  render: DefaultStory,
  decorators: [
    withSurfaceDebug(false),
    withLayout({ layout: 'fullscreen' }),
    withPluginManager(() => ({
      setupEvents: [AppActivationEvents.SetupSettings],
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: SYNC_STORY_TYPES,
          config: new Config(
            {
              runtime: {
                client: { storage: { persistent: true } },
              },
            },
            configPreset({ edge: 'dev' }).values,
          ),
          // OPFS-backed storage so identity/spaces survive a page reload; without a worker the
          // client silently falls back to in-memory storage regardless of `storage.persistent`.
          createOpfsWorker: () => new Worker(new URL('@dxos/client/opfs-worker', import.meta.url), { type: 'module' }),
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
        BrainPlugin(),
        InboxPlugin(),
        ConnectorPlugin(),
        PreviewPlugin(),
        StorySyncPlugin(),
        StoryAiPlugin(),
        StoryModulesPlugin(),
        StorybookPlugin({}),
      ],
    })),
  ],
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
    translations: [...inboxTranslations, ...connectorTranslations],
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    seed: true,
  },
};

export const Live: Story = {
  args: {},
};
