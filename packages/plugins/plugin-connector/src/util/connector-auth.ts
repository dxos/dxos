//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppNode } from '@dxos/app-toolkit';
import { Database, type Key, Obj, type Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Cursor } from '@dxos/link';
import { type Node } from '@dxos/plugin-graph';

import { meta } from '../meta';
import { ConnectorCoordinator, type ConnectorEntry } from '../types';
import * as Connection from '../types/Connection';

/** Icon shown on "Connect X" entries and on the menu's trigger button. */
const CONNECT_ICON = 'ph--plugs--regular';

/** Connectors from `connectorIds` that expose an auth flow (oauth or credentialForm). */
const offeredConnectors = (
  allConnectors: readonly ConnectorEntry[],
  connectorIds: readonly string[],
): ConnectorEntry[] =>
  connectorIds
    .map((id) => allConnectors.find((connector) => connector.id === id))
    .filter(
      (connector): connector is ConnectorEntry => !!connector && (!!connector.oauth || !!connector.credentialForm),
    );

/** Existing connections for any of `connectorIds`, offered for reuse (binding a new target to them). */
const reusableConnections = (
  allConnections: readonly Connection.Connection[],
  connectorIds: readonly string[],
): Connection.Connection[] =>
  allConnections.filter(
    (connection) => connection.connectorId !== undefined && connectorIds.includes(connection.connectorId),
  );

export type ConnectorAuthActionsOptions = {
  /** Stable ids of the {@link ConnectorEntry} entries the menu offers: existing connections from any
   * of them are offered for reuse, and each (with an auth flow) gets a "Connect X" entry. */
  connectorIds: readonly string[];
  db: Database.Database;
  spaceId: Key.SpaceId;
  /** Existing local object (e.g. an empty Mailbox) to wire up as the new connection's first sync
   * target, forwarded to the connector's `onTokenCreated` and the reuse binding. */
  existingTarget?: Ref.Ref<Obj.Unknown>;
  allConnectors: readonly ConnectorEntry[];
  allConnections: readonly Connection.Connection[];
};

/**
 * The connector-auth action group for an object — the single source shared by the standalone
 * `ConnectorAuthMenu` component (plugin-assistant, which renders its children as a dropdown menu) and
 * owning plugins' `app-graph-builder` extensions (studio/ibkr/inbox, which contribute it to an object
 * toolbar). Always a single dropdown group so both renderings are identical.
 *
 * Its children: existing {@link Connection}s offered for reuse (bind inline), a separator, then a
 * "Connect X" entry per connector with an auth flow. Returns `[]` when there is nothing to offer.
 * Contribute this from an extension's `actionGroups:` callback so `graph.actions(nodeId)` picks it up
 * with the group's `type` intact. Children carry Effect `data`, so execute them with `useActionRunner`
 * (`Menu.Root onAction`) — for the coordinator/database context it provides.
 */
export const connectorAuthActions = ({
  connectorIds,
  db,
  spaceId,
  existingTarget,
  allConnectors,
  allConnections,
}: ConnectorAuthActionsOptions): Node.NodeArg<typeof Node.actionGroupSymbol>[] => {
  const offered = offeredConnectors(allConnectors, connectorIds);
  // Reuse binds the object as a new sync target, so only offer it when there is a target to bind.
  const connections = existingTarget ? reusableConnections(allConnections, connectorIds) : [];
  if (offered.length === 0 && connections.length === 0) {
    return [];
  }

  const connectAction = (connector: ConnectorEntry) =>
    AppNode.makeToolbarAction({
      id: `connect-${connector.id}`,
      // The graph action label schema has no interpolation slots (unlike `t()`), so use a plain string.
      label: `Connect ${connector.label ?? connector.id}`,
      icon: CONNECT_ICON,
      testId: `connectorPlugin.connect.${connector.id}`,
      data: () =>
        Effect.gen(function* () {
          const coordinator = yield* Capability.get(ConnectorCoordinator);
          yield* coordinator.createConnection({ db, spaceId, connectorId: connector.id, existingTarget });
        }),
    });

  const reuseAction = (connection: Connection.Connection) =>
    AppNode.makeToolbarAction({
      id: `reuse-${connection.id}`,
      label: connectorLabel(allConnectors, connection),
      data: () =>
        Effect.gen(function* () {
          if (!existingTarget) {
            return;
          }
          const target = yield* Database.load(existingTarget);
          const accessToken = yield* Database.load(connection.accessToken);
          const name = accessToken.account;
          if (name) {
            Obj.update(target, (target) => Obj.setLabel(target, name));
          }
          const cursor = yield* Database.add(
            Cursor.makeExternal({ source: connection.accessToken, target: existingTarget }),
          );
          invariant(Cursor.isExternal(cursor));
          // Sets up recurring background sync for the target, if the connector declares it. Not
          // specially protected — a failure here propagates like any other step in this action
          // (e.g. a `Database.load` failure above); this action has no blanket catch of its own.
          const connector = allConnectors.find((entry) => entry.id === connection.connectorId);
          yield* connector?.onCursorCreated?.({ connection, cursor, target, db }) ?? Effect.void;
        }).pipe(Effect.provide(Database.layer(db))),
    });

  return [
    AppNode.makeToolbarActionGroup({
      id: CONNECTOR_AUTH_GROUP_ID,
      label: ['connect.label', { ns: meta.profile.key }],
      icon: CONNECT_ICON,
      // Show the "Connect" label next to the icon rather than icon-only.
      iconOnly: false,
      testId: 'connectorPlugin.connect',
      actions: [
        ...connections.map(reuseAction),
        ...(connections.length > 0 && offered.length > 0
          ? [AppNode.makeToolbarSeparator('connectorAuth-separator')]
          : []),
        ...offered.map(connectAction),
      ],
    }),
  ];
};

/** Id of the dropdown group {@link connectorAuthActions} produces; the menu reads its children. */
export const CONNECTOR_AUTH_GROUP_ID = 'connectorAuth';

/** Label for a connection's connector, falling back to the connection id when unregistered. */
const connectorLabel = (allConnectors: readonly ConnectorEntry[], connection: Connection.Connection): string =>
  allConnectors.find((connector) => connector.id === connection.connectorId)?.label ??
  connection.connectorId ??
  connection.id;
