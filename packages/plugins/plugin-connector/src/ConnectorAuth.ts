//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import type * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import { Database, type Key, Obj, type Ref } from '@dxos/echo';
import { Connection } from '@dxos/link';
import { log } from '@dxos/log';

import { meta } from '#meta';
import { ConnectorCoordination, ConnectorSpec } from '#types';

import * as Binding from './Binding';

/**
 * The "Connect" control for an object that can be bound to a remote account: one dropdown group whose
 * children are the existing {@link Connection}s offered for reuse and a "Connect X" entry per connector
 * with an auth flow. Shared by the standalone `ConnectorAuthMenu` (plugin-assistant) and the object
 * toolbars contributed from `app-graph-builder`, so both render the same thing.
 */

/** Icon shown on "Connect X" entries and on the menu's trigger button. */
const CONNECT_ICON = 'ph--plugs--regular';

/** Connectors from `connectorIds` that expose an auth flow (oauth or credentialForm). */
const offeredConnectors = (
  allConnectors: readonly ConnectorSpec.ConnectorEntry[],
  connectorIds: readonly string[],
): ConnectorSpec.ConnectorEntry[] =>
  connectorIds
    .map((id) => allConnectors.find((connector) => connector.id === id))
    .filter(
      (connector): connector is ConnectorSpec.ConnectorEntry =>
        !!connector && (!!connector.oauth || !!connector.credentialForm),
    );

/** Existing connections for any of `connectorIds`, offered for reuse (binding a new target to them). */
const reusableConnections = (
  allConnections: readonly Connection.Connection[],
  connectorIds: readonly string[],
): Connection.Connection[] =>
  allConnections.filter(
    (connection) => connection.connectorId !== undefined && connectorIds.includes(connection.connectorId),
  );

export type ActionsOptions = {
  /** Stable ids of the {@link ConnectorSpec.ConnectorEntry} entries the menu offers: existing connections from any
   * of them are offered for reuse, and each (with an auth flow) gets a "Connect X" entry. */
  connectorIds: readonly string[];
  db: Database.Database;
  spaceId: Key.SpaceId;
  /** Existing local object (e.g. an empty Mailbox) to wire up as the new connection's first sync
   * target, forwarded to the connector's `onTokenCreated` and the reuse binding. */
  existingTarget?: Ref.Ref<Obj.Unknown>;
  allConnectors: readonly ConnectorSpec.ConnectorEntry[];
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
export const actions = ({
  connectorIds,
  db,
  spaceId,
  existingTarget,
  allConnectors,
  allConnections,
}: ActionsOptions): AppGraphNode.NodeArg<typeof AppGraphNode.actionGroupSymbol>[] => {
  const offered = offeredConnectors(allConnectors, connectorIds);
  // Reuse binds the object as a new sync target, so only offer it when there is a target to bind.
  const connections = existingTarget ? reusableConnections(allConnections, connectorIds) : [];
  if (offered.length === 0 && connections.length === 0) {
    return [];
  }

  const connectAction = (connector: ConnectorSpec.ConnectorEntry) =>
    AppNode.makeToolbarAction({
      id: `connect-${connector.id}`,
      // The graph action label schema has no interpolation slots (unlike `t()`), so use a plain string.
      label: `Connect ${connector.label ?? connector.id}`,
      icon: CONNECT_ICON,
      testId: `connectorPlugin.connect.${connector.id}`,
      data: () =>
        Effect.gen(function* () {
          const coordinator = yield* Capability.get(ConnectorCoordination.ConnectorCoordinator);
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
          yield* Binding.bind({
            connection,
            connector: allConnectors.find((entry) => entry.id === connection.connectorId),
            target: existingTarget,
          }).pipe(
            // Reuse is a deliberate click, so a refusal has to say so — unlike the silent automatic
            // bind. The graph extension filters contradicting connections out of this menu, but the
            // standalone `ConnectorAuthMenu` offers them, and there the failure was invisible.
            Effect.catchTag('TargetAccountMismatchError', (error) =>
              Effect.gen(function* () {
                log.warn('refusing to reuse: target syncs another account', { context: error.context });
                yield* Binding.reportAccountMismatch;
              }),
            ),
          );
        }).pipe(Effect.provide(Database.layer(db))),
    });

  return [
    AppNode.makeToolbarActionGroup({
      id: GROUP_ID,
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

/** Id of the dropdown group {@link actions} produces; the menu reads its children. */
export const GROUP_ID = 'connectorAuth';

/**
 * The Connect group as a disabled trigger with nothing inside it, for a bindable object that has
 * nothing to offer — no provider plugin registered for its type, or every existing connection belongs
 * to another account. Dropping the control instead reads as "this kind of object cannot be connected",
 * which is wrong; a disabled Connect says the capability exists and is currently unavailable. Pairs
 * with {@link actions}, which returns `[]` in exactly that case.
 */
export const unavailableActions = (): AppGraphNode.NodeArg<typeof AppGraphNode.actionGroupSymbol>[] => [
  AppNode.makeToolbarActionGroup({
    id: GROUP_ID,
    label: ['connect.label', { ns: meta.profile.key }],
    icon: CONNECT_ICON,
    iconOnly: false,
    disabled: true,
    testId: 'connectorPlugin.connect',
    actions: [],
  }),
];

/** Label for a connection's connector, falling back to the connection id when unregistered. */
const connectorLabel = (
  allConnectors: readonly ConnectorSpec.ConnectorEntry[],
  connection: Connection.Connection,
): string =>
  allConnectors.find((connector) => connector.id === connection.connectorId)?.label ??
  connection.connectorId ??
  connection.id;
