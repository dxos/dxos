//
// Copyright 2026 DXOS.org
//

import { Role } from '@dxos/app-framework';
import { type Obj, type Ref } from '@dxos/echo';

/**
 * Role token for the connector-auth surface (connector auth button).
 *
 * The button lists existing connections from any of the given `connectorIds` for reuse, and offers a
 * "Connect X" entry per connector for creating a new connection. A single-element list renders a
 * plain connect button (no dropdown) when there is nothing to reuse.
 */
export const ConnectorAuth: Role.Role<{
  connectorIds: readonly string[];
  existingTarget?: Ref.Ref<Obj.Unknown>;
}> = Role.make('org.dxos.plugin.connector.role.auth');
