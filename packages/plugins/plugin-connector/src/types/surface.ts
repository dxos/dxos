//
// Copyright 2026 DXOS.org
//

import { Surface } from '@dxos/app-framework/ui';
import { type Obj, type Ref } from '@dxos/echo';

/**
 * Role token for the connector-auth surface (connector auth button).
 *
 * Pass either a single `connectorId` (legacy/simple consumers) or a list of `connectorIds`. The
 * button lists existing connections from any of the given connectors for reuse, and offers a "Connect
 * X" entry per connector for creating a new connection.
 */
export const ConnectorAuth: Surface.RoleToken<{
  connectorId?: string;
  connectorIds?: readonly string[];
  existingTarget?: Ref.Ref<Obj.Unknown>;
}> = Surface.makeType('org.dxos.plugin.connector.role.auth');
