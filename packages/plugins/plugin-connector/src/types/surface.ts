//
// Copyright 2026 DXOS.org
//

import { Surface } from '@dxos/app-framework/ui';
import { type Obj, type Ref } from '@dxos/echo';

/** Role token for the connector-auth surface (connector auth button). */
export const ConnectorAuth: Surface.RoleToken<{ connectorId: string; existingTarget?: Ref.Ref<Obj.Unknown> }> =
  Surface.makeType('org.dxos.plugin.connector.role.auth');
