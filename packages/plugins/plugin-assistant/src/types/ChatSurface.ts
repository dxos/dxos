//
// Copyright 2026 DXOS.org
//

import { Surface } from '@dxos/app-framework/ui';

/**
 * Role token for surfaces an agent requests inline in the conversation via the `<surface>` content
 * block. `role` selects the concrete surface to render (e.g. `integration-prompt`); `data` carries
 * its payload (e.g. `{ service: 'gmail.com' }`). Plugins contribute renderers by filtering on the
 * inner `role`, which keeps the chat renderer decoupled from the specific surfaces it can host.
 */
export const ChatSurface: Surface.RoleToken<{
  role: string;
  data?: Record<string, unknown>;
}> = Surface.makeType('org.dxos.plugin.assistant.role.chatSurface');
