//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as AppNodeMatcher from '@dxos/app-toolkit/AppNodeMatcher';
import { isSpace } from '@dxos/client/echo';
import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Obj, Ref, Type } from '@dxos/echo';
import * as GraphNodeMatcher from '@dxos/graph/GraphNodeMatcher';
import { AccessToken, Connection, Cursor } from '@dxos/link';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';
import * as SpaceSchema from '@dxos/plugin-space/SpaceSchema';

import { meta } from '#meta';
import { ConnectorAnnotations, ConnectorSpec } from '#types';

import * as Binding from '../Binding.ts';
import * as ConnectorAuth from '../ConnectorAuth.ts';
import { CONNECTIONS_SECTION_ID, CONNECTIONS_SECTION_TYPE } from '../constants.ts';

/**
 * True when `connection`'s credential is for a different remote account than `target` already syncs, so
 * binding the two would be refused (see `Binding.checkAccount`). Unknown either way is not a
 * contradiction: the connection stays on offer and the bind decides.
 */
const contradictsTargetAccount = (
  connection: Connection.Connection,
  accessTokens: readonly AccessToken.AccessToken[],
  target: Obj.Unknown,
): boolean => {
  const accessToken = accessTokens.find((candidate) => Binding.isTokenFor(candidate, connection));
  return (
    accessToken !== undefined && Binding.checkAccount(target, accessToken.source, accessToken.account) === 'mismatch'
  );
};

/**
 * Reactive matcher: matches an ECHO object that has an external-sync {@link Cursor} targeting it and
 * returns that cursor. Read through the atom context so the match re-evaluates when cursors are
 * created or removed. The first cursor is chosen when multiple target one object; the companion
 * receives it as its article subject.
 */
const whenObjectHasCursor: GraphNodeMatcher.NodeMatcher<Cursor.Cursor> = (node, get) => {
  if (!Obj.isObject(node.data)) {
    return Option.none();
  }
  const db = Obj.getDatabase(node.data);
  if (!db) {
    return Option.none();
  }
  const cursors = get(db.query(Filter.type(Cursor.Cursor)).atom);
  const cursor = cursors.find((candidate) => Binding.targets(candidate, node.data));
  return cursor ? Option.some(cursor) : Option.none();
};

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Hoisted so the connector-reading extensions below establish a reactive dependency instead of
    // reading the capability manager synchronously (graph-extension bodies must never sync-get).
    const connectorAtom = yield* Capability.atom(ConnectorSpec.Connector);

    const extensions = yield* Effect.all([
      AppGraphBuilder.createExtension({
        id: 'connectionActions',
        match: (node) => (Connection.instanceOf(node.data) ? Option.some(node.data) : Option.none()),
        actions: (connection, get) =>
          Effect.gen(function* () {
            const connectors = get(connectorAtom).flat();
            const connector = connectors.find((entry) => entry.id === connection.connectorId);
            const actions = [];
            if (connector?.sync) {
              actions.push(
                AppGraphNode.makeAction({
                  id: `${meta.profile.key}.sync-connection.${connection.id}`,
                  // Runs through the account routine's trigger (dispatcher-driven continuation);
                  // a missing routine opens the seeded create-routine form instead.
                  data: () => {
                    const db = Obj.getDatabase(connection);
                    if (!db) {
                      return Effect.void;
                    }
                    return Binding.syncOrOfferRoutine({ connection, connector, db });
                  },
                  properties: {
                    label: ['sync-connection.label', { ns: meta.profile.key }],
                    icon: 'ph--arrows-clockwise--regular',
                    disposition: 'list-item',
                  },
                }),
              );
            }
            actions.push(
              AppGraphNode.makeAction({
                id: `${meta.profile.key}.delete-connection.${connection.id}`,
                // Cursors are left dormant rather than deleted, so a re-connect of the same account
                // resumes instead of re-walking the whole horizon; the sync Routine goes with the
                // connection, or its schedule would keep firing against a connection that is gone.
                data: () =>
                  Effect.gen(function* () {
                    const db = Obj.getDatabase(connection);
                    const routine = db
                      ? yield* Binding.findRoutine(connection).pipe(Effect.provide(Database.layer(db)))
                      : undefined;
                    yield* Operation.invoke(SpaceOperation.RemoveObjects, {
                      objects: routine ? [connection, routine] : [connection],
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
      AppGraphBuilder.createExtension({
        id: 'connectionsSection',
        url: { key: 'connections', kind: 'singleton', path: [SpaceSchema.SETTINGS_SECTION_ID] },
        match: AppNodeMatcher.whenSpaceSettings,
        connector: (space) =>
          Effect.succeed([
            AppGraphNode.make({
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
      AppGraphBuilder.createExtension({
        id: 'connectorCompanion',
        match: whenObjectHasCursor,
        connector: (cursor) =>
          Effect.succeed([
            AppNode.makeCompanion({
              variant: 'connector',
              label: ['connection-companion.label', { ns: meta.profile.key }],
              icon: 'ph--plugs-connected--regular',
              data: cursor,
            }),
          ]),
      }),

      // ConnectorSpec.Connector-auth ("Connect X") for any object whose type carries `ConnectorAnnotations.ConnectorAuthAnnotation` —
      // the single cross-plugin toolbar contribution. Opting in is purely declarative (annotate the
      // type); the connectorIds / bindTarget come from the annotation, and connected-state is derived
      // from bindTarget. Owning plugins inline their own sync/generate actions separately.
      AppGraphBuilder.createExtension({
        id: 'connectorAuth',
        match: (node) => {
          if (!Obj.isObject(node.data)) {
            return Option.none();
          }
          const type = Obj.getType(node.data);
          const schema = type ? Type.getSchema(type) : undefined;
          const annotation = schema
            ? Option.getOrUndefined(ConnectorAnnotations.ConnectorAuthAnnotation.get(schema))
            : undefined;
          return annotation ? Option.some({ object: node.data, annotation }) : Option.none();
        },
        // A dropdown group, contributed via `actionGroups` so its type/nested actions are preserved.
        actionGroups: ({ object, annotation }, get) =>
          Effect.gen(function* () {
            const db = Obj.getDatabase(object);
            if (!db) {
              return [];
            }
            // Read the connector list reactively BEFORE anything can return early. Connector modules
            // activate lazily, so on a fresh load this runs while the list is still empty — and an
            // early return that never touched the atom registered no dependency, so the action never
            // reappeared once the provider activated. That is why Connect showed up only right after
            // creating a mailbox: unrelated graph churn, not the capability arriving.
            get(connectorAtom);
            const capabilities = yield* Capability.Service;
            // The manager is the authority on what is registered, and `connectorIds` below is derived
            // from it — reading the providers from a lagging atom instead (a module still activating, or
            // an atom resolved against a different registry) is what left a disabled Connect frozen on a
            // toolbar whose provider was installed. The atom read above is kept purely for the reactive
            // dependency that re-runs this when one arrives.
            const allConnectors = capabilities.getAll(ConnectorSpec.Connector).flat();
            if (allConnectors.length === 0) {
              // Nothing known yet: indistinguishable from "none installed", so contribute nothing rather
              // than a disabled control that would stick once the registry fills in.
              return [];
            }
            const connectorIds =
              typeof annotation.connectorIds === 'function'
                ? annotation.connectorIds(object, capabilities)
                : annotation.connectorIds;
            if (connectorIds.length === 0) {
              // Providers exist, none binds this type: a bindable type still shows where connecting
              // would happen, while a resolver-based type (studio artifacts) legitimately has none for
              // this object and keeps contributing nothing.
              return annotation.bindTarget ? ConnectorAuth.unavailableActions() : [];
            }
            const allConnections = get(db.query(Filter.type(Connection.Connection)).atom);
            const accessTokens = get(db.query(Filter.type(AccessToken.AccessToken)).atom);
            // bindTarget types are "connected" only while a live binding exists — a cursor targeting the
            // object AND the connection backing it — because counting an orphaned cursor (its connection
            // deleted) as connected hid Connect while the owning plugin's sync action, which needs that
            // connection, hid too. Space-level types (no bindTarget) are connected once any Connection
            // for one of the connectorIds exists.
            const connected = annotation.bindTarget
              ? Binding.find(get(db.query(Filter.type(Cursor.Cursor)).atom), allConnections, object) !== undefined
              : allConnections.some(
                  (connection) => connection.connectorId !== undefined && connectorIds.includes(connection.connectorId),
                );
            if (connected) {
              // Connected: the owning plugin's own sync/generate action covers this state.
              return [];
            }
            const groups = ConnectorAuth.actions({
              connectorIds,
              db,
              spaceId: db.spaceId,
              existingTarget: annotation.bindTarget ? Ref.make(object) : undefined,
              allConnectors,
              // Reuse binds this object, so a connection for another account is not offered at all —
              // the bind would be refused, and a menu entry that always errors is worse than no entry.
              allConnections: annotation.bindTarget
                ? allConnections.filter((connection) => !contradictsTargetAccount(connection, accessTokens, object))
                : allConnections,
            });
            // An unconnected bindable object always keeps a Connect control, disabled when the
            // registered providers have no auth flow and no connection is left to reuse.
            return groups.length > 0 || !annotation.bindTarget ? groups : ConnectorAuth.unavailableActions();
          }),
      }),

      // Connection objects listed under the connections section node.
      AppGraphBuilder.createExtension({
        id: 'connectionListing',
        url: { key: 'connection', kind: 'item', path: [SpaceSchema.SETTINGS_SECTION_ID, CONNECTIONS_SECTION_ID] },
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

    return Capability.contribute(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
