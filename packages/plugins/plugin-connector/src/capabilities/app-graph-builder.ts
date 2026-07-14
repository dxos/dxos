//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode, AppNodeMatcher } from '@dxos/app-toolkit';
import { isSpace } from '@dxos/client/echo';
import { Operation } from '@dxos/compute';
import { Cursor } from '@dxos/cursor';
import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { GraphBuilder, Node, NodeMatcher } from '@dxos/plugin-graph';
import { SpaceOperation } from '@dxos/plugin-space';
import { linkedSegment } from '@dxos/react-ui-attention';

import { meta } from '#meta';
import { Connector } from '#types';

import { CONNECTIONS_SECTION_ID, CONNECTIONS_SECTION_TYPE } from '../constants';
import { Connection, ConnectorOperation } from '../types';
import { CursorsQuery, isCursorForConnection, isCursorForTarget } from '../util';

/**
 * Resolve the external-sync cursors authenticated by a connection's access token. Used by the
 * per-connection `delete` action to enumerate the cursors to remove alongside the connection.
 */
const queryConnectionBindings = (connection: Connection.Connection): Effect.Effect<Cursor.Cursor[]> => {
  const db = Obj.getDatabase(connection);
  if (!db) {
    return Effect.succeed([]);
  }
  return Database.query(CursorsQuery).run.pipe(
    Effect.provide(Database.layer(db)),
    Effect.map((cursors) => cursors.filter((cursor) => isCursorForConnection(cursor, connection))),
    Effect.orElseSucceed(() => []),
  );
};

/**
 * Reactive matcher: matches an ECHO object that has an external-sync {@link Cursor} targeting it and
 * returns that cursor. Read through the atom context so the match re-evaluates when cursors are
 * created or removed. The first cursor is chosen when multiple target one object; the companion
 * receives it as its article subject.
 */
const whenObjectHasCursor: NodeMatcher.NodeMatcher<Cursor.Cursor> = (node, get) => {
  if (!Obj.isObject(node.data)) {
    return Option.none();
  }
  const db = Obj.getDatabase(node.data);
  if (!db) {
    return Option.none();
  }
  const cursors = get(db.query(CursorsQuery).atom);
  const cursor = cursors.find((candidate) => isCursorForTarget(candidate, node.data));
  return cursor ? Option.some(cursor) : Option.none();
};

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      GraphBuilder.createExtension({
        id: 'connectionActions',
        match: (node) => (Connection.instanceOf(node.data) ? Option.some(node.data) : Option.none()),
        actions: (connection) =>
          Effect.gen(function* () {
            const connectors = (yield* Capability.Service).getAll(Connector).flat();
            const connector = connectors.find((entry) => entry.id === connection.connectorId);
            const spaceId = Obj.getDatabase(connection)?.spaceId;
            const actions = [];
            if (connector?.sync) {
              actions.push(
                Node.makeAction({
                  id: `${meta.profile.key}.sync-connection.${connection.id}`,
                  data: () =>
                    Operation.invoke(
                      ConnectorOperation.SyncConnection,
                      { connection: Ref.make(connection) },
                      { spaceId },
                    ),
                  properties: {
                    label: ['sync-connection.label', { ns: meta.profile.key }],
                    icon: 'ph--arrows-clockwise--regular',
                    disposition: 'list-item',
                  },
                }),
              );
            }
            actions.push(
              Node.makeAction({
                id: `${meta.profile.key}.delete-connection.${connection.id}`,
                // Remove the connection along with its cursors (deleting the connection does not
                // cascade to cursors that merely reference its access token).
                data: () =>
                  Effect.gen(function* () {
                    const cursors = yield* queryConnectionBindings(connection);
                    yield* Operation.invoke(SpaceOperation.RemoveObjects, {
                      objects: [connection, ...cursors],
                    });
                  }),
                properties: {
                  label: ['delete-connection.label', { ns: meta.profile.key }],
                  icon: 'ph--trash--regular',
                  disposition: 'list-item',
                  testId: 'connectorPlugin.deleteConnection',
                },
              }),
            );
            return actions;
          }),
      }),

      // Per-space connections section under the space Settings node.
      // Always visible so the user can discover and add connections even when none exist yet.
      // Separate listing extension so the graph reacts when connections are added or removed.
      GraphBuilder.createExtension({
        id: 'connectionsSection',
        match: AppNodeMatcher.whenSpaceSettings,
        connector: (space) =>
          Effect.succeed([
            Node.make({
              id: CONNECTIONS_SECTION_ID,
              type: CONNECTIONS_SECTION_TYPE,
              data: CONNECTIONS_SECTION_TYPE,
              properties: {
                label: ['space-panel.name', { ns: meta.profile.key }],
                icon: 'ph--plugs--regular',
                iconHue: 'emerald',
                draggable: false,
                droppable: false,
                space,
              },
            }),
          ]),
      }),

      // Companion panel: visible on any ECHO object that has an external-sync cursor targeting it.
      // Reactively appears and disappears as cursors are created or removed.
      GraphBuilder.createExtension({
        id: 'connectorCompanion',
        match: whenObjectHasCursor,
        connector: (cursor) =>
          Effect.succeed([
            AppNode.makeCompanion({
              id: linkedSegment('connector'),
              label: ['connection-companion.label', { ns: meta.profile.key }],
              icon: 'ph--plugs-connected--regular',
              data: cursor,
            }),
          ]),
      }),

      // Connection objects listed under the connections section node.
      GraphBuilder.createExtension({
        id: 'connectionListing',
        match: (node) => {
          const space = isSpace(node.properties.space) ? node.properties.space : undefined;
          return node.type === CONNECTIONS_SECTION_TYPE && space ? Option.some(space) : Option.none();
        },
        connector: (space, get) => {
          const connections = get(space.db.query(Filter.type(Connection.Connection)).atom);
          return Effect.succeed(
            connections
              .map((connection) =>
                AppNode.makeObject({
                  get,
                  db: space.db,
                  object: connection,
                }),
              )
              .filter((node): node is NonNullable<typeof node> => node !== null),
          );
        },
      }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
