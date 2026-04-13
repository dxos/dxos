//
// Copyright 2024 DXOS.org
//

import { Chat as ChatModule } from '@dxos/assistant-toolkit';

// Re-export Chat schema for backward compatibility.
export const Chat = ChatModule.Chat;
export type Chat = ChatModule.Chat;

// Re-export Settings as merged const/type (not as namespace).
import * as SettingsModule from './Settings';
export const Settings = SettingsModule.Settings;
export type Settings = SettingsModule.Settings;
