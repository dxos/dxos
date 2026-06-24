//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import React, { useCallback } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { Filter, Obj, Query, Ref, Relation } from '@dxos/echo';
import { initializeIdentity, ClientPlugin } from '@dxos/plugin-client/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { Expando } from '@dxos/schema';
import { AccessToken } from '@dxos/types';

import { translations } from '#translations';
import { Connection, SyncBinding } from '#types';

import { ConnectionView } from './ConnectionView';

// Sample per-binding options schema (real connectors contribute their own via `connector.optionsSchema`).
const OptionsSchema = Schema.Struct({
  includeArchived: Schema.Boolean.annotations({
    title: 'Include archived',
    description: 'Sync items that have been archived remotely.',
  }),
  label: Schema.optional(
    Schema.String.annotations({ title: 'Label', description: 'Optional label applied to synced items.' }),
  ),
});

const DefaultStory = ({ optionsSchema }: { optionsSchema?: Schema.Schema<any, any> }) => {
  const [space] = useSpaces();
  const [connection] = useQuery(space?.db, Filter.type(Connection.Connection));
  const bindings = useQuery(
    space?.db,
    connection
      ? Query.select(Filter.id(connection.id)).sourceOf(SyncBinding.SyncBinding)
      : Query.select(Filter.nothing()),
  );

  const handleRemoveBinding = useCallback((binding: SyncBinding.SyncBinding) => {
    Obj.getDatabase(binding)?.remove(binding);
  }, []);

  if (!connection) {
    return <Loading />;
  }

  return (
    <ConnectionView
      title='Work Trello'
      source='trello.com · alice@example.com'
      hasConnector
      bindings={bindings}
      optionsSchema={optionsSchema}
      canSync
      canChangeTargets
      syncing={false}
      loadingTargets={false}
      syncTargetsAvailable
      onSync={() => {}}
      onChangeTargets={() => {}}
      onDelete={() => {}}
      onRemoveBinding={handleRemoveBinding}
    />
  );
};

const meta = {
  title: 'plugins/plugin-connector/components/ConnectionView',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'column' }),
    withPluginManager({
      setupEvents: [AppActivationEvents.SetupSettings],
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Connection.Connection, SyncBinding.SyncBinding, Expando.Expando],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* initializeIdentity(client);
              const [space] = client.spaces.get();
              yield* Effect.promise(() => space.waitUntilReady());

              const connection = space.db.add(
                Connection.make({
                  name: 'Work Trello',
                  connectorId: 'trello.com',
                  accessToken: Ref.make(
                    AccessToken.make({ source: 'trello.com', account: 'alice@example.com', token: 'mock-token' }),
                  ),
                }),
              );

              // A live binding carrying options + a recent sync timestamp.
              const roadmap = space.db.add(Obj.make(Expando.Expando, { name: 'Product Roadmap' }));
              space.db.add(
                SyncBinding.make({
                  [Relation.Source]: connection,
                  [Relation.Target]: roadmap,
                  remoteId: 'board-1',
                  name: 'Product Roadmap',
                  lastSyncAt: new Date().toISOString(),
                  options: { includeArchived: true, label: 'roadmap' },
                }),
              );

              // A live binding that has never synced and recorded an error.
              const engineering = space.db.add(Obj.make(Expando.Expando, { name: 'Engineering' }));
              space.db.add(
                SyncBinding.make({
                  [Relation.Source]: connection,
                  [Relation.Target]: engineering,
                  remoteId: 'board-2',
                  name: 'Engineering',
                  lastError: 'Rate limited by remote service.',
                }),
              );

              // An orphaned binding whose target object was deleted elsewhere.
              const orphaned = space.db.add(Obj.make(Expando.Expando, { name: 'Deleted Board' }));
              space.db.add(
                SyncBinding.make({
                  [Relation.Source]: connection,
                  [Relation.Target]: orphaned,
                  remoteId: 'board-3',
                  name: 'Deleted Board',
                }),
              );
              space.db.remove(orphaned);

              yield* Effect.promise(() => space.db.flush({ indexes: true }));
            }),
        }),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    optionsSchema: OptionsSchema,
  },
};

export const WithoutOptions: Story = {
  args: {
    optionsSchema: undefined,
  },
};
