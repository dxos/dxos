//
// Copyright 2026 DXOS.org
//

import * as Role from '@dxos/app-framework/Role';
import type { Connection } from '@dxos/link';

import { ConnectorNamespace } from '../namespace.ts';

/**
 * A connector's own section on its connection's page, below the generic settings: what only that connector offers
 * (e.g. Discord's servers to index). A contributor filters on `connection.connectorId`.
 */
export const ConnectionSection = Role.make<{ readonly connection: Connection.Connection }>(
  `${ConnectorNamespace.key}.surface.connectionSection`,
);
