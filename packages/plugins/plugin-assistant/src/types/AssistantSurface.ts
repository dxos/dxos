//
// Copyright 2026 DXOS.org
//

import * as Role from '@dxos/app-framework/Role';
import { type AiContext } from '@dxos/assistant';
import type * as Chat from '@dxos/assistant/Chat';
import { type Database } from '@dxos/echo';
import { type ThreadCardProps } from '@dxos/react-ui-assistant';

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
 * Role token for the sections of a chat's context drawer, above the prompt. Every contribution is shown:
 * plugin-assistant contributes the chat's context (objects and skills), and a plugin adds its own (a
 * coding plugin's diff, its worktree) by contributing a surface on this role.
 */
export const ChatDetails: Role.Role<{
  chat: Chat.Chat;
  /** The chat's space, which a chat not yet stored has no database for. */
  db?: Database.Database;
  context?: AiContext.Binder;
}> = Role.make('org.dxos.plugin.assistant.role.chatDetails');

/**
 * Role token for a lane of a chat shown as a card. Lanes are derived from the feed rather than stored, so this carries
 * the lane itself and not an object; a plugin replaces the card by contributing a surface on this role.
 */
export const ThreadCard: Role.Role<ThreadCardProps> = Role.make('org.dxos.plugin.assistant.role.threadCard');
