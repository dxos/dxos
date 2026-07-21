//
// Copyright 2026 DXOS.org
//

import { RegistryContext } from '@effect-atom/atom-react';
import React, { useContext, useMemo } from 'react';

import { useCapabilities } from '@dxos/app-framework/ui';
import { type Database, Filter, type Obj, type Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { Connection, Connector, CONNECTOR_AUTH_GROUP_ID, connectorAuthActions } from '@dxos/plugin-connector';
import { Graph, useActionRunner } from '@dxos/plugin-graph';
import { IconButton, useTranslation } from '@dxos/react-ui';
import { Menu, useGraphMenuActions } from '@dxos/react-ui-menu';

import { meta } from '#meta';

/** Root node the connector-auth group hangs off in the component's local graph. */
const NODE_ID = 'connector-auth-root';

export type ConnectorAuthMenuProps = {
  /** Stable ids of the {@link Connector} entries this menu offers: existing connections from any of
   * them are offered for reuse, and each (with an auth flow) gets a "Connect X" entry. */
  connectorIds: readonly string[];
  /** Omitted when there is no active database yet (e.g. no space selected) — nothing is offered. */
  db: Database.Database | undefined;
  /** Existing local object to wire up as the new connection's first sync target. */
  existingTarget?: Ref.Ref<Obj.Unknown>;
};

/**
 * Standalone connector-auth menu: a trigger button that opens a dropdown of the same
 * {@link connectorAuthActions} owning plugins contribute to object toolbars. Existing
 * {@link Connection}s are offered for reuse (bind inline) alongside a "Connect X" entry per connector
 * with an auth flow. Renders nothing when there is nothing to offer.
 */
export const ConnectorAuthMenu = ({ connectorIds, db, existingTarget }: ConnectorAuthMenuProps) => {
  const { t } = useTranslation(meta.profile.key);
  const registry = useContext(RegistryContext);
  const runAction = useActionRunner();
  const allConnectors = useCapabilities(Connector).flat();
  const allConnections = useQuery(db, Filter.type(Connection.Connection));

  const graph = useMemo(() => {
    if (!db) {
      return undefined;
    }
    const actions = connectorAuthActions({
      connectorIds,
      db,
      spaceId: db.spaceId,
      existingTarget,
      allConnectors,
      allConnections,
    });
    if (actions.length === 0) {
      return undefined;
    }
    const nextGraph = Graph.make({ registry });
    nextGraph.pipe(Graph.addNodes([{ id: NODE_ID, type: NODE_ID, data: null, properties: {}, actions }]));
    return nextGraph;
  }, [registry, connectorIds, db, existingTarget, allConnectors, allConnections]);

  // Read the group's children (reuse / connect entries) as the menu content.
  const menuActions = useGraphMenuActions(graph, CONNECTOR_AUTH_GROUP_ID);

  if (!graph) {
    return null;
  }

  return (
    <Menu.Root {...menuActions} onAction={runAction} attendableId={NODE_ID} alwaysActive>
      <Menu.Trigger asChild>
        <IconButton variant='ghost' icon='ph--plugs--regular' label={t('connect.label')} />
      </Menu.Trigger>
      <Menu.Content />
    </Menu.Root>
  );
};

ConnectorAuthMenu.displayName = 'ConnectorAuthMenu';
