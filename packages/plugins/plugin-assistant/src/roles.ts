//
// Copyright 2025 DXOS.org
//

import { Surface } from '@dxos/app-framework/ui';
import { type Obj } from '@dxos/echo';

/** Role token for the prompts (routine list) side panel surface. */
export const Prompts: Surface.RoleToken<{ subject: Obj.Any; attendableId: string }> = Surface.makeType(
  'org.dxos.plugin.assistant.role.prompts',
);
