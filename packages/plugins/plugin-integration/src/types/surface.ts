//
// Copyright 2025 DXOS.org
//

import { Surface } from '@dxos/app-framework/ui';
import { type Obj, type Ref } from '@dxos/echo';

/** Role token for the integration-auth surface (provider auth button). */
export const IntegrationAuth: Surface.RoleToken<{ providerId: string; existingTarget?: Ref.Ref<Obj.Unknown> }> =
  Surface.makeType('org.dxos.plugin.integration.role.auth');
