//
// Copyright 2026 DXOS.org
//

import * as Role from '@dxos/app-framework/Role';
import type * as Chat from '@dxos/assistant/Chat';

/**
 * Role token for surfaces an agent requests inline in the conversation via the `<surface>` content
 * block. `role` selects the concrete surface to render (e.g. `integration-prompt`); `data` carries
 * its payload (e.g. `{ service: 'gmail.com' }`). Plugins contribute renderers by filtering on the
 * inner `role`, which keeps the chat renderer decoupled from the specific surfaces it can host.
 */
export const ChatSurface: Role.Role<{
  role: string;
  data?: Record<string, unknown>;
}> = Role.make('org.dxos.plugin.assistant.role.chatSurface');

/**
 * Role token for sections of the details tray above a chat's prompt. The tray holds the chat's context
 * and tasks; a plugin adds a section (the changes an agent made, its worktree) by contributing a surface
 * on this role that renders a `ChatDetailsSection`.
 */
export const ChatDetails: Role.Role<{ chat: Chat.Chat }> = Role.make('org.dxos.plugin.assistant.role.chatDetails');
