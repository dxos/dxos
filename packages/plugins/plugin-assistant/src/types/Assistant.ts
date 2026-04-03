//
// Copyright 2024 DXOS.org
//

import { Chat as ChatModule } from '@dxos/assistant-toolkit';

import { AssistantSettingsSchema, type AssistantSettingsProps } from './Settings';

// Re-export Chat schema for backward compatibility.
export const Chat = ChatModule.Chat;
export type Chat = ChatModule.Chat;

/**
 * Plugin settings.
 */
export const Settings = AssistantSettingsSchema;

export type Settings = AssistantSettingsProps;
