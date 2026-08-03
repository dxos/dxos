//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import React, { useCallback, useMemo } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { Filter, Obj, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { AccessToken, Cursor } from '@dxos/link';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { Expando } from '@dxos/schema';

import { type TestConnectionStatus } from '#hooks';
import { translations } from '#translations';
import { Connection } from '#types';

import { isCursorForConnection } from '../../util';
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

const DefaultStory = ({
  optionsSchema,
  testStatus = 'valid',
  testError,
  canReauthenticate = true,
}: {
  optionsSchema?: Schema.Schema<any, any>;
  testStatus?: TestConnectionStatus;
  testError?: string;
  canReauthenticate?: boolean;
}) => {
  const [space] = useSpaces();
  const [connection] = useQuery(space?.db, Filter.type(Connection.Connection));
  const allCursors = useQuery(space?.db, Filter.type(Cursor.Cursor));
  const bindings = useMemo(
    () =>
      connection
        ? allCursors.filter((cursor): cursor is Cursor.ExternalCursor => isCursorForConnection(cursor, connection))
        : [],
    [allCursors, connection],
  );

  const handleRemoveBinding = useCallback((binding: Cursor.ExternalCursor) => {
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
      testStatus={testStatus}
      testError={testError}
      canReauthenticate={canReauthenticate}
      reauthenticating={false}
      onSync={() => {}}
      onChangeTargets={() => {}}
      onReauthenticate={() => {}}
      onTestConnection={() => {}}
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
          types: [Connection.Connection, Cursor.Cursor, Expando.Expando],
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
              const roadmapCursor = space.db.add(
                Cursor.makeExternal({
                  source: connection.accessToken,
                  target: Ref.make(roadmap),
                  externalId: 'board-1',
                  label: 'Product Roadmap',
                  options: { includeArchived: true, label: 'roadmap' },
                }),
              );
              Obj.update(roadmapCursor, (roadmapCursor) => {
                roadmapCursor.lastTick = new Date().toISOString();
              });

              // A live binding that has never synced and recorded an error.
              const engineering = space.db.add(Obj.make(Expando.Expando, { name: 'Engineering' }));
              const engineeringCursor = space.db.add(
                Cursor.makeExternal({
                  source: connection.accessToken,
                  target: Ref.make(engineering),
                  externalId: 'board-2',
                  label: 'Engineering',
                }),
              );
              Obj.update(engineeringCursor, (engineeringCursor) => {
                engineeringCursor.lastError = 'Rate limited by remote service.';
              });

              // An orphaned binding whose target object was deleted elsewhere.
              const orphaned = space.db.add(Obj.make(Expando.Expando, { name: 'Deleted Board' }));
              space.db.add(
                Cursor.makeExternal({
                  source: connection.accessToken,
                  target: Ref.make(orphaned),
                  externalId: 'board-3',
                  label: 'Deleted Board',
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

export const CredentialExpired: Story = {
  args: {
    optionsSchema: OptionsSchema,
    testStatus: 'invalid',
    testError: 'Trello rejected the credential. Reauthenticate to continue syncing.',
    canReauthenticate: true,
  },
};

export const Checking: Story = {
  args: {
    optionsSchema: OptionsSchema,
    testStatus: 'testing',
  },
};
